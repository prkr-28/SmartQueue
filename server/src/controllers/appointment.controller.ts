import { Request, Response, NextFunction } from 'express';
import { AppointmentService } from '../services/appointment.service.js';
import { Appointment } from '../models/Appointment.js';
import { AppError } from '../middlewares/errorHandler.js';

export class AppointmentController {
  static async bookAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { doctorId, date, startTime, visitType, symptoms, dependentId, notes } = req.body;
      const patientId = req.user!.role === 'patient' ? req.user!.id : req.body.patientId;

      if (!patientId) {
        throw new AppError('Patient ID is required', 400);
      }

      const appointment = await AppointmentService.bookAppointment({
        patientId,
        doctorId,
        date,
        startTime,
        visitType,
        symptoms,
        dependentId,
        notes,
        isWalkIn: req.user!.role === 'receptionist',
        actorId: req.user!.id,
        ipAddress: req.ip,
      });

      res.status(201).json({
        success: true,
        message: 'Appointment booked successfully',
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, date, doctorId, patientId, page = 1, limit = 20 } = req.query;
      const filter: Record<string, any> = {};

      if (req.user!.role === 'patient') {
        filter.patientId = req.user!.id;
      } else if (patientId) {
        filter.patientId = patientId;
      }

      if (doctorId) filter.doctorId = doctorId;
      if (status) filter.status = status;
      if (date) filter.date = date;

      const skip = (Number(page) - 1) * Number(limit);

      const [appointments, total] = await Promise.all([
        Appointment.find(filter)
          .populate('hospitalId', 'name address phone')
          .populate('departmentId', 'name code')
          .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name email phone avatarUrl' } })
          .populate('patientId', 'name email phone')
          .populate('dependentId')
          .sort({ date: -1, startTime: -1 })
          .skip(skip)
          .limit(Number(limit)),
        Appointment.countDocuments(filter),
      ]);

      res.status(200).json({
        success: true,
        data: {
          items: appointments,
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAppointmentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const appointment = await Appointment.findById(req.params.id)
        .populate('hospitalId')
        .populate('departmentId')
        .populate({ path: 'doctorId', populate: { path: 'userId' } })
        .populate('patientId')
        .populate('dependentId');

      if (!appointment) throw new AppError('Appointment not found', 404);

      if (req.user!.role === 'patient' && (appointment.patientId as any)._id.toString() !== req.user!.id) {
        throw new AppError('Access denied', 403);
      }

      res.status(200).json({ success: true, data: appointment });
    } catch (error) {
      next(error);
    }
  }

  static async cancelAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reason } = req.body;
      const updated = await AppointmentService.cancelAppointment({
        appointmentId: req.params.id,
        userId: req.user!.id,
        userRole: req.user!.role,
        reason,
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'Appointment cancelled successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async rescheduleAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { newDate, newStartTime } = req.body;
      const updated = await AppointmentService.rescheduleAppointment({
        appointmentId: req.params.id,
        userId: req.user!.id,
        userRole: req.user!.role,
        newDate,
        newStartTime,
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'Appointment rescheduled successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async downloadSlip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pdfBuffer = await AppointmentService.generateAppointmentSlip(req.params.id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="smartqueue-appointment-${req.params.id}.pdf"`
      );
      res.status(200).send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }
}
