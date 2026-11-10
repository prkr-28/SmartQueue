import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { Department } from '../models/Department.js';
import { Hospital } from '../models/Hospital.js';
import { AuditLog } from '../models/AuditLog.js';
import { Schedule } from '../models/Schedule.js';
import { AppError } from '../middlewares/errorHandler.js';
import { AuditService } from '../services/audit.service.js';

export class AdminController {
  static async getStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doctors = await DoctorProfile.find()
        .populate('userId', 'name email phone role isActive createdAt')
        .populate('departmentId', 'name code');

      const staffUsers = await User.find({
        role: { $in: ['receptionist', 'hospital_admin'] },
      }).select('-passwordHash');

      res.status(200).json({
        success: true,
        data: {
          doctors,
          staff: staffUsers,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async createStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        name,
        email,
        password,
        phone,
        role,
        departmentId,
        specialization,
        roomNumber,
        consultationFee,
        avgConsultationMinutes,
        experienceYears,
      } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new AppError('A user with this email address already exists', 400);
      }

      const passwordHash = await bcrypt.hash(password || 'Staff@123', 10);
      const hospital = await Hospital.findOne({ isActive: true });
      if (!hospital) {
        throw new AppError('No active hospital found in the system', 404);
      }

      const user = await User.create({
        name,
        email,
        passwordHash,
        phone,
        role: role || 'receptionist',
        hospitalId: hospital._id,
        isActive: true,
      });

      let doctorProfile = null;
      if (role === 'doctor') {
        if (!departmentId || !specialization || !roomNumber) {
          throw new AppError('departmentId, specialization, and roomNumber are required for doctor profile', 400);
        }

        doctorProfile = await DoctorProfile.create({
          userId: user._id,
          hospitalId: hospital._id,
          departmentId,
          specialization,
          roomNumber,
          consultationFee: consultationFee || 500,
          avgConsultationMinutes: avgConsultationMinutes || 15,
          experienceYears: experienceYears || 3,
          qualifications: ['MBBS'],
          isActive: true,
        });

        // Initialize default schedule (Mon-Fri 09:00 - 17:00)
        await Schedule.create({
          doctorProfileId: doctorProfile._id,
          hospitalId: hospital._id,
          weeklyHours: [1, 2, 3, 4, 5].map((day) => ({
            dayOfWeek: day,
            shifts: [{ startTime: '09:00', endTime: '17:00' }],
            slotDurationMinutes: avgConsultationMinutes || 15,
          })),
          leaveBlocks: [],
        });
      }

      await AuditService.log({
        actorId: req.user!.id,
        action: 'STAFF_CREATED',
        entity: 'User',
        entityId: user._id.toString(),
        details: { email: user.email, role: user.role },
        ipAddress: req.ip,
      });

      res.status(201).json({
        success: true,
        message: 'Staff member created successfully',
        data: { user, doctorProfile },
      });
    } catch (error) {
      next(error);
    }
  }

  static async toggleStaffStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      user.isActive = !user.isActive;
      await user.save();

      if (user.role === 'doctor') {
        await DoctorProfile.findOneAndUpdate({ userId: user._id }, { isActive: user.isActive });
      }

      await AuditService.log({
        actorId: req.user!.id,
        action: 'STAFF_STATUS_UPDATED',
        entity: 'User',
        entityId: user._id.toString(),
        details: { isActive: user.isActive },
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: `Staff member ${user.isActive ? 'activated' : 'disabled'} successfully`,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPatients(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 15));
      const skip = (page - 1) * limit;

      const query: any = { role: 'patient' };
      if (req.query.search) {
        const searchRegex = new RegExp(req.query.search as string, 'i');
        query.$or = [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }];
      }

      const [patients, total] = await Promise.all([
        User.find(query).select('-passwordHash').sort({ createdAt: -1 }).skip(skip).limit(limit),
        User.countDocuments(query),
      ]);

      res.status(200).json({
        success: true,
        data: {
          items: patients,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const skip = (page - 1) * limit;

      const query: any = {};
      if (req.query.action) {
        query.action = req.query.action;
      }
      if (req.query.entity) {
        query.entity = req.query.entity;
      }

      const [logs, total] = await Promise.all([
        AuditLog.find(query)
          .populate('actorId', 'name email role')
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit),
        AuditLog.countDocuments(query),
      ]);

      res.status(200).json({
        success: true,
        data: {
          items: logs,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getHospitalSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospital = await Hospital.findOne({ isActive: true });
      if (!hospital) {
        throw new AppError('Hospital not found', 404);
      }
      res.status(200).json({ success: true, data: hospital });
    } catch (error) {
      next(error);
    }
  }

  static async updateHospitalSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospital = await Hospital.findOne({ isActive: true });
      if (!hospital) {
        throw new AppError('Hospital not found', 404);
      }

      const { name, phone, email, settings } = req.body;
      if (name) hospital.name = name;
      if (phone) hospital.phone = phone;
      if (email) hospital.email = email;
      if (settings) {
        hospital.settings = {
          ...hospital.settings,
          ...settings,
        };
      }

      await hospital.save();

      await AuditService.log({
        actorId: req.user!.id,
        action: 'HOSPITAL_SETTINGS_UPDATED',
        entity: 'Hospital',
        entityId: hospital._id.toString(),
        details: { settings: hospital.settings },
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'Hospital settings updated successfully',
        data: hospital,
      });
    } catch (error) {
      next(error);
    }
  }
}
