import { Router } from 'express';
import {
  createApartment,
  listApartments,
  getApartmentById,
  updateApartment,
  deleteApartment,
} from '../controllers/apartment.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', listApartments);
router.get('/:id', getApartmentById);

router.use(authenticate);
router.post('/', authorize('admin', 'superadmin'), createApartment);
router.put('/:id', authorize('admin', 'superadmin'), updateApartment);
router.delete('/:id', authorize('admin', 'superadmin'), deleteApartment);

export default router;
