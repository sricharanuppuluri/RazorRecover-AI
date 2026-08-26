import { Router } from 'express';
import { getRevenueLeaksController } from '../controllers/analytics.controller';

const router = Router();

router.get('/leaks', getRevenueLeaksController);

export default router;
