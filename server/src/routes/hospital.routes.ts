import { Router } from 'express';
import { HospitalController } from '../controllers/hospital.controller.js';
import { authenticateJwt, requireRole } from '../middlewares/auth.js';

const router = Router();

// Public listing
router.get('/', HospitalController.getHospitals);
router.get('/:id', HospitalController.getHospitalById);
router.get('/:hospitalId/departments', HospitalController.getDepartments);

// Admin-only management
router.post('/', authenticateJwt, requireRole('super_admin', 'hospital_admin'), HospitalController.createHospital);
router.put('/:id', authenticateJwt, requireRole('super_admin', 'hospital_admin'), HospitalController.updateHospital);
router.post(
  '/:hospitalId/departments',
  authenticateJwt,
  requireRole('super_admin', 'hospital_admin'),
  HospitalController.createDepartment
);

export default router;
