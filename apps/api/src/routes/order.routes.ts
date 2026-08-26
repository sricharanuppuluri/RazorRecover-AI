import { Router } from 'express';
import { createOrderController, getOrderController } from '../controllers/order.controller';
import { validateOrderInput } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.post('/', requireRole('OPERATOR', 'ADMIN', 'OWNER'), validateOrderInput, createOrderController);
router.get('/:id', requireRole('VIEWER', 'OPERATOR', 'ADMIN', 'OWNER'), getOrderController);

export default router;
