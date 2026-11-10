import { Router } from 'express';
import authRoutes from './auth.routes.js';
import hospitalRoutes from './hospital.routes.js';
import doctorRoutes from './doctor.routes.js';
import appointmentRoutes from './appointment.routes.js';
import queueRoutes from './queue.routes.js';
import dependentRoutes from './dependent.routes.js';
import notificationRoutes from './notification.routes.js';
import healthRoutes from './health.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/hospitals', hospitalRoutes);
router.use('/doctors', doctorRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/queue', queueRoutes);
router.use('/dependents', dependentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/health', healthRoutes);

export default router;
