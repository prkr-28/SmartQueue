import { AuditLog } from '../models/AuditLog.js';
import { logger } from '../config/logger.js';
import mongoose from 'mongoose';

export class AuditService {
  static async log(params: {
    actorId?: string | mongoose.Types.ObjectId;
    action: string;
    entity: string;
    entityId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await AuditLog.create({
        actorId: params.actorId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error({ error, params }, 'Failed to write audit log');
    }
  }
}
