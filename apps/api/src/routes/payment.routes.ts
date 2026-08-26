import { Router } from 'express';
import { createPaymentController, getPaymentController } from '../controllers/payment.controller';
import { validatePaymentInput } from '../middleware/validation.middleware';

const router = Router();

router.post('/', validatePaymentInput, createPaymentController);
router.get('/:id', getPaymentController);

export default router;
