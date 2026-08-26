import { Router } from 'express';
import { createOrderController, getOrderController } from '../controllers/order.controller';
import { validateOrderInput } from '../middleware/validation.middleware';

const router = Router();

router.post('/', validateOrderInput, createOrderController);
router.get('/:id', getOrderController);

export default router;
