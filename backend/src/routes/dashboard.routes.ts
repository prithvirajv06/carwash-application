import { Router } from 'express';
import {
  getDashboardStats,
  getRevenueReport,
  getStaticContent,
} from '../controllers/dashboard.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.get('/info/:type', getStaticContent);

router.use(authenticate);
router.get('/stats', authorize('admin', 'superadmin'), getDashboardStats);
router.get('/revenue', authorize('admin', 'superadmin'), getRevenueReport);

export default router;
