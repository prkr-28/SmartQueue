import { Router } from 'express';
import { ConsultationController } from '../controllers/consultation.controller.js';
import { authenticateJwt, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticateJwt);

// Doctor & Admin create consultation
router.post('/', requireRole('doctor', 'hospital_admin', 'super_admin'), ConsultationController.createConsultation);

// View consultation by appointment ID
router.get('/appointment/:appointmentId', ConsultationController.getByAppointmentId);

// View patient history
router.get('/patient/:patientId', ConsultationController.getPatientHistory);

// Download prescription PDF (both patients and staff can access for their record)
router.get('/:id/pdf', ConsultationController.downloadPrescriptionPdf);

export default router;
