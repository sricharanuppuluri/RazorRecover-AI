import { Router } from 'express';
import {
  createRecoveryCaseController,
  getRecoveryCasesController,
  getRecoveryCaseController,
  triggerAIDecisionController
} from '../controllers/recovery-case.controller';
import {
  executeActionController,
  approveCaseController,
  rejectCaseController,
  stopCaseController,
  getCaseActionsController
} from '../controllers/recovery-action.controller';
import { validateRecoveryCaseInput } from '../middleware/validation.middleware';

const router = Router();

router.post('/', validateRecoveryCaseInput, createRecoveryCaseController);
router.get('/', getRecoveryCasesController);
router.get('/:id', getRecoveryCaseController);
router.post('/:id/ai-decision', triggerAIDecisionController);

// Phase 6 Action Execution & Approval Endpoints
router.post('/:id/execute', executeActionController);
router.post('/:id/approve', approveCaseController);
router.post('/:id/reject', rejectCaseController);
router.post('/:id/stop', stopCaseController);
router.get('/:id/actions', getCaseActionsController);

export default router;
