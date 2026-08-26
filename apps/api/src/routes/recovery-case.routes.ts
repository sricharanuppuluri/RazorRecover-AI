import { Router } from 'express';
import { createRecoveryCaseController, getRecoveryCaseController } from '../controllers/recovery-case.controller';
import { validateRecoveryCaseInput } from '../middleware/validation.middleware';

const router = Router();

router.post('/', validateRecoveryCaseInput, createRecoveryCaseController);
router.get('/:id', getRecoveryCaseController);

export default router;
