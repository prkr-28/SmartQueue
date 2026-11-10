import mongoose, { Schema, Document } from 'mongoose';

export interface IHospital extends Document {
  name: string;
  slug: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  phone: string;
  email: string;
  timezone: string;
  settings: {
    cancellationWindowHours: number;
    workingHoursStart: string;
    workingHoursEnd: string;
    defaultSlotDurationMinutes: number;
    gracePeriodMinutes: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HospitalSchema = new Schema<IHospital>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, required: true, default: 'India' },
    },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    timezone: { type: String, default: 'Asia/Kolkata' },
    settings: {
      cancellationWindowHours: { type: Number, default: 2 },
      workingHoursStart: { type: String, default: '09:00' },
      workingHoursEnd: { type: String, default: '18:00' },
      defaultSlotDurationMinutes: { type: Number, default: 15 },
      gracePeriodMinutes: { type: Number, default: 30 },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Hospital = mongoose.model<IHospital>('Hospital', HospitalSchema);
