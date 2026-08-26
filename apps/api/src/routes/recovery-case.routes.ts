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
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.post('/', requireRole('OPERATOR', 'ADMIN', 'OWNER'), validateRecoveryCaseInput, createRecoveryCaseController);
router.get('/', requireRole('VIEWER', 'OPERATOR', 'ADMIN', 'OWNER'), getRecoveryCasesController);
router.get('/:id', requireRole('VIEWER', 'OPERATOR', 'ADMIN', 'OWNER'), getRecoveryCaseController);
router.post('/:id/ai-decision', requireRole('OPERATOR', 'ADMIN', 'OWNER'), triggerAIDecisionController);

// Action Execution & Approval Endpoints
router.post('/:id/execute', requireRole('OPERATOR', 'ADMIN', 'OWNER'), executeActionController);
router.post('/:id/approve', requireRole('ADMIN', 'OWNER'), approveCaseController);
router.post('/:id/reject', requireRole('ADMIN', 'OWNER'), rejectCaseController);
router.post('/:id/stop', requireRole('ADMIN', 'OWNER'), stopCaseController);
router.get('/:id/actions', requireRole('VIEWER', 'OPERATOR', 'ADMIN', 'OWNER'), getCaseActionsController);

export default router;
