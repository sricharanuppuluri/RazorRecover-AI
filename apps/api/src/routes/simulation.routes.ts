import { Router } from 'express';
import { runSimulationController } from '../controllers/simulation.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.post('/run', requireRole('OPERATOR', 'ADMIN', 'OWNER'), runSimulationController);

export default router;
