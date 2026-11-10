import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger.js';

export class AppError extends Error {
  statusCode: number;
  errors?: Array<{ field?: string; message: string }>;

  constructor(message: string, statusCode = 500, errors?: Array<{ field?: string; message: string }>) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] as string;

  // Log error with request ID
  logger.error(
    {
      requestId,
      err: {
        message: err.message,
        stack: err.stack,
        name: err.name,
      },
      method: req.method,
      path: req.originalUrl,
    },
    'Request error'
  );

  // Handle AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      errors: err.errors,
    });
    return;
  }

  // Handle Zod Validation Error
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors: formattedErrors,
    });
    return;
  }

  // Handle MongoDB Duplicate Key Error (code 11000)
  if (err.code === 11000) {
    const keyPattern = err.keyPattern || {};
    // Check if duplicate is on appointment slot
    if (keyPattern.doctorId && keyPattern.date && keyPattern.startTime) {
      res.status(409).json({
        success: false,
        error: 'This appointment slot has just been booked by another patient. Please select a different time.',
        code: 'SLOT_ALREADY_BOOKED',
      });
      return;
    }

    if (keyPattern.email) {
      res.status(409).json({
        success: false,
        error: 'An account with this email already exists.',
        code: 'EMAIL_EXISTS',
      });
      return;
    }

    res.status(409).json({
      success: false,
      error: 'A duplicate record already exists with these details.',
      code: 'DUPLICATE_KEY',
    });
    return;
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors || {}).map((e: any) => ({
      field: e.path,
      message: e.message,
    }));
    res.status(400).json({
      success: false,
      error: 'Database validation failed',
      errors,
    });
    return;
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      error: `Invalid format for field: ${err.path}`,
    });
    return;
  }

  // Default Internal Server Error
  res.status(500).json({
    success: false,
    error: 'An unexpected internal server error occurred.',
  });
};
