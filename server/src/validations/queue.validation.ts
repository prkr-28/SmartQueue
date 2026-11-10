import { z } from 'zod';

export const checkInSchema = {
  body: z.object({
    appointmentId: z.string().min(1, 'Appointment ID is required'),
    priority: z.enum(['emergency', 'senior_disabled', 'normal']).optional(),
  }),
};

export const emergencyInsertSchema = {
  body: z.object({
    doctorId: z.string().min(1, 'Doctor ID is required'),
    patientId: z.string().min(1, 'Patient ID is required'),
    symptoms: z.string().min(1, 'Emergency symptoms description is required'),
  }),
};

export const reassignSchema = {
  body: z.object({
    newDoctorId: z.string().min(1, 'Target doctor ID is required'),
    reason: z.string().optional(),
  }),
};
