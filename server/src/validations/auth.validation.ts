import { z } from 'zod';

export const registerSchema = {
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    phone: z.string().optional(),
  }),
};

export const loginSchema = {
  body: z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
};

export const forgotPasswordSchema = {
  body: z.object({
    email: z.string().email('Please enter a valid email address'),
  }),
};

export const resetPasswordSchema = {
  body: z.object({
    email: z.string().email('Please enter a valid email address'),
    token: z.string().min(1, 'Token is required'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  }),
};

export const changePasswordSchema = {
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  }),
};
