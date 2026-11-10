import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '@smartqueue/shared';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  phone?: string;
  hospitalId?: mongoose.Types.ObjectId;
  avatarUrl?: string;
  failedLoginAttempts: number;
  lockoutUntil?: Date;
  isEmailVerified: boolean;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['super_admin', 'hospital_admin', 'doctor', 'receptionist', 'patient'],
      required: true,
      index: true,
    },
    phone: { type: String, trim: true },
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', index: true },
    avatarUrl: { type: String },
    failedLoginAttempts: { type: Number, default: 0 },
    lockoutUntil: { type: Date },
    isEmailVerified: { type: Boolean, default: false },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Compound indexes
UserSchema.index({ role: 1, hospitalId: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
