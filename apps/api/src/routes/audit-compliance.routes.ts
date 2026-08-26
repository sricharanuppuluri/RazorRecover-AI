import { Router } from 'express';
import { AuditComplianceController } from '../controllers/audit-compliance.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();
const controller = new AuditComplianceController();

router.use(authenticate);

router.get('/vault/verify', requireRole('ADMIN', 'OPERATOR', 'OWNER', 'VIEWER'), (req, res) => controller.getProof(req, res));
router.get('/compliance', requireRole('ADMIN', 'OPERATOR', 'OWNER', 'VIEWER'), (req, res) => controller.getComplianceReport(req, res));

export default router;
