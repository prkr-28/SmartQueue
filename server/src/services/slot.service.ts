import { Schedule } from '../models/Schedule.js';
import { Appointment } from '../models/Appointment.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { Hospital } from '../models/Hospital.js';
import { AvailableSlot, DaySlotsResponse } from '@smartqueue/shared';
import { AppError } from '../middlewares/errorHandler.js';

export class SlotService {
  /**
   * Generates bookable slots for a doctor on a specific date (YYYY-MM-DD)
   */
  static async getDoctorAvailableSlots(
    doctorId: string,
    dateStr: string // "YYYY-MM-DD"
  ): Promise<DaySlotsResponse> {
    const doctor = await DoctorProfile.findById(doctorId);
    if (!doctor || !doctor.isActive) {
      throw new AppError('Doctor not found or inactive', 404);
    }

    const hospital = await Hospital.findById(doctor.hospitalId);
    const timezone = hospital?.timezone || 'Asia/Kolkata';

    // Parse the requested date
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) {
      throw new AppError('Invalid date format. Expected YYYY-MM-DD', 400);
    }

    const targetDate = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = targetDate.getUTCDay(); // 0 = Sun, 1 = Mon ...

    const schedule = await Schedule.findOne({ doctorProfileId: doctor._id });
    if (!schedule) {
      return {
        date: dateStr,
        doctorId,
        slotDurationMinutes: doctor.avgConsultationMinutes || 15,
        slots: [],
      };
    }

    // Check if the requested date falls inside any leave block
    const isDoctorOnLeave = schedule.leaveBlocks.some((leave) => {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const targetTime = targetDate.getTime();
      return targetTime >= start.getTime() && targetTime <= end.getTime();
    });

    if (isDoctorOnLeave) {
      return {
        date: dateStr,
        doctorId,
        slotDurationMinutes: 15,
        slots: [],
      };
    }

    // Find shift config for the day of week
    const daySchedule = schedule.weeklyHours.find((w) => w.dayOfWeek === dayOfWeek);
    if (!daySchedule || !daySchedule.shifts || daySchedule.shifts.length === 0) {
      return {
        date: dateStr,
        doctorId,
        slotDurationMinutes: 15,
        slots: [],
      };
    }

    const slotDuration = daySchedule.slotDurationMinutes || doctor.avgConsultationMinutes || 15;

    // Fetch existing active bookings for this doctor on this date
    const existingBookings = await Appointment.find({
      doctorId: doctor._id,
      date: dateStr,
      status: { $in: ['booked', 'checked_in', 'in_consultation', 'completed'] },
    }).select('startTime endTime');

    const bookedTimes = new Set(existingBookings.map((b) => b.startTime));

    const now = new Date();
    const isToday =
      now.toISOString().slice(0, 10) === dateStr;

    const generatedSlots: AvailableSlot[] = [];

    for (const shift of daySchedule.shifts) {
      const [startHour, startMin] = shift.startTime.split(':').map(Number);
      const [endHour, endMin] = shift.endTime.split(':').map(Number);

      let currentMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      while (currentMinutes + slotDuration <= endMinutes) {
        const slotStartH = Math.floor(currentMinutes / 60);
        const slotStartM = currentMinutes % 60;
        const slotEndMinutes = currentMinutes + slotDuration;
        const slotEndH = Math.floor(slotEndMinutes / 60);
        const slotEndM = slotEndMinutes % 60;

        const startTime = `${String(slotStartH).padStart(2, '0')}:${String(slotStartM).padStart(2, '0')}`;
        const endTime = `${String(slotEndH).padStart(2, '0')}:${String(slotEndM).padStart(2, '0')}`;

        // Create full UTC slotTime
        const slotDate = new Date(Date.UTC(year, month - 1, day, slotStartH, slotStartM, 0, 0));

        let isAvailable = !bookedTimes.has(startTime);

        // If slot is in the past for today, mark unavailable
        if (isToday) {
          // Compare current hour and min with slot start
          const currentHour = now.getHours();
          const currentMin = now.getMinutes();
          if (slotStartH < currentHour || (slotStartH === currentHour && slotStartM <= currentMin)) {
            isAvailable = false;
          }
        }

        generatedSlots.push({
          startTime,
          endTime,
          slotTime: slotDate.toISOString(),
          isAvailable,
        });

        currentMinutes += slotDuration;
      }
    }

    return {
      date: dateStr,
      doctorId,
      slotDurationMinutes: slotDuration,
      slots: generatedSlots,
    };
  }
}
