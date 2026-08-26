import { Router } from 'express';
import { getRazorpayConfigController } from '../controllers/config.controller';

const router = Router();

router.get('/razorpay', getRazorpayConfigController);

export default router;
