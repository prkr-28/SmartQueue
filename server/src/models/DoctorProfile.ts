import mongoose, { Schema, Document } from 'mongoose';

export interface IDoctorProfile extends Document {
  userId: mongoose.Types.ObjectId;
  hospitalId: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId;
  specialization: string;
  qualifications: string[];
  experienceYears: number;
  consultationFee: number;
  avgConsultationMinutes: number;
  roomNumber: string;
  bio?: string;
  photoUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DoctorProfileSchema = new Schema<IDoctorProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    specialization: { type: String, required: true, trim: true },
    qualifications: [{ type: String }],
    experienceYears: { type: Number, default: 0 },
    consultationFee: { type: Number, required: true, min: 0 },
    avgConsultationMinutes: { type: Number, default: 15, min: 5 },
    roomNumber: { type: String, required: true },
    bio: { type: String },
    photoUrl: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

DoctorProfileSchema.index({ hospitalId: 1, departmentId: 1 });
DoctorProfileSchema.index({ hospitalId: 1, isActive: 1 });

export const DoctorProfile = mongoose.model<IDoctorProfile>('DoctorProfile', DoctorProfileSchema);
