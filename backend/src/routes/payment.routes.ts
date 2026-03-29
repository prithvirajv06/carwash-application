import { Router } from 'express';
import {
  getMyPayments,
  listAllPayments,
  downloadInvoice,
  getPaymentById,
} from '../controllers/payment.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/my', getMyPayments);
router.get('/invoice/:id/download', downloadInvoice);

router.get('/', authorize('admin', 'superadmin'), listAllPayments);
router.get('/:id', authorize('admin', 'superadmin'), getPaymentById);

export default router;
