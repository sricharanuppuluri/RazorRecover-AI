import { Router } from 'express';
import {
  getMerchantSettingsController,
  updateMerchantSettingsController
} from '../controllers/merchant-settings.controller';

const router = Router();

router.get('/settings', getMerchantSettingsController);
router.put('/settings', updateMerchantSettingsController);

export default router;
