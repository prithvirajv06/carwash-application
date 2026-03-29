import { Router } from 'express';
import {
  createPlan,
  listPlans,
  getPlanById,
  updatePlan,
  deletePlan,
  getPlanPriceForCar,
} from '../controllers/plan.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createPlanSchema, updatePlanSchema } from '../validators/plan.validator';

const router = Router();

router.get('/', listPlans);
router.get('/:id', getPlanById);

router.use(authenticate);

router.get('/:planId/price/car/:carId', getPlanPriceForCar);

router.post('/', authorize('admin', 'superadmin'), validate(createPlanSchema), createPlan);
router.put('/:id', authorize('admin', 'superadmin'), validate(updatePlanSchema), updatePlan);
router.delete('/:id', authorize('admin', 'superadmin'), deletePlan);

export default router;
