import { Notification, INotification } from '../models/Notification.js';
import { logger } from '../config/logger.js';
import mongoose from 'mongoose';

export class NotificationService {
  static async create(params: {
    userId: string | mongoose.Types.ObjectId;
    title: string;
    message: string;
    type?: 'appointment' | 'queue' | 'system' | 'reminder';
    data?: Record<string, unknown>;
  }): Promise<INotification | null> {
    try {
      const notification = await Notification.create({
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || 'system',
        data: params.data,
        read: false,
      });
      return notification;
    } catch (error) {
      logger.error({ error, params }, 'Failed to create notification');
      return null;
    }
  }

  static async getUserNotifications(
    userId: string | mongoose.Types.ObjectId,
    page = 1,
    limit = 20
  ): Promise<{ notifications: INotification[]; unreadCount: number; total: number }> {
    const skip = (page - 1) * limit;
    const [notifications, unreadCount, total] = await Promise.all([
      Notification.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments({ userId, read: false }),
      Notification.countDocuments({ userId }),
    ]);

    return { notifications, unreadCount, total };
  }

  static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const res = await Notification.updateOne(
      { _id: notificationId, userId },
      { $set: { read: true } }
    );
    return res.modifiedCount > 0;
  }

  static async markAllAsRead(userId: string): Promise<number> {
    const res = await Notification.updateMany(
      { userId, read: false },
      { $set: { read: true } }
    );
    return res.modifiedCount;
  }
}
