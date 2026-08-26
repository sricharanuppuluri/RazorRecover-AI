import { Request, Response } from 'express';
import { WebhookService } from '../services/webhook.service';

const webhookService = new WebhookService();

export class WebhookController {
  public handleRazorpayWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const signatureHeader = req.headers['x-razorpay-signature'] as string | undefined;
      const eventIdHeader = req.headers['x-razorpay-event-id'] as string | undefined;
      const correlationHeader = req.headers['x-correlation-id'] as string | undefined;

      // Access raw body captured by express.json({ verify: ... })
      const rawBody = (req as any).rawBody || (req.body ? JSON.stringify(req.body) : '');

      const result = await webhookService.processWebhook(
        rawBody,
        signatureHeader,
        eventIdHeader,
        req.body,
        undefined, // Uses env.RAZORPAY_WEBHOOK_SECRET
        correlationHeader
      );

      if (!result.success) {
        res.status(result.statusCode).json({
          status: 'error',
          error: {
            message: result.error || 'Webhook verification or processing failed',
            code: result.statusCode === 400 ? 'INVALID_WEBHOOK_SIGNATURE' : 'WEBHOOK_PROCESSING_ERROR'
          }
        });
        return;
      }

      res.status(result.statusCode).json({
        status: 'success',
        data: {
          message: result.message,
          eventId: result.eventId,
          duplicate: !!result.duplicate
        }
      });
    } catch (err: any) {
      console.error('[WebhookController] Unexpected error:', err.message);
      res.status(500).json({
        status: 'error',
        error: {
          message: 'Internal server error handling webhook',
          code: 'INTERNAL_SERVER_ERROR'
        }
      });
    }
  };
}
