import { Router } from 'express';
import { QueueController } from '../controllers/queue.controller.js';
import { authenticateJwt, requireRole } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validate.js';
import { checkInSchema, emergencyInsertSchema, reassignSchema } from '../validations/queue.validation.js';

const router = Router();

// Public Display Screen Board (No login required)
router.get('/display/:hospitalId', QueueController.getDisplayData);

// Authenticated Queue routes
router.use(authenticateJwt);

// Patient Live Queue Tracker
router.get('/patient/live', QueueController.getPatientLiveQueue);

// Doctor & Receptionist Operations
router.get('/doctor/:doctorId?', requireRole('doctor', 'receptionist', 'hospital_admin', 'super_admin'), QueueController.getDoctorQueue);
router.post('/check-in', requireRole('patient', 'receptionist', 'hospital_admin', 'super_admin'), validateRequest(checkInSchema), QueueController.checkIn);
router.post('/doctor/:doctorId/call-next', requireRole('doctor', 'receptionist', 'hospital_admin'), QueueController.callNext);
router.post('/entry/:id/start', requireRole('doctor', 'hospital_admin'), QueueController.startConsultation);
router.post('/entry/:id/complete', requireRole('doctor', 'hospital_admin'), QueueController.completeConsultation);
router.post('/entry/:id/skip', requireRole('doctor', 'hospital_admin'), QueueController.skipPatient);
router.post('/entry/:id/recall', requireRole('doctor', 'hospital_admin'), QueueController.recallPatient);
router.post('/entry/:id/no-show', requireRole('doctor', 'hospital_admin'), QueueController.markNoShow);
router.post('/entry/:id/reassign', requireRole('doctor', 'receptionist', 'hospital_admin'), validateRequest(reassignSchema), QueueController.reassign);
router.post('/emergency-insert', requireRole('doctor', 'receptionist', 'hospital_admin'), validateRequest(emergencyInsertSchema), QueueController.emergencyInsert);

export default router;
