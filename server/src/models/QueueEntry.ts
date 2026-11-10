import mongoose, { Schema, Document } from 'mongoose';
import { QueueStatus, PriorityLevel } from '@smartqueue/shared';

export interface IQueueHistory {
  action: string;
  timestamp: Date;
  actorId?: mongoose.Types.ObjectId;
  note?: string;
}

export interface IQueueEntry extends Document {
  hospitalId: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  appointmentId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  tokenNumber: string; // e.g. "CAR-014"
  date: string; // YYYY-MM-DD
  sequenceNumber: number;
  priority: PriorityLevel;
  status: QueueStatus;
  checkInTime: Date;
  calledTime?: Date;
  startTime?: Date;
  endTime?: Date;
  estimatedWaitMinutes: number;
  roomNumber?: string;
  queueHistory: IQueueHistory[];
  createdAt: Date;
  updatedAt: Date;
}

const QueueHistorySchema = new Schema<IQueueHistory>(
  {
    action: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    note: { type: String },
  },
  { _id: false }
);

const QueueEntrySchema = new Schema<IQueueEntry>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'DoctorProfile', required: true, index: true },
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true,
      index: true,
    },
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenNumber: { type: String, required: true },
    date: { type: String, required: true, index: true },
    sequenceNumber: { type: Number, required: true },
    priority: {
      type: String,
      enum: ['emergency', 'senior_disabled', 'normal'],
      default: 'normal',
      index: true,
    },
    status: {
      type: String,
      enum: ['waiting', 'called', 'in_consultation', 'completed', 'skipped', 'no_show', 'recalled'],
      default: 'waiting',
      index: true,
    },
    checkInTime: { type: Date, default: Date.now },
    calledTime: { type: Date },
    startTime: { type: Date },
    endTime: { type: Date },
    estimatedWaitMinutes: { type: Number, default: 0 },
    roomNumber: { type: String },
    queueHistory: [QueueHistorySchema],
  },
  { timestamps: true }
);

// Compound index for querying active daily queue ordered by priority and sequence
QueueEntrySchema.index({ doctorId: 1, date: 1, status: 1 });
QueueEntrySchema.index({ hospitalId: 1, date: 1, status: 1 });
QueueEntrySchema.index({ hospitalId: 1, date: 1, tokenNumber: 1 });

export const QueueEntry = mongoose.model<IQueueEntry>('QueueEntry', QueueEntrySchema);
