import { Hospital, IHospital } from '../models/Hospital.js';
import { Department, IDepartment } from '../models/Department.js';
import { AppError } from '../middlewares/errorHandler.js';

export class HospitalService {
  static async getAllHospitals(): Promise<IHospital[]> {
    return Hospital.find({ isActive: true }).sort({ name: 1 });
  }

  static async getHospitalById(id: string): Promise<IHospital> {
    const hospital = await Hospital.findById(id);
    if (!hospital) throw new AppError('Hospital not found', 404);
    return hospital;
  }

  static async createHospital(data: Partial<IHospital>): Promise<IHospital> {
    const slug = (data.name || 'hospital')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    return Hospital.create({ ...data, slug });
  }

  static async updateHospital(id: string, data: Partial<IHospital>): Promise<IHospital> {
    const hospital = await Hospital.findByIdAndUpdate(id, { $set: data }, { new: true });
    if (!hospital) throw new AppError('Hospital not found', 404);
    return hospital;
  }

  // Departments
  static async getDepartmentsByHospital(hospitalId: string): Promise<IDepartment[]> {
    return Department.find({ hospitalId, isActive: true }).sort({ name: 1 });
  }

  static async createDepartment(hospitalId: string, data: Partial<IDepartment>): Promise<IDepartment> {
    return Department.create({ ...data, hospitalId });
  }

  static async updateDepartment(departmentId: string, data: Partial<IDepartment>): Promise<IDepartment> {
    const dept = await Department.findByIdAndUpdate(departmentId, { $set: data }, { new: true });
    if (!dept) throw new AppError('Department not found', 404);
    return dept;
  }
}
