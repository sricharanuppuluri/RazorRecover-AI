import { Router } from 'express';
import { createPaymentController, getPaymentController } from '../controllers/payment.controller';
import { validatePaymentInput } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.post('/', requireRole('OPERATOR', 'ADMIN', 'OWNER'), validatePaymentInput, createPaymentController);
router.get('/:id', requireRole('VIEWER', 'OPERATOR', 'ADMIN', 'OWNER'), getPaymentController);

export default router;
