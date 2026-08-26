import { Router } from 'express';
import { ScheduledReportController } from '../controllers/scheduled-report.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();
const controller = new ScheduledReportController();

router.use(authenticate);

router.post('/subscriptions', requireRole('ADMIN', 'OPERATOR', 'OWNER'), (req, res) => controller.createSubscription(req, res));
router.get('/subscriptions', requireRole('ADMIN', 'OPERATOR', 'OWNER', 'VIEWER'), (req, res) => controller.listSubscriptions(req, res));
router.post('/subscriptions/:id/generate', requireRole('ADMIN', 'OPERATOR', 'OWNER'), (req, res) => controller.generateReport(req, res));

export default router;
