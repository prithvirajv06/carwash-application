import { Router } from 'express';
import {
  createAdmin,
  listUsers,
  getUserById,
  updateProfile,
  toggleUserStatus,
  listEmployees,
} from '../controllers/user.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createAdminSchema, updateProfileSchema } from '../validators/user.validator';

const router = Router();

router.use(authenticate);

router.get('/employees', authorize('admin', 'superadmin'), listEmployees);
router.get('/profile', updateProfile);
router.put('/profile', validate(updateProfileSchema), updateProfile);

router.get('/', authorize('admin', 'superadmin'), listUsers);
router.post('/', authorize('admin', 'superadmin'), validate(createAdminSchema), createAdmin);
router.get('/:id', authorize('admin', 'superadmin'), getUserById);
router.patch('/:id/toggle-status', authorize('admin', 'superadmin'), toggleUserStatus);

export default router;
