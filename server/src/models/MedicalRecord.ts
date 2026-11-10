import mongoose, { Schema, Document } from 'mongoose';

export interface IMedicalRecord extends Document {
  patientId: mongoose.Types.ObjectId;
  title: string;
  recordType: 'prescription' | 'lab_report' | 'scan' | 'summary' | 'other';
  fileUrl: string;
  fileKey: string;
  fileSize?: number;
  mimeType?: string;
  uploadedBy: mongoose.Types.ObjectId;
  consultationId?: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const MedicalRecordSchema = new Schema<IMedicalRecord>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    recordType: {
      type: String,
      enum: ['prescription', 'lab_report', 'scan', 'summary', 'other'],
      default: 'other',
      index: true,
    },
    fileUrl: { type: String, required: true },
    fileKey: { type: String, required: true },
    fileSize: { type: Number },
    mimeType: { type: String },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    consultationId: { type: Schema.Types.ObjectId, ref: 'Consultation' },
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

MedicalRecordSchema.index({ patientId: 1, createdAt: -1 });

export const MedicalRecord = mongoose.model<IMedicalRecord>('MedicalRecord', MedicalRecordSchema);
