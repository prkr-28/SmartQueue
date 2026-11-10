import { Request, Response, NextFunction } from 'express';
import { HospitalService } from '../services/hospital.service.js';

export class HospitalController {
  static async getHospitals(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospitals = await HospitalService.getAllHospitals();
      res.status(200).json({ success: true, data: hospitals });
    } catch (error) {
      next(error);
    }
  }

  static async getHospitalById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospital = await HospitalService.getHospitalById(req.params.id);
      res.status(200).json({ success: true, data: hospital });
    } catch (error) {
      next(error);
    }
  }

  static async createHospital(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospital = await HospitalService.createHospital(req.body);
      res.status(201).json({ success: true, data: hospital });
    } catch (error) {
      next(error);
    }
  }

  static async updateHospital(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospital = await HospitalService.updateHospital(req.params.id, req.body);
      res.status(200).json({ success: true, data: hospital });
    } catch (error) {
      next(error);
    }
  }

  static async getDepartments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const departments = await HospitalService.getDepartmentsByHospital(req.params.hospitalId);
      res.status(200).json({ success: true, data: departments });
    } catch (error) {
      next(error);
    }
  }

  static async createDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const department = await HospitalService.createDepartment(req.params.hospitalId, req.body);
      res.status(201).json({ success: true, data: department });
    } catch (error) {
      next(error);
    }
  }
}
