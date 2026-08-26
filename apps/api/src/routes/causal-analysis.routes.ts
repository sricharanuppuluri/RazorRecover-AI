import { Router } from 'express';
import { CausalAnalysisController } from '../controllers/causal-analysis.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();
const controller = new CausalAnalysisController();

router.use(authenticate);

router.get('/metrics', requireRole('ADMIN', 'OPERATOR', 'OWNER', 'VIEWER'), (req, res) => controller.getMetrics(req, res));
router.get('/counterfactual', requireRole('ADMIN', 'OPERATOR', 'OWNER', 'VIEWER'), (req, res) => controller.getCounterfactualDetails(req, res));

export default router;
