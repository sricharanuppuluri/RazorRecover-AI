import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';


const router = Router();

router.post('/failures', authenticate, requireRole('ADMIN', 'OPERATOR', 'OWNER'), SubscriptionController.recordFailure);
router.get('/failures', authenticate, requireRole('ADMIN', 'OPERATOR', 'OWNER', 'VIEWER'), SubscriptionController.listFailures);


export default router;
