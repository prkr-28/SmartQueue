import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { Appointment, IAppointment } from '../models/Appointment.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { Hospital } from '../models/Hospital.js';
import { Department } from '../models/Department.js';
import { User } from '../models/User.js';
import { Dependent } from '../models/Dependent.js';
import { AppError } from '../middlewares/errorHandler.js';
import { emailService } from './email.service.js';
import { NotificationService } from './notification.service.js';
import { socketService } from './socket.service.js';
import { AuditService } from './audit.service.js';
import { AppointmentStatus, VisitType, PaymentStatus } from '@smartqueue/shared';

export class AppointmentService {
  /**
   * Generates a unique appointment number: e.g. APT-260312-8921
   */
  private static generateAppointmentNumber(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `APT-${timestamp}-${random}`;
  }

  /**
   * Book an appointment.
   * Race conditions are protected by the unique compound index on { doctorId, date, startTime } for active appointments.
   */
  static async bookAppointment(params: {
    patientId: string;
    doctorId: string;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:mm
    visitType?: VisitType;
    symptoms?: string;
    dependentId?: string;
    notes?: string;
    isWalkIn?: boolean;
    actorId?: string;
    ipAddress?: string;
  }): Promise<IAppointment> {
    const doctor = await DoctorProfile.findById(params.doctorId).populate('userId');
    if (!doctor || !doctor.isActive) {
      throw new AppError('Doctor not found or inactive', 404);
    }

    const hospital = await Hospital.findById(doctor.hospitalId);
    if (!hospital || !hospital.isActive) {
      throw new AppError('Hospital not found or inactive', 404);
    }

    const patient = await User.findById(params.patientId);
    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    // If dependent is specified, verify ownership
    if (params.dependentId) {
      const dep = await Dependent.findOne({ _id: params.dependentId, patientId: params.patientId });
      if (!dep) {
        throw new AppError('Dependent family member not found', 404);
      }
    }

    // Compute slot end time
    const [startH, startM] = params.startTime.split(':').map(Number);
    const duration = doctor.avgConsultationMinutes || 15;
    const endMinutes = startH * 60 + startM + duration;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    // Slot UTC time
    const [year, month, day] = params.date.split('-').map(Number);
    const slotTime = new Date(Date.UTC(year, month - 1, day, startH, startM, 0, 0));

    const appointmentNumber = this.generateAppointmentNumber();

    try {
      const appointment = await Appointment.create({
        appointmentNumber,
        hospitalId: doctor.hospitalId,
        departmentId: doctor.departmentId,
        doctorId: doctor._id,
        patientId: patient._id,
        dependentId: params.dependentId,
        date: params.date,
        startTime: params.startTime,
        endTime,
        slotTime,
        status: 'booked',
        visitType: params.visitType || 'new',
        symptoms: params.symptoms,
        notes: params.notes,
        paymentStatus: 'pending',
        consultationFee: doctor.consultationFee || 0,
        isWalkIn: params.isWalkIn || false,
      });

      // Notify Patient
      await NotificationService.create({
        userId: patient._id,
        title: 'Appointment Booked',
        message: `Your appointment (#${appointmentNumber}) has been scheduled with Dr. ${(doctor.userId as any)?.name || 'Doctor'} on ${params.date} at ${params.startTime}.`,
        type: 'appointment',
        data: { appointmentId: appointment._id },
      });

      // Send Confirmation Email
      await emailService.sendAppointmentConfirmation(patient.email, {
        patientName: patient.name,
        doctorName: `Dr. ${(doctor.userId as any)?.name || 'Doctor'}`,
        specialization: doctor.specialization,
        date: params.date,
        time: `${params.startTime} - ${endTime}`,
        appointmentNumber,
        hospitalName: hospital.name,
      });

      // Audit Log
      await AuditService.log({
        actorId: params.actorId || patient._id,
        action: 'APPOINTMENT_BOOKED',
        entity: 'Appointment',
        entityId: appointment._id.toString(),
        details: { appointmentNumber, doctorId: doctor._id, date: params.date, startTime: params.startTime },
        ipAddress: params.ipAddress,
      });

      return appointment;
    } catch (err: any) {
      if (err.code === 11000) {
        throw new AppError(
          'This slot was just taken by another patient. Please select a different time.',
          409
        );
      }
      throw err;
    }
  }

