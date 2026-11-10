import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller.js';
import { authenticateJwt } from '../middlewares/auth.js';

const router = Router();

router.use(authenticateJwt);

router.get('/', NotificationController.getNotifications);
router.patch('/:id/read', NotificationController.markAsRead);
router.patch('/read-all', NotificationController.markAllAsRead);

export default router;
