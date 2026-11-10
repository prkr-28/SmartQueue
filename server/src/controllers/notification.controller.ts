import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service.js';

export class NotificationController {
  static async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const data = await NotificationService.getUserNotifications(req.user!.id, page, limit);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const success = await NotificationService.markAsRead(req.params.id, req.user!.id);
      res.status(200).json({ success, message: 'Notification marked as read' });
    } catch (error) {
      next(error);
    }
  }

  static async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const count = await NotificationService.markAllAsRead(req.user!.id);
      res.status(200).json({ success: true, message: `${count} notifications marked as read` });
    } catch (error) {
      next(error);
    }
  }
}
