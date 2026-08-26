import { Router } from 'express';
import { createCustomerController, getCustomerController } from '../controllers/customer.controller';
import { validateCustomerInput } from '../middleware/validation.middleware';

const router = Router();

router.post('/', validateCustomerInput, createCustomerController);
router.get('/:id', getCustomerController);

export default router;
