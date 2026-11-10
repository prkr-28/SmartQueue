import { Router } from 'express';
import { DoctorController } from '../controllers/doctor.controller.js';
import { authenticateJwt, requireRole } from '../middlewares/auth.js';

const router = Router();

// Doctor personal endpoints (must come before `/:id` to avoid route param collisions)
router.get('/profile/me', authenticateJwt, requireRole('doctor'), DoctorController.getMyProfile);
router.get('/my/appointments', authenticateJwt, requireRole('doctor'), DoctorController.getDoctorAppointments);
router.put('/profile/schedule', authenticateJwt, requireRole('doctor'), DoctorController.updateSchedule);

// Public doctor search and slot availability
router.get('/', DoctorController.searchDoctors);
router.get('/:id', DoctorController.getDoctorById);
router.get('/:id/slots', DoctorController.getAvailableSlots);

// Schedule updates & pause toggle
router.put('/:id/schedule', authenticateJwt, requireRole('doctor', 'hospital_admin', 'super_admin'), DoctorController.updateSchedule);
router.post('/:id/pause', authenticateJwt, requireRole('doctor', 'receptionist', 'hospital_admin'), DoctorController.togglePause);
router.get('/:id/appointments', authenticateJwt, requireRole('doctor', 'receptionist', 'hospital_admin'), DoctorController.getDoctorAppointments);

export default router;
