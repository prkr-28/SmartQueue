import { z } from 'zod';

export const dependentSchema = {
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100),
    relationship: z.enum(['spouse', 'child', 'parent', 'sibling', 'other']),
    dateOfBirth: z.string().optional(),
    gender: z.enum(['male', 'female', 'other']),
    phone: z.string().optional(),
    bloodGroup: z.string().optional(),
  }),
};
