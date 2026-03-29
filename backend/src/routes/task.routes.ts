import { Router } from 'express';
import {
  createTask,
  listTasks,
  getMyTasks,
  updateTaskStatus,
  assignTask,
} from '../controllers/task.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createTaskSchema, updateTaskSchema, assignTaskSchema } from '../validators/task.validator';

const router = Router();

router.use(authenticate);

router.get('/my', authorize('employee'), getMyTasks);

router.get('/', authorize('admin', 'superadmin', 'employee'), listTasks);
router.post('/', authorize('admin', 'superadmin'), validate(createTaskSchema), createTask);

router.patch('/:id/status', authorize('admin', 'superadmin', 'employee'), validate(updateTaskSchema), updateTaskStatus);
router.patch('/:id/assign', authorize('admin', 'superadmin'), validate(assignTaskSchema), assignTask);

export default router;
