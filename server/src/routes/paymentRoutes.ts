import { Router } from 'express';
import {
  getPayments,
  createPayment,
  getPaymentById,
  reversePayment,
} from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createPaymentSchema } from '../validations/index.js';

const router = Router();

router.use(authenticate);

router.get('/', getPayments);
router.post('/', validateBody(createPaymentSchema), createPayment);
router.get('/:id', getPaymentById);
router.post('/:id/reverse', reversePayment);

export default router;

