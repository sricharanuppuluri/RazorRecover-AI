import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

const router = Router();
const controller = new WebhookController();

// POST /api/webhooks/razorpay
router.post('/razorpay', controller.handleRazorpayWebhook);

export default router;
