import { Request, Response, NextFunction } from 'express';
import { DoctorService } from '../services/doctor.service.js';
import { SlotService } from '../services/slot.service.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { Appointment } from '../models/Appointment.js';
import { AppError } from '../middlewares/errorHandler.js';
import { socketService } from '../services/socket.service.js';
import { QueueService } from '../services/queue.service.js';

export class DoctorController {
  static async searchDoctors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { hospitalId, departmentId, search, specialization, maxFee, sortBy } = req.query;
      const doctors = await DoctorService.searchDoctors({
        hospitalId: hospitalId as string,
        departmentId: departmentId as string,
        search: search as string,
        specialization: specialization as string,
        maxFee: maxFee ? Number(maxFee) : undefined,
        sortBy: sortBy as any,
      });
      res.status(200).json({ success: true, data: doctors });
    } catch (error) {
      next(error);
    }
  }

  static async getDoctorById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await DoctorService.getDoctorById(req.params.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doctor = await DoctorProfile.findOne({ userId: req.user!.id })
        .populate('userId', 'name email phone avatarUrl')
        .populate('departmentId', 'name code rooms')
        .populate('hospitalId');

      if (!doctor) {
        throw new AppError('Doctor profile not found for this user', 404);
      }

      const result = await DoctorService.getDoctorById(doctor._id.toString());
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getAvailableSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { date } = req.query;
      const slotsResponse = await SlotService.getDoctorAvailableSlots(id, date as string);
      res.status(200).json({ success: true, data: slotsResponse });
    } catch (error) {
      next(error);
    }
  }

  static async updateSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let doctorId = req.params.id;
      if (req.user!.role === 'doctor') {
        const doc = await DoctorProfile.findOne({ userId: req.user!.id });
        if (doc) doctorId = doc._id.toString();
      }

      const schedule = await DoctorService.updateDoctorSchedule(doctorId, req.body);
      res.status(200).json({ success: true, data: schedule });
    } catch (error) {
      next(error);
    }
  }

  static async togglePause(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let doctorId = req.params.id;
      if (req.user!.role === 'doctor') {
        const doc = await DoctorProfile.findOne({ userId: req.user!.id });
        if (doc) doctorId = doc._id.toString();
      }

      const doctor = await DoctorProfile.findById(doctorId);
      if (!doctor) {
        throw new AppError('Doctor profile not found', 404);
      }

      doctor.isPaused = !doctor.isPaused;
      await doctor.save();

      // Emit display update
      const displayData = await QueueService.getHospitalDisplayData(doctor.hospitalId.toString());
      socketService.emitDisplayUpdate(doctor.hospitalId.toString(), displayData as any);

      res.status(200).json({
        success: true,
        message: `Queue ${doctor.isPaused ? 'paused (on break)' : 'resumed'}`,
        data: { isPaused: doctor.isPaused },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDoctorAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let doctorId = req.params.id;
      if (req.user!.role === 'doctor') {
        const doc = await DoctorProfile.findOne({ userId: req.user!.id });
        if (doc) doctorId = doc._id.toString();
      }

      const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
      const appointments = await Appointment.find({ doctorId, date })
        .populate('patientId', 'name email phone avatarUrl')
        .populate('dependentId')
        .sort({ startTime: 1 });

      res.status(200).json({ success: true, data: appointments });
    } catch (error) {
      next(error);
    }
  }
}
