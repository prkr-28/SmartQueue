import mongoose, { Schema, Document } from 'mongoose';

export interface IVitals {
  bloodPressure?: string;
  pulse?: number;
  temperature?: number;
  weight?: number;
  oxygenLevel?: number;
}

export interface IPrescriptionItem {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface IConsultation extends Document {
  appointmentId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  vitals?: IVitals;
  symptoms: string[];
  diagnosis: string;
  notes?: string;
  prescriptionItems: IPrescriptionItem[];
  followUpDate?: Date;
  labTests?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const PrescriptionItemSchema = new Schema<IPrescriptionItem>(
  {
    medicineName: { type: String, required: true },
    dosage: { type: String, required: true },
    frequency: { type: String, required: true },
    duration: { type: String, required: true },
    instructions: { type: String },
  },
  { _id: false }
);

const ConsultationSchema = new Schema<IConsultation>(
  {
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true,
      index: true,
    },
    doctorId: { type: Schema.Types.ObjectId, ref: 'DoctorProfile', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vitals: {
      bloodPressure: { type: String },
      pulse: { type: Number },
      temperature: { type: Number },
      weight: { type: Number },
      oxygenLevel: { type: Number },
    },
    symptoms: [{ type: String }],
    diagnosis: { type: String, required: true },
    notes: { type: String },
    prescriptionItems: [PrescriptionItemSchema],
    followUpDate: { type: Date },
    labTests: [{ type: String }],
  },
  { timestamps: true }
);

ConsultationSchema.index({ patientId: 1, createdAt: -1 });

export const Consultation = mongoose.model<IConsultation>('Consultation', ConsultationSchema);
