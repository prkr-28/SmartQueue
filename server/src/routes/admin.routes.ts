import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { authenticateJwt, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticateJwt);
router.use(requireRole('hospital_admin', 'super_admin'));

// Staff management
router.get('/staff', AdminController.getStaff);
router.post('/staff', AdminController.createStaff);
router.put('/staff/:id/status', AdminController.toggleStaffStatus);

// Patients directory
router.get('/patients', AdminController.getPatients);

// Security & Audit Logs
router.get('/audit-logs', AdminController.getAuditLogs);

// Hospital & System Settings
router.get('/settings', AdminController.getHospitalSettings);
router.put('/settings', AdminController.updateHospitalSettings);

export default router;
