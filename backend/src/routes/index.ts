import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import apartmentRoutes from './apartment.routes';
import carRoutes from './car.routes';
import planRoutes from './plan.routes';
import subscriptionRoutes from './subscription.routes';
import dropdownRoutes from './dropdown.routes';
import taskRoutes from './task.routes';
import paymentRoutes from './payment.routes';
import dashboardRoutes from './dashboard.routes';
import customerDashboardRoutes from './customer.dashboard.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/apartments', apartmentRoutes);
router.use('/cars', carRoutes);
router.use('/plans', planRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/dropdowns', dropdownRoutes);
router.use('/tasks', taskRoutes);
router.use('/payments', paymentRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/customer-dashboard', customerDashboardRoutes);


export default router;
