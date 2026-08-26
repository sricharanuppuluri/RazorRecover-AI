import { Router } from 'express';
import { DegradationController } from '../controllers/degradation.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();
const controller = new DegradationController();

router.use(authenticate);
router.get('/', requireRole('VIEWER'), controller.getAlerts);

export default router;
