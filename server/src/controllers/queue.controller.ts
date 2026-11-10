import { Request, Response, NextFunction } from 'express';
import { QueueService } from '../services/queue.service.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { AppError } from '../middlewares/errorHandler.js';

export class QueueController {
  static async checkIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { appointmentId, priority } = req.body;
      const entry = await QueueService.checkIn({
        appointmentId,
        priority,
        actorId: req.user!.id,
        ipAddress: req.ip,
      });
      res.status(200).json({ success: true, message: 'Checked in successfully', data: entry });
    } catch (error) {
      next(error);
    }
  }

  static async callNext(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let doctorId = req.params.doctorId;
      if (req.user!.role === 'doctor') {
        const doc = await DoctorProfile.findOne({ userId: req.user!.id });
        if (doc) doctorId = doc._id.toString();
      }

      const nextEntry = await QueueService.callNext({
        doctorId,
        actorId: req.user!.id,
        ipAddress: req.ip,
      });

      if (!nextEntry) {
        res.status(200).json({ success: true, message: 'No more waiting patients in queue', data: null });
        return;
      }

      res.status(200).json({ success: true, message: 'Next patient called', data: nextEntry });
    } catch (error) {
      next(error);
    }
  }

  static async startConsultation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let doctorId = req.body.doctorId;
      if (req.user!.role === 'doctor') {
        const doc = await DoctorProfile.findOne({ userId: req.user!.id });
        if (doc) doctorId = doc._id.toString();
      }

      const entry = await QueueService.startConsultation({
        queueEntryId: req.params.id,
        doctorId,
        actorId: req.user!.id,
        ipAddress: req.ip,
      });
      res.status(200).json({ success: true, message: 'Consultation started', data: entry });
    } catch (error) {
      next(error);
    }
  }

  static async completeConsultation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let doctorId = req.body.doctorId;
      if (req.user!.role === 'doctor') {
        const doc = await DoctorProfile.findOne({ userId: req.user!.id });
        if (doc) doctorId = doc._id.toString();
      }

      const entry = await QueueService.completeConsultation({
        queueEntryId: req.params.id,
        doctorId,
        actorId: req.user!.id,
        ipAddress: req.ip,
      });
      res.status(200).json({ success: true, message: 'Consultation completed', data: entry });
    } catch (error) {
      next(error);
    }
  }

  static async skipPatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let doctorId = req.body.doctorId;
      if (req.user!.role === 'doctor') {
        const doc = await DoctorProfile.findOne({ userId: req.user!.id });
        if (doc) doctorId = doc._id.toString();
      }

      const entry = await QueueService.skipPatient({
        queueEntryId: req.params.id,
        doctorId,
        actorId: req.user!.id,
        reason: req.body.reason,
        ipAddress: req.ip,
      });
      res.status(200).json({ success: true, message: 'Patient skipped', data: entry });
    } catch (error) {
      next(error);
    }
  }

  static async recallPatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let doctorId = req.body.doctorId;
      if (req.user!.role === 'doctor') {
        const doc = await DoctorProfile.findOne({ userId: req.user!.id });
        if (doc) doctorId = doc._id.toString();
      }

      const entry = await QueueService.recallPatient({
        queueEntryId: req.params.id,
        doctorId,
        actorId: req.user!.id,
        ipAddress: req.ip,
      });
      res.status(200).json({ success: true, message: 'Patient recalled', data: entry });
    } catch (error) {
      next(error);
    }
  }

  static async markNoShow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let doctorId = req.body.doctorId;
      if (req.user!.role === 'doctor') {
        const doc = await DoctorProfile.findOne({ userId: req.user!.id });
        if (doc) doctorId = doc._id.toString();
      }

      const entry = await QueueService.markNoShow({
        queueEntryId: req.params.id,
        doctorId,
        actorId: req.user!.id,
        ipAddress: req.ip,
      });
      res.status(200).json({ success: true, message: 'Patient marked as no-show', data: entry });
    } catch (error) {
      next(error);
    }
  }

  static async reassign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const entry = await QueueService.reassignDoctor({
        queueEntryId: req.params.id,
        newDoctorId: req.body.newDoctorId,
        actorId: req.user!.id,
        reason: req.body.reason,
        ipAddress: req.ip,
      });
      res.status(200).json({ success: true, message: 'Patient reassigned', data: entry });
    } catch (error) {
      next(error);
    }
  }

  static async emergencyInsert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const entry = await QueueService.emergencyInsert({
        doctorId: req.body.doctorId,
        patientId: req.body.patientId,
        symptoms: req.body.symptoms,
        actorId: req.user!.id,
        ipAddress: req.ip,
      });
      res.status(201).json({ success: true, message: 'Emergency inserted with top priority', data: entry });
    } catch (error) {
      next(error);
    }
  }

  static async getDoctorQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let doctorId = req.params.doctorId;
      if (req.user!.role === 'doctor' && !doctorId) {
        const doc = await DoctorProfile.findOne({ userId: req.user!.id });
        if (doc) doctorId = doc._id.toString();
      }

      const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
      const queueData = await QueueService.getDoctorQueue(doctorId, date);
      res.status(200).json({ success: true, data: queueData });
    } catch (error) {
      next(error);
    }
  }

  static async getPatientLiveQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const liveData = await QueueService.getPatientLiveQueue(req.user!.id);
      res.status(200).json({ success: true, data: liveData });
    } catch (error) {
      next(error);
    }
  }

  static async getDisplayData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const displayData = await QueueService.getHospitalDisplayData(req.params.hospitalId);
      res.status(200).json({ success: true, data: displayData });
    } catch (error) {
      next(error);
    }
  }
}
