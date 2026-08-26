import { Router } from 'express';
import { getDashboardSummaryController } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.get('/summary', requireRole('VIEWER', 'OPERATOR', 'ADMIN', 'OWNER'), getDashboardSummaryController);

export default router;
