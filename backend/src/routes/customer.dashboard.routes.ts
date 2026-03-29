import { Router } from 'express';
import {
  getCustomerDashboard,
  getCustomerCars,
  getActiveSubscriptions,
  getRecentActivity,
  getCarActivity,
} from '../controllers/customer.dashboard.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);
router.use(authorize('customer'));

router.get('/', getCustomerDashboard);
router.get('/cars', getCustomerCars);
router.get('/subscriptions/active', getActiveSubscriptions);
router.get('/activity', getRecentActivity);
router.get('/cars/:carId/activity', getCarActivity);

export default router;
