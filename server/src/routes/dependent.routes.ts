import { Router } from 'express';
import { DependentController } from '../controllers/dependent.controller.js';
import { authenticateJwt } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validate.js';
import { dependentSchema } from '../validations/dependent.validation.js';

const router = Router();

router.use(authenticateJwt);

router.get('/', DependentController.listDependents);
router.post('/', validateRequest(dependentSchema), DependentController.addDependent);
router.put('/:id', validateRequest(dependentSchema), DependentController.updateDependent);
router.delete('/:id', DependentController.deleteDependent);

export default router;
