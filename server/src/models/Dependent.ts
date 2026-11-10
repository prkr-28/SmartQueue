import mongoose, { Schema, Document } from 'mongoose';
import { DependentRelationship } from '@smartqueue/shared';

export interface IDependent extends Document {
  patientId: mongoose.Types.ObjectId;
  name: string;
  relationship: DependentRelationship;
  dateOfBirth?: Date;
  gender: 'male' | 'female' | 'other';
  phone?: string;
  bloodGroup?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DependentSchema = new Schema<IDependent>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    relationship: {
      type: String,
      enum: ['spouse', 'child', 'parent', 'sibling', 'other'],
      required: true,
    },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
    phone: { type: String, trim: true },
    bloodGroup: { type: String, trim: true },
  },
  { timestamps: true }
);

export const Dependent = mongoose.model<IDependent>('Dependent', DependentSchema);
