import { Router } from 'express';
import {
  createRecoveryCaseController,
  getRecoveryCaseController,
  triggerAIDecisionController
} from '../controllers/recovery-case.controller';
import { validateRecoveryCaseInput } from '../middleware/validation.middleware';

const router = Router();

router.post('/', validateRecoveryCaseInput, createRecoveryCaseController);
router.get('/:id', getRecoveryCaseController);
router.post('/:id/ai-decision', triggerAIDecisionController);

export default router;
