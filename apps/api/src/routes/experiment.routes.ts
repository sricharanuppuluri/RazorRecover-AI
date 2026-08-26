import { Router } from 'express';
import { ExperimentController } from '../controllers/experiment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';


const router = Router();

router.post('/', authenticate, requireRole('ADMIN', 'OPERATOR', 'OWNER'), ExperimentController.createExperiment);
router.get('/', authenticate, requireRole('ADMIN', 'OPERATOR', 'OWNER', 'VIEWER'), ExperimentController.listExperiments);
router.get('/:id/analytics', authenticate, requireRole('ADMIN', 'OPERATOR', 'OWNER', 'VIEWER'), ExperimentController.getAnalytics);


export default router;
