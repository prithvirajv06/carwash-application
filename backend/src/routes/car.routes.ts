import { Router } from 'express';
import {
  addCar,
  getMyCars,
  getCarById,
  updateCar,
  deleteCar,
  listAllCars,
} from '../controllers/car.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createCarSchema, updateCarSchema } from '../validators/car.validator';

const router = Router();

router.use(authenticate);

router.get('/my', getMyCars);
router.post('/', authorize('customer','admin'), validate(createCarSchema), addCar);
router.get('/:id', getCarById);
router.put('/:id', authorize('customer'), validate(updateCarSchema), updateCar);
router.delete('/:id', authorize('customer'), deleteCar);

router.get('/', authorize('admin', 'superadmin', 'employee'), listAllCars);

export default router;
