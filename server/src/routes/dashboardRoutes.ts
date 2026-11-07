import { Router } from 'express';
import {
  getDashboardSummary,
  getDashboardAnalytics,
  getRecentActivity,
} from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/summary', getDashboardSummary);
router.get('/analytics', getDashboardAnalytics);
router.get('/recent-activity', getRecentActivity);

export default router;

