import { Router } from 'express';
import { CalibrationController } from '../controllers/calibration.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';


const router = Router();

router.get('/metrics', authenticate, requireRole('ADMIN', 'OPERATOR', 'OWNER', 'VIEWER'), CalibrationController.getCalibration);
router.get('/drift', authenticate, requireRole('ADMIN', 'OPERATOR', 'OWNER', 'VIEWER'), CalibrationController.getDriftAlerts);


export default router;
