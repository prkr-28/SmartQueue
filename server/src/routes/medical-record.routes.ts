import { Router } from 'express';
import multer from 'multer';
import { MedicalRecordController } from '../controllers/medical-record.controller.js';
import { authenticateJwt } from '../middlewares/auth.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const router = Router();

router.use(authenticateJwt);

router.post('/upload', upload.single('file'), MedicalRecordController.uploadRecord);
router.get('/patient/:patientId', MedicalRecordController.getPatientRecords);
router.delete('/:id', MedicalRecordController.deleteRecord);

export default router;
