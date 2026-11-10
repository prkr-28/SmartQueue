import { Request, Response, NextFunction } from 'express';
import { MedicalRecord } from '../models/MedicalRecord.js';
import { storageService } from '../services/storage.service.js';
import { AppError } from '../middlewares/errorHandler.js';
import { AuditService } from '../services/audit.service.js';

export class MedicalRecordController {
  static async uploadRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new AppError('No file provided for upload', 400);
      }

      const { patientId, title, recordType, consultationId, appointmentId } = req.body;
      if (!patientId || !title) {
        throw new AppError('patientId and title are required', 400);
      }

      // Authorization: patient can only upload for themselves; staff can upload for any patient
      if (req.user!.role === 'patient' && req.user!.id !== patientId) {
        throw new AppError('Unauthorized: You can only upload records to your own profile', 403);
      }

      const uploadResult = await storageService.uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      const record = await MedicalRecord.create({
        patientId,
        title,
        recordType: recordType || 'other',
        fileUrl: uploadResult.fileUrl,
        fileKey: uploadResult.fileKey,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedBy: req.user!.id,
        consultationId: consultationId || undefined,
        appointmentId: appointmentId || undefined,
      });

      await AuditService.log({
        actorId: req.user!.id,
        action: 'MEDICAL_RECORD_UPLOADED',
        entity: 'MedicalRecord',
        entityId: record._id.toString(),
        details: { patientId, title, fileKey: uploadResult.fileKey },
        ipAddress: req.ip,
      });

      res.status(201).json({
        success: true,
        message: 'Medical report uploaded successfully',
        data: record,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPatientRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let patientId = req.params.patientId;
      if (req.user!.role === 'patient') {
        patientId = req.user!.id;
      }

      const records = await MedicalRecord.find({ patientId })
        .populate('uploadedBy', 'name email role')
        .sort({ createdAt: -1 });

      res.status(200).json({ success: true, data: records });
    } catch (error) {
      next(error);
    }
  }

  static async deleteRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await MedicalRecord.findById(req.params.id);
      if (!record) {
        throw new AppError('Medical record not found', 404);
      }

      if (req.user!.role === 'patient' && record.patientId.toString() !== req.user!.id) {
        throw new AppError('Unauthorized to delete this medical record', 403);
      }

      await storageService.deleteFile(record.fileKey);
      await record.deleteOne();

      await AuditService.log({
        actorId: req.user!.id,
        action: 'MEDICAL_RECORD_DELETED',
        entity: 'MedicalRecord',
        entityId: req.params.id,
        ipAddress: req.ip,
      });

      res.status(200).json({ success: true, message: 'Record deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}
