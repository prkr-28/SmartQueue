import { Request, Response, NextFunction } from 'express';
import { Dependent } from '../models/Dependent.js';
import { AppError } from '../middlewares/errorHandler.js';

export class DependentController {
  static async listDependents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dependents = await Dependent.find({ patientId: req.user!.id }).sort({ createdAt: -1 });
      res.status(200).json({ success: true, data: dependents });
    } catch (error) {
      next(error);
    }
  }

  static async addDependent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, relationship, dateOfBirth, gender, phone, bloodGroup } = req.body;
      const dependent = await Dependent.create({
        patientId: req.user!.id,
        name,
        relationship,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender,
        phone,
        bloodGroup,
      });
      res.status(201).json({ success: true, message: 'Family member added', data: dependent });
    } catch (error) {
      next(error);
    }
  }

  static async updateDependent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, relationship, dateOfBirth, gender, phone, bloodGroup } = req.body;
      const dependent = await Dependent.findOneAndUpdate(
        { _id: req.params.id, patientId: req.user!.id },
        {
          $set: {
            name,
            relationship,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
            gender,
            phone,
            bloodGroup,
          },
        },
        { new: true }
      );
      if (!dependent) throw new AppError('Dependent family member not found', 404);
      res.status(200).json({ success: true, message: 'Family member updated', data: dependent });
    } catch (error) {
      next(error);
    }
  }

  static async deleteDependent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resDel = await Dependent.findOneAndDelete({
        _id: req.params.id,
        patientId: req.user!.id,
      });
      if (!resDel) throw new AppError('Dependent family member not found', 404);
      res.status(200).json({ success: true, message: 'Family member removed' });
    } catch (error) {
      next(error);
    }
  }
}
