import { Router } from 'express';
import { getRevenueLeaksController } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.get('/revenue-leaks', requireRole('VIEWER', 'OPERATOR', 'ADMIN', 'OWNER'), getRevenueLeaksController);

export default router;
