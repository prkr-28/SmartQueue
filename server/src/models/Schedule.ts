import mongoose, { Schema, Document } from 'mongoose';

export interface IWeeklyShift {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  shifts: Array<{
    startTime: string; // "09:00"
    endTime: string;   // "13:00"
  }>;
  slotDurationMinutes: number;
}

export interface ILeaveBlock {
  startDate: Date;
  endDate: Date;
  reason?: string;
}

export interface ISchedule extends Document {
  doctorProfileId: mongoose.Types.ObjectId;
  hospitalId: mongoose.Types.ObjectId;
  weeklyHours: IWeeklyShift[];
  leaveBlocks: ILeaveBlock[];
  createdAt: Date;
  updatedAt: Date;
}

const WeeklyShiftSchema = new Schema<IWeeklyShift>(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    shifts: [
      {
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
      },
    ],
    slotDurationMinutes: { type: Number, default: 15, min: 5, max: 120 },
  },
  { _id: false }
);

const LeaveBlockSchema = new Schema<ILeaveBlock>(
  {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String },
  },
  { _id: false }
);

const ScheduleSchema = new Schema<ISchedule>(
  {
    doctorProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'DoctorProfile',
      required: true,
      unique: true,
      index: true,
    },
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    weeklyHours: [WeeklyShiftSchema],
    leaveBlocks: [LeaveBlockSchema],
  },
  { timestamps: true }
);

export const Schedule = mongoose.model<ISchedule>('Schedule', ScheduleSchema);
