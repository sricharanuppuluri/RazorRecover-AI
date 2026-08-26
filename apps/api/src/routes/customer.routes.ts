import { Router } from 'express';
import { createCustomerController, getCustomerController } from '../controllers/customer.controller';
import { validateCustomerInput } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.post('/', requireRole('OPERATOR', 'ADMIN', 'OWNER'), validateCustomerInput, createCustomerController);
router.get('/:id', requireRole('VIEWER', 'OPERATOR', 'ADMIN', 'OWNER'), getCustomerController);

export default router;
