import { Router } from 'express';
import {
  getMerchantSettingsController,
  updateMerchantSettingsController
} from '../controllers/merchant-settings.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.get('/settings', requireRole('VIEWER', 'OPERATOR', 'ADMIN', 'OWNER'), getMerchantSettingsController);
router.put('/settings', requireRole('ADMIN', 'OWNER'), updateMerchantSettingsController);

export default router;
