import { Router } from 'express';
import { createMerchantController, getMerchantController } from '../controllers/merchant.controller';
import { validateMerchantInput } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.post('/', requireRole('ADMIN', 'OWNER'), validateMerchantInput, createMerchantController);
router.get('/:id', requireRole('VIEWER', 'OPERATOR', 'ADMIN', 'OWNER'), getMerchantController);

export default router;
