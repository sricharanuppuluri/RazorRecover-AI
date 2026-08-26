import { Router } from 'express';
import { getRevenueLeaksController } from '../controllers/analytics.controller';
import { ExportController } from '../controllers/export.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();
const exportController = new ExportController();

router.use(authenticate);

router.get('/revenue-leaks', requireRole('VIEWER', 'OPERATOR', 'ADMIN', 'OWNER'), getRevenueLeaksController);
router.get('/export/cases', requireRole('VIEWER', 'OPERATOR', 'ADMIN', 'OWNER'), exportController.exportCasesCsv);
router.get('/export/audit', requireRole('VIEWER', 'OPERATOR', 'ADMIN', 'OWNER'), exportController.exportAuditCsv);

export default router;

