import { DoctorProfile, IDoctorProfile } from '../models/DoctorProfile.js';
import { Schedule, ISchedule } from '../models/Schedule.js';
import { User } from '../models/User.js';
import { AppError } from '../middlewares/errorHandler.js';

export class DoctorService {
  /**
   * Search and filter doctors for patient appointment booking
   */
  static async searchDoctors(filters: {
    hospitalId?: string;
    departmentId?: string;
    search?: string;
    specialization?: string;
    maxFee?: number;
    sortBy?: 'fee_asc' | 'fee_desc' | 'experience_desc' | 'name_asc';
  }): Promise<IDoctorProfile[]> {
    const query: Record<string, any> = { isActive: true };

    if (filters.hospitalId) query.hospitalId = filters.hospitalId;
    if (filters.departmentId) query.departmentId = filters.departmentId;
    if (filters.specialization) query.specialization = new RegExp(filters.specialization, 'i');
    if (filters.maxFee) query.consultationFee = { $lte: filters.maxFee };

    let docQuery = DoctorProfile.find(query)
      .populate('userId', 'name email phone avatarUrl')
      .populate('departmentId', 'name code')
      .populate('hospitalId', 'name address');

    if (filters.sortBy === 'fee_asc') {
      docQuery = docQuery.sort({ consultationFee: 1 });
    } else if (filters.sortBy === 'fee_desc') {
      docQuery = docQuery.sort({ consultationFee: -1 });
    } else if (filters.sortBy === 'experience_desc') {
      docQuery = docQuery.sort({ experienceYears: -1 });
    }

    const doctors = await docQuery.exec();

    // In-memory filter for doctor name if search query is provided
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return doctors.filter((doc) => {
        const name = (doc.userId as any)?.name?.toLowerCase() || '';
        const spec = doc.specialization.toLowerCase();
        const dept = (doc.departmentId as any)?.name?.toLowerCase() || '';
        return name.includes(searchLower) || spec.includes(searchLower) || dept.includes(searchLower);
      });
    }

    return doctors;
  }

  /**
   * Get single doctor detail by ID
   */
  static async getDoctorById(id: string): Promise<{ doctor: IDoctorProfile; schedule: ISchedule | null }> {
    const doctor = await DoctorProfile.findById(id)
      .populate('userId', 'name email phone avatarUrl')
      .populate('departmentId', 'name code rooms')
      .populate('hospitalId');

    if (!doctor) throw new AppError('Doctor profile not found', 404);

    const schedule = await Schedule.findOne({ doctorProfileId: doctor._id });

    return { doctor, schedule };
  }

  /**
   * Create or update doctor schedule
   */
  static async updateDoctorSchedule(
    doctorId: string,
    data: { weeklyHours?: any[]; leaveBlocks?: any[] }
  ): Promise<ISchedule> {
    const doctor = await DoctorProfile.findById(doctorId);
    if (!doctor) throw new AppError('Doctor not found', 404);

    let schedule = await Schedule.findOne({ doctorProfileId: doctor._id });
    if (!schedule) {
      schedule = new Schedule({
        doctorProfileId: doctor._id,
        hospitalId: doctor.hospitalId,
        weeklyHours: data.weeklyHours || [],
        leaveBlocks: data.leaveBlocks || [],
      });
    } else {
      if (data.weeklyHours) schedule.weeklyHours = data.weeklyHours;
      if (data.leaveBlocks) schedule.leaveBlocks = data.leaveBlocks;
    }

    await schedule.save();
    return schedule;
  }
}
