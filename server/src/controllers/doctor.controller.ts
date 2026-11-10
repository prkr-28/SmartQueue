import { Request, Response, NextFunction } from 'express';
import { DoctorService } from '../services/doctor.service.js';
import { SlotService } from '../services/slot.service.js';

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
      const schedule = await DoctorService.updateDoctorSchedule(req.params.id, req.body);
      res.status(200).json({ success: true, data: schedule });
    } catch (error) {
      next(error);
    }
  }
}
