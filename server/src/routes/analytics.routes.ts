import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { authenticateJwt, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticateJwt);
router.use(requireRole('hospital_admin', 'super_admin'));

router.get('/dashboard', AnalyticsController.getDashboardAnalytics);

export default router;
