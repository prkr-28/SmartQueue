import { z } from 'zod';

export const bookAppointmentSchema = {
  body: z.object({
    doctorId: z.string().min(1, 'Doctor ID is required'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be formatted as HH:mm'),
    visitType: z.enum(['new', 'follow_up', 'emergency']).optional(),
    symptoms: z.string().optional(),
    dependentId: z.string().optional(),
    notes: z.string().optional(),
    patientId: z.string().optional(),
  }),
};

export const cancelAppointmentSchema = {
  body: z.object({
    reason: z.string().optional(),
  }),
};

export const rescheduleAppointmentSchema = {
  body: z.object({
    newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'New date must be formatted as YYYY-MM-DD'),
    newStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'New start time must be formatted as HH:mm'),
  }),
};
