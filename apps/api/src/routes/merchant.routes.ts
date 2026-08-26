import { Router } from 'express';
import { createMerchantController, getMerchantController } from '../controllers/merchant.controller';
import { validateMerchantInput } from '../middleware/validation.middleware';

const router = Router();

router.post('/', validateMerchantInput, createMerchantController);
router.get('/:id', getMerchantController);

export default router;
