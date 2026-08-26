import { Router } from 'express';
import { getDashboardSummaryController } from '../controllers/dashboard.controller';

const router = Router();

router.get('/summary', getDashboardSummaryController);

export default router;
