import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../server/.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  MONGODB_DB_NAME: z.string().default('smartqueue'),
  JWT_ACCESS_SECRET: z.string().default('smartqueue_default_jwt_access_secret_32_chars_min'),
  JWT_REFRESH_SECRET: z.string().default('smartqueue_default_jwt_refresh_secret_32_chars_min'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('SmartQueue <no-reply@smartqueue.com>'),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  REDIS_URL: z.string().optional(),
});

const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error: any) {
    console.error('Environment validation error:', error.errors || error.message);
    throw new Error('Invalid environment configuration');
  }
};

export const env = parseEnv();
