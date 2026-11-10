import { Router } from 'express';
import { DoctorController } from '../controllers/doctor.controller.js';
import { authenticateJwt, requireRole } from '../middlewares/auth.js';

const router = Router();

// Public doctor search and slot availability
router.get('/', DoctorController.searchDoctors);
router.get('/:id', DoctorController.getDoctorById);
router.get('/:id/slots', DoctorController.getAvailableSlots);

// Schedule updates (doctor or hospital admin)
router.put('/:id/schedule', authenticateJwt, requireRole('doctor', 'hospital_admin', 'super_admin'), DoctorController.updateSchedule);

export default router;
