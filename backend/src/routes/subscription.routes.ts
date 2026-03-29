import { Router } from 'express';
import {
  initiateSubscription,
  verifyAndActivate,
  getMySubscriptions,
  renewSubscription,
  listAllSubscriptions,
} from '../controllers/subscription.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createSubscriptionSchema,
  verifyPaymentSchema,
  renewSubscriptionSchema,
} from '../validators/subscription.validator';

const router = Router();

router.use(authenticate);

router.get('/my', getMySubscriptions);
router.post('/', authorize('customer'), validate(createSubscriptionSchema), initiateSubscription);
router.post('/verify-payment', authorize('customer'), validate(verifyPaymentSchema), verifyAndActivate);
router.post('/:id/renew', authorize('customer'), validate(renewSubscriptionSchema), renewSubscription);

router.get('/', authorize('admin', 'superadmin'), listAllSubscriptions);

export default router;
