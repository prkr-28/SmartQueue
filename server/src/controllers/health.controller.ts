import { Request, Response } from 'express';
import mongoose from 'mongoose';

export class HealthController {
  static async checkHealth(_req: Request, res: Response): Promise<void> {
    const dbState = mongoose.connection.readyState;
    const isDbConnected = dbState === 1;

    const healthStatus = {
      status: isDbConnected ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: isDbConnected ? 'connected' : 'disconnected',
        readyState: dbState,
      },
      memory: {
        rssMB: Math.round(process.memoryUsage().rss / (1024 * 1024)),
        heapUsedMB: Math.round(process.memoryUsage().heapUsed / (1024 * 1024)),
      },
    };

    const statusCode = isDbConnected ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  }
}