  /**
   * Cancel an appointment
   */
  static async cancelAppointment(params: {
    appointmentId: string;
    userId: string;
    userRole: string;
    reason?: string;
    ipAddress?: string;
  }): Promise<IAppointment> {
    const appointment = await Appointment.findById(params.appointmentId)
      .populate('hospitalId')
      .populate({ path: 'doctorId', populate: { path: 'userId' } })
      .populate('patientId');

    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    if (appointment.status === 'cancelled') {
      throw new AppError('Appointment is already cancelled', 400);
    }

    if (appointment.status === 'completed') {
      throw new AppError('Cannot cancel a completed appointment', 400);
    }

    // Role check: patient can only cancel their own appointment
    if (params.userRole === 'patient' && appointment.patientId._id.toString() !== params.userId) {
      throw new AppError('Unauthorized to cancel this appointment', 403);
    }

    // Cancellation window check (for patients)
    const hospital = appointment.hospitalId as any;
    const windowHours = hospital?.settings?.cancellationWindowHours || 2;
    const now = new Date();
    const diffHours = (appointment.slotTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (params.userRole === 'patient' && diffHours < windowHours) {
      throw new AppError(
        `Appointments cannot be cancelled within ${windowHours} hours of the scheduled time.`,
        400
      );
    }

    appointment.status = 'cancelled';
    appointment.cancelledAt = new Date();
    appointment.cancellationReason = params.reason || 'Cancelled by user';
    await appointment.save();

    // Notify patient
    const patient = appointment.patientId as any;
    const doctorUser = (appointment.doctorId as any)?.userId;
    await NotificationService.create({
      userId: patient._id,
      title: 'Appointment Cancelled',
      message: `Your appointment #${appointment.appointmentNumber} has been cancelled.`,
      type: 'appointment',
      data: { appointmentId: appointment._id },
    });

    await emailService.sendCancellationNotice(patient.email, {
      patientName: patient.name,
      appointmentNumber: appointment.appointmentNumber,
      doctorName: `Dr. ${doctorUser?.name || 'Doctor'}`,
      date: appointment.date,
      reason: appointment.cancellationReason,
    });

    // Notify via socket
    socketService.emitAppointmentUpdate(patient._id.toString(), {
      appointmentId: appointment._id.toString(),
      status: 'cancelled',
    });

    // Audit Log
    await AuditService.log({
      actorId: params.userId,
      action: 'APPOINTMENT_CANCELLED',
      entity: 'Appointment',
      entityId: appointment._id.toString(),
      details: { reason: appointment.cancellationReason },
      ipAddress: params.ipAddress,
    });

    return appointment;
  }

  /**
   * Reschedule an appointment
   */
  static async rescheduleAppointment(params: {
    appointmentId: string;
    userId: string;
    userRole: string;
    newDate: string;
    newStartTime: string;
    ipAddress?: string;
  }): Promise<IAppointment> {
    const existing = await Appointment.findById(params.appointmentId);
    if (!existing) {
      throw new AppError('Appointment not found', 404);
    }

    if (existing.status === 'cancelled' || existing.status === 'completed') {
      throw new AppError(`Cannot reschedule an appointment with status '${existing.status}'`, 400);
    }

    if (params.userRole === 'patient' && existing.patientId.toString() !== params.userId) {
      throw new AppError('Unauthorized to reschedule this appointment', 403);
    }

    // Cancel old appointment
    await this.cancelAppointment({
      appointmentId: params.appointmentId,
      userId: params.userId,
      userRole: params.userRole,
      reason: 'Rescheduled to new time slot',
      ipAddress: params.ipAddress,
    });

    // Book new appointment
    const newAppointment = await this.bookAppointment({
      patientId: existing.patientId.toString(),
      doctorId: existing.doctorId.toString(),
      date: params.newDate,
      startTime: params.newStartTime,
      visitType: existing.visitType,
      symptoms: existing.symptoms,
      dependentId: existing.dependentId?.toString(),
      notes: existing.notes,
      actorId: params.userId,
      ipAddress: params.ipAddress,
    });

    return newAppointment;
  }

  /**
   * Generate Appointment Slip PDF with QR Code
   */
  static async generateAppointmentSlip(appointmentId: string): Promise<Buffer> {
    const apt = await Appointment.findById(appointmentId)
      .populate('hospitalId')
      .populate('departmentId')
      .populate({ path: 'doctorId', populate: { path: 'userId' } })
      .populate('patientId')
      .populate('dependentId');

    if (!apt) {
      throw new AppError('Appointment not found', 404);
    }

    const hospital = apt.hospitalId as any;
    const department = apt.departmentId as any;
    const doctor = apt.doctorId as any;
    const doctorUser = doctor?.userId as any;
    const patient = apt.patientId as any;
    const dependent = apt.dependentId as any;

    const qrData = JSON.stringify({
      appointmentNumber: apt.appointmentNumber,
      patientId: patient?._id,
      patientName: dependent?.name || patient?.name,
      doctorId: doctor?._id,
      date: apt.date,
      time: apt.startTime,
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrData, { width: 140, margin: 1 });

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A5', margin: 30 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Header
      doc.fillColor('#0d9488').fontSize(18).text(hospital?.name || 'SmartQueue Medical Center', { align: 'center' });
      doc.fillColor('#64748b').fontSize(9).text(
        `${hospital?.address?.street || ''}, ${hospital?.address?.city || ''} | Tel: ${hospital?.phone || ''}`,
        { align: 'center' }
      );
      doc.moveDown(0.5);
      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).stroke();
      doc.moveDown(1);

      // Title
      doc.fillColor('#0f172a').fontSize(13).text('APPOINTMENT SLIP / CHECK-IN PASS', { align: 'center', underline: true });
      doc.moveDown(1);

      // Main info box
      const startY = doc.y;

      doc.fillColor('#334155').fontSize(10);
      doc.text(`Appointment #: `, 40, startY, { continued: true }).font('Helvetica-Bold').text(apt.appointmentNumber).font('Helvetica');
      doc.text(`Patient Name: `, 40, startY + 18, { continued: true }).font('Helvetica-Bold').text(dependent ? `${dependent.name} (Dependent)` : patient?.name).font('Helvetica');
      doc.text(`Department: `, 40, startY + 36, { continued: true }).text(`${department?.name || 'General'} (${department?.code || 'GEN'})`);
      doc.text(`Doctor: `, 40, startY + 54, { continued: true }).text(`Dr. ${doctorUser?.name || 'Doctor'} - ${doctor?.specialization || ''}`);
      doc.text(`Room: `, 40, startY + 72, { continued: true }).font('Helvetica-Bold').text(doctor?.roomNumber || 'Room 1').font('Helvetica');
      doc.text(`Date: `, 40, startY + 90, { continued: true }).font('Helvetica-Bold').text(apt.date).font('Helvetica');
      doc.text(`Time Slot: `, 40, startY + 108, { continued: true }).font('Helvetica-Bold').text(`${apt.startTime} - ${apt.endTime}`).font('Helvetica');
      doc.text(`Consultation Fee: `, 40, startY + 126, { continued: true }).text(`₹${apt.consultationFee}`);
      doc.text(`Payment Status: `, 40, startY + 144, { continued: true }).text(apt.paymentStatus.toUpperCase());

      // QR Code on right side
      const qrImageBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
      doc.image(qrImageBuffer, doc.page.width - 150, startY, { width: 110 });
      doc.fontSize(7).fillColor('#64748b').text('Scan at kiosk / desk to check-in', doc.page.width - 155, startY + 115, { width: 120, align: 'center' });

      // Instructions footer
      doc.moveDown(5);
      doc.fillColor('#94a3b8').fontSize(8).text(
        'Instructions: Please arrive 15 minutes before your scheduled slot. Present this pass at reception or scan the QR code to join the live waiting queue.',
        40,
        doc.page.height - 60,
        { width: doc.page.width - 80, align: 'center' }
      );

      doc.end();
    });
  }
}
