import mongoose, { Schema, Document } from 'mongoose';

export interface IDepartmentRoom {
  name: string;
  number: string;
  isActive: boolean;
}

export interface IDepartment extends Document {
  hospitalId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  rooms: IDepartmentRoom[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentRoomSchema = new Schema<IDepartmentRoom>(
  {
    name: { type: String, required: true },
    number: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const DepartmentSchema = new Schema<IDepartment>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    description: { type: String },
    rooms: [DepartmentRoomSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

DepartmentSchema.index({ hospitalId: 1, code: 1 }, { unique: true });

export const Department = mongoose.model<IDepartment>('Department', DepartmentSchema);
