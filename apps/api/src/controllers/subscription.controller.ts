import { Request, Response } from 'express';
import { SubscriptionService } from '../services/subscription.service';

const subscriptionService = new SubscriptionService();

export class SubscriptionController {
  public static async recordFailure(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = req.user?.merchantId;
      if (!merchantId) {
        res.status(401).json({ status: 'error', error: { code: 'UNAUTHORIZED', message: 'Merchant ID missing' } });
        return;
      }

      const { subscriptionId, customerId, amount, planName, failureReason } = req.body;
      if (!subscriptionId || !customerId || typeof amount !== 'number' || amount <= 0) {
        res.status(400).json({ status: 'error', error: { code: 'BAD_REQUEST', message: 'Valid subscriptionId, customerId, and positive integer amount required' } });
        return;
      }

      const result = await subscriptionService.recordFailure(
        merchantId,
        subscriptionId,
        customerId,
        amount,
        planName || 'Standard Subscription',
        failureReason || 'MANDATE_EXECUTION_FAILED'
      );

      res.status(201).json({ status: 'success', data: result });
    } catch (err: any) {
      res.status(500).json({ status: 'error', error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  }

  public static async listFailures(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = req.user?.merchantId;
      if (!merchantId) {
        res.status(401).json({ status: 'error', error: { code: 'UNAUTHORIZED', message: 'Merchant ID missing' } });
        return;
      }

      const failures = await subscriptionService.getFailures(merchantId);
      res.status(200).json({ status: 'success', data: failures });
    } catch (err: any) {
      res.status(500).json({ status: 'error', error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  }
}
