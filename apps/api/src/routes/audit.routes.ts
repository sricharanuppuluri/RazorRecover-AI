import { Router } from 'express';
import { getAuditTrailController } from '../controllers/audit.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requireRole('VIEWER', 'OPERATOR', 'ADMIN', 'OWNER'), getAuditTrailController);

export default router;
