import { Router } from 'express';
import { getAuditTrailController } from '../controllers/audit.controller';

const router = Router();

router.get('/', getAuditTrailController);

export default router;
