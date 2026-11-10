import { Router } from 'express';
import { ReportController } from '../controllers/report.controller.js';
import { authenticateJwt, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticateJwt);
router.use(requireRole('hospital_admin', 'super_admin', 'receptionist'));

router.get('/appointments/export', ReportController.exportAppointmentsCsv);
router.get('/revenue/export', ReportController.exportRevenueCsv);

export default router;
