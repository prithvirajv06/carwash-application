import { Router } from 'express';
import {
  firebaseLogin,
  adminLogin,
  changePassword,
  forgotPassword,
  resetPassword,
  getMe as userProfile,
} from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  firebaseLoginSchema,
  adminLoginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator';
import { createAdmin } from '@/controllers/user.controller';

const router = Router();

router.post('/customer/login', validate(firebaseLoginSchema), firebaseLogin);
router.post('/admin/login', validate(adminLoginSchema), adminLogin);
router.put('/create-admin', createAdmin);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.put('/change-password', authenticate, validate(changePasswordSchema), changePassword);
router.get('/user-profile', authenticate, userProfile);

export default router;
