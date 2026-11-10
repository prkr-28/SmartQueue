import mongoose, { Schema, Document } from 'mongoose';
import { PaymentStatus, PaymentMode } from '@smartqueue/shared';

export interface IInvoice extends Document {
  invoiceNumber: string;
  appointmentId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  hospitalId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  consultationFee: number;
  taxAmount: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paymentMode: PaymentMode;
  paymentDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'DoctorProfile', required: true, index: true },
    consultationFee: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending',
      index: true,
    },
    paymentMode: {
      type: String,
      enum: ['cash', 'card', 'upi'],
      default: 'cash',
    },
    paymentDate: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);
