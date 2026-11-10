import { Router } from 'express';
import authRoutes from './auth.routes.js';
import hospitalRoutes from './hospital.routes.js';
import doctorRoutes from './doctor.routes.js';
import appointmentRoutes from './appointment.routes.js';
import queueRoutes from './queue.routes.js';
import dependentRoutes from './dependent.routes.js';
import notificationRoutes from './notification.routes.js';
import healthRoutes from './health.routes.js';
import consultationRoutes from './consultation.routes.js';
import medicalRecordRoutes from './medical-record.routes.js';
import invoiceRoutes from './invoice.routes.js';
import analyticsRoutes from './analytics.routes.js';
import reportRoutes from './report.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/hospitals', hospitalRoutes);
router.use('/doctors', doctorRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/queue', queueRoutes);
router.use('/dependents', dependentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/health', healthRoutes);
router.use('/consultations', consultationRoutes);
router.use('/medical-records', medicalRecordRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/reports', reportRoutes);
router.use('/admin', adminRoutes);

export default router;
