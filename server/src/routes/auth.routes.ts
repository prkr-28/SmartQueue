import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { validateRequest } from '../middlewares/validate.js';
import { authenticateJwt } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validations/auth.validation.js';

const router = Router();

router.post('/register', authLimiter, validateRequest(registerSchema), AuthController.register);
router.post('/login', authLimiter, validateRequest(loginSchema), AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);
router.post('/forgot-password', authLimiter, validateRequest(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/reset-password', authLimiter, validateRequest(resetPasswordSchema), AuthController.resetPassword);

// Authenticated user profile routes
router.get('/me', authenticateJwt, AuthController.getMe);
router.put('/profile', authenticateJwt, AuthController.updateProfile);
router.post('/change-password', authenticateJwt, validateRequest(changePasswordSchema), AuthController.changePassword);

export default router;
