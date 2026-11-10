import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Consultation } from '../models/Consultation.js';
import { Appointment } from '../models/Appointment.js';
import { QueueEntry } from '../models/QueueEntry.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { Hospital } from '../models/Hospital.js';
import { User } from '../models/User.js';
import { Invoice } from '../models/Invoice.js';
import { AppError } from '../middlewares/errorHandler.js';
import { socketService } from '../services/socket.service.js';
import { AuditService } from '../services/audit.service.js';
import { PrescriptionPdfService } from '../services/prescription-pdf.service.js';
import { QueueService } from '../services/queue.service.js';

export class ConsultationController {
  static async createConsultation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        appointmentId,
        vitals,
        symptoms,
        diagnosis,
        notes,
        prescriptionItems,
        followUpDate,
        labTests,
      } = req.body;

      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        throw new AppError('Appointment not found', 404);
      }

      // Verify that the doctor submitting this is assigned to the appointment or admin
      const doctorProfile = await DoctorProfile.findById(appointment.doctorId);
      if (!doctorProfile) {
        throw new AppError('Doctor profile not found', 404);
      }

      if (req.user!.role === 'doctor') {
        const userDocProfile = await DoctorProfile.findOne({ userId: req.user!.id });
        if (!userDocProfile || userDocProfile._id.toString() !== appointment.doctorId.toString()) {
          throw new AppError('Unauthorized: You can only record consultations for your own patients', 403);
        }
      }

      // Create consultation record (or update if already exists)
      let consultation = await Consultation.findOne({ appointmentId: appointment._id });
      if (consultation) {
        consultation.vitals = vitals || consultation.vitals;
        consultation.symptoms = symptoms || consultation.symptoms;
        consultation.diagnosis = diagnosis || consultation.diagnosis;
        consultation.notes = notes !== undefined ? notes : consultation.notes;
        consultation.prescriptionItems = prescriptionItems || consultation.prescriptionItems;
        consultation.followUpDate = followUpDate ? new Date(followUpDate) : consultation.followUpDate;
        consultation.labTests = labTests || consultation.labTests;
        await consultation.save();
      } else {
        consultation = await Consultation.create({
          appointmentId: appointment._id,
          doctorId: appointment.doctorId,
          patientId: appointment.patientId,
          vitals,
          symptoms: symptoms || [],
          diagnosis,
          notes,
          prescriptionItems: prescriptionItems || [],
          followUpDate: followUpDate ? new Date(followUpDate) : undefined,
          labTests: labTests || [],
        });
      }

      // Mark appointment as completed
      const now = new Date();
      appointment.status = 'completed';
      await appointment.save();

      // Mark queue entry as completed if present
      const queueEntry = await QueueEntry.findOne({ appointmentId: appointment._id });
      if (queueEntry) {
        queueEntry.status = 'completed';
        queueEntry.endTime = now;
        if (!queueEntry.startTime) {
          queueEntry.startTime = now;
        }
        await queueEntry.save();

        // Update doctor rolling avg consultation time
        if (queueEntry.startTime) {
          const durationMinutes = Math.max(
            5,
            Math.round((queueEntry.endTime.getTime() - queueEntry.startTime.getTime()) / 60000)
          );
          doctorProfile.avgConsultationMinutes = Math.round(
            (doctorProfile.avgConsultationMinutes * 0.8) + (durationMinutes * 0.2)
          );
          await doctorProfile.save();
        }
      }

      // Ensure an invoice exists for this appointment
      let invoice = await Invoice.findOne({ appointmentId: appointment._id });
      if (!invoice) {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(1000 + Math.random() * 9000);
        invoice = await Invoice.create({
          invoiceNumber: `INV-${timestamp}-${random}`,
          appointmentId: appointment._id,
          patientId: appointment.patientId,
          hospitalId: appointment.hospitalId,
          doctorId: appointment.doctorId,
          consultationFee: appointment.consultationFee || doctorProfile.consultationFee,
          taxAmount: 0,
          totalAmount: appointment.consultationFee || doctorProfile.consultationFee,
          paymentStatus: appointment.paymentStatus || 'pending',
          paymentMode: 'cash',
        });
      }

      // Emit real-time queue updates
      const doctorQueue = await QueueService.getDoctorQueue(appointment.doctorId.toString(), appointment.date);
      socketService.emitQueueUpdate(appointment.doctorId.toString(), {
        doctorId: appointment.doctorId.toString(),
        hospitalId: appointment.hospitalId.toString(),
        date: appointment.date,
        activeEntries: doctorQueue.activeEntries as any,
        nowServing: doctorQueue.nowServing as any,
      });

      const displayData = await QueueService.getHospitalDisplayData(appointment.hospitalId.toString());
      socketService.emitDisplayUpdate(appointment.hospitalId.toString(), displayData as any);

      socketService.emitAppointmentUpdate(appointment.patientId.toString(), {
        appointmentId: appointment._id.toString(),
        status: 'completed',
      });

      // Audit Log
      await AuditService.log({
        actorId: req.user!.id,
        action: 'CONSULTATION_COMPLETED',
        entity: 'Consultation',
        entityId: consultation._id.toString(),
        details: { appointmentId: appointment._id, diagnosis },
        ipAddress: req.ip,
      });

      res.status(201).json({
        success: true,
        message: 'Consultation recorded and appointment completed successfully',
        data: consultation,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getByAppointmentId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { appointmentId } = req.params;
      const consultation = await Consultation.findOne({ appointmentId })
        .populate('doctorId')
        .populate('patientId', 'name email phone');

      if (!consultation) {
        res.status(200).json({ success: true, data: null });
        return;
      }

      // IDOR check: if patient, ensure it belongs to them
      if (req.user!.role === 'patient' && consultation.patientId._id.toString() !== req.user!.id) {
        throw new AppError('Unauthorized access to clinical record', 403);
      }

      res.status(200).json({ success: true, data: consultation });
    } catch (error) {
      next(error);
    }
  }

  static async getPatientHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let patientId = req.params.patientId;
      if (req.user!.role === 'patient') {
        patientId = req.user!.id;
      }

      const consultations = await Consultation.find({ patientId })
        .populate({
          path: 'doctorId',
          populate: { path: 'userId', select: 'name email' },
        })
        .populate('appointmentId')
        .sort({ createdAt: -1 });

      res.status(200).json({ success: true, data: consultations });
    } catch (error) {
      next(error);
    }
  }

  static async downloadPrescriptionPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      let consultation: any = null;

      if (mongoose.Types.ObjectId.isValid(id)) {
        consultation = await Consultation.findById(id);
      }
      if (!consultation) {
        consultation = await Consultation.findOne({ appointmentId: id });
      }
      if (!consultation) {
        throw new AppError('Consultation record not found', 404);
      }

      // Authorization / IDOR Protection
      if (req.user!.role === 'patient' && consultation.patientId.toString() !== req.user!.id) {
        throw new AppError('Unauthorized access to prescription document', 403);
      }

      const appointment = await Appointment.findById(consultation.appointmentId);
      if (!appointment) {
        throw new AppError('Appointment not found', 404);
      }

      const doctor = await DoctorProfile.findById(consultation.doctorId);
      if (!doctor) {
        throw new AppError('Doctor not found', 404);
      }

      const doctorUser = await User.findById(doctor.userId);
      const hospital = await Hospital.findById(doctor.hospitalId);
      const patient = await User.findById(consultation.patientId);

      if (!doctorUser || !hospital || !patient) {
        throw new AppError('Associated clinical entities missing', 404);
      }

      const pdfBuffer = await PrescriptionPdfService.generate({
        consultation,
        appointment,
        doctor,
        doctorUser,
        hospital,
        patient,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="prescription-${appointment.appointmentNumber}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }
}
