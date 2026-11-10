import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

export const connectDatabase = async (): Promise<typeof mongoose> => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DB_NAME,
      autoIndex: true,
    });
    logger.info({ dbName: env.MONGODB_DB_NAME }, 'MongoDB connected successfully');
    return conn;
  } catch (error) {
    logger.error({ error }, 'MongoDB connection error');
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error({ error }, 'Error disconnecting MongoDB');
  }
};
