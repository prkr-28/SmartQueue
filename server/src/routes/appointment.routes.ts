import { Router } from 'express';
import { AppointmentController } from '../controllers/appointment.controller.js';
import { authenticateJwt } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validate.js';
import {
  bookAppointmentSchema,
  cancelAppointmentSchema,
  rescheduleAppointmentSchema,
} from '../validations/appointment.validation.js';

const router = Router();

router.use(authenticateJwt);

router.post('/', validateRequest(bookAppointmentSchema), AppointmentController.bookAppointment);
router.get('/', AppointmentController.getAppointments);
router.get('/:id', AppointmentController.getAppointmentById);
router.post('/:id/cancel', validateRequest(cancelAppointmentSchema), AppointmentController.cancelAppointment);
router.post('/:id/reschedule', validateRequest(rescheduleAppointmentSchema), AppointmentController.rescheduleAppointment);
router.get('/:id/slip', AppointmentController.downloadSlip);

export default router;
