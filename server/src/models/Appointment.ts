import mongoose, { Schema, Document } from 'mongoose';
import { AppointmentStatus, VisitType, PaymentStatus } from '@smartqueue/shared';

export interface IAppointment extends Document {
  appointmentNumber: string;
  hospitalId: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  dependentId?: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  slotTime: Date; // Full ISO timestamp
  status: AppointmentStatus;
  visitType: VisitType;
  symptoms?: string;
  notes?: string;
  cancelledAt?: Date;
  cancellationReason?: string;
  paymentStatus: PaymentStatus;
  consultationFee: number;
  isWalkIn: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>(
  {
    appointmentNumber: { type: String, required: true, unique: true, uppercase: true, index: true },
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'DoctorProfile', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dependentId: { type: Schema.Types.ObjectId, ref: 'Dependent' },
    date: { type: String, required: true, index: true }, // Format YYYY-MM-DD
    startTime: { type: String, required: true }, // Format HH:mm
    endTime: { type: String, required: true }, // Format HH:mm
    slotTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ['booked', 'checked_in', 'in_consultation', 'completed', 'cancelled', 'no_show'],
      default: 'booked',
      index: true,
    },
    visitType: {
      type: String,
      enum: ['new', 'follow_up', 'emergency'],
      default: 'new',
    },
    symptoms: { type: String, trim: true },
    notes: { type: String, trim: true },
    cancelledAt: { type: Date },
    cancellationReason: { type: String },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending',
    },
    consultationFee: { type: Number, required: true, default: 0 },
    isWalkIn: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// CRITICAL UNIQUE COMPOUND INDEX PREVENTING DOUBLE BOOKING
// An active appointment is any appointment not cancelled or no-show
AppointmentSchema.index(
  { doctorId: 1, date: 1, startTime: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['booked', 'checked_in', 'in_consultation', 'completed'] },
    },
  }
);

AppointmentSchema.index({ patientId: 1, status: 1, date: 1 });
AppointmentSchema.index({ hospitalId: 1, date: 1, status: 1 });

export const Appointment = mongoose.model<IAppointment>('Appointment', AppointmentSchema);
