import { Router } from 'express';
import {
  createDropdown,
  listDropdowns,
  getDropdownTree,
  updateDropdown,
  deleteDropdown,
  listCategories,
} from '../controllers/dropdown.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createDropdownSchema, updateDropdownSchema } from '../validators/dropdown.validator';

const router = Router();

router.get('/', listDropdowns);
router.post('/create-category', )
router.get('/categories', listCategories);
router.get('/tree/:category', getDropdownTree);

router.use(authenticate);
router.post('/', authorize('admin', 'superadmin'), validate(createDropdownSchema), createDropdown);
router.put('/:id', authorize('admin', 'superadmin'), validate(updateDropdownSchema), updateDropdown);
router.delete('/:id', authorize('admin', 'superadmin'), deleteDropdown);

export default router;
