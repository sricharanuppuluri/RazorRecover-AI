import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();
const controller = new NotificationController();

router.use(authenticate);

router.post('/dispatch', requireRole('ADMIN', 'OPERATOR', 'OWNER'), (req, res) => controller.dispatch(req, res));
router.get('/history', requireRole('ADMIN', 'OPERATOR', 'OWNER', 'VIEWER'), (req, res) => controller.getHistory(req, res));
router.get('/channels', requireRole('ADMIN', 'OPERATOR', 'OWNER', 'VIEWER'), (req, res) => controller.getChannels(req, res));

export default router;
