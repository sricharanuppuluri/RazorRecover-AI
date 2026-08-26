import { Router } from 'express';
import { SystemSimulatorController } from '../controllers/system-simulator.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();
const controller = new SystemSimulatorController();

router.use(authenticate);

router.get('/scenarios', requireRole('ADMIN', 'OPERATOR', 'OWNER', 'VIEWER'), (req, res) => controller.getScenarios(req, res));
router.post('/execute-scenario', requireRole('ADMIN', 'OPERATOR', 'OWNER'), (req, res) => controller.runScenario(req, res));

export default router;
