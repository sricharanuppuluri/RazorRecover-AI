import { Request, Response } from 'express';
import { AbandonmentService } from '../services/abandonment.service';

const abandonmentService = new AbandonmentService();

export class AbandonmentController {
  public static async createSession(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = req.user?.merchantId;
      if (!merchantId) {
        res.status(401).json({ status: 'error', error: { code: 'UNAUTHORIZED', message: 'Merchant ID missing' } });
        return;
      }

      const { orderId, customerId, amount, currency } = req.body;
      if (!orderId || !customerId || typeof amount !== 'number' || amount <= 0) {
        res.status(400).json({ status: 'error', error: { code: 'BAD_REQUEST', message: 'Valid orderId, customerId, and positive integer amount are required' } });
        return;
      }

      const session = await abandonmentService.createSession(merchantId, orderId, customerId, amount, currency || 'INR');
      res.status(201).json({ status: 'success', data: session });
    } catch (err: any) {
      res.status(500).json({ status: 'error', error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  }

  public static async detectAndRecover(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = req.user?.merchantId;
      if (!merchantId) {
        res.status(401).json({ status: 'error', error: { code: 'UNAUTHORIZED', message: 'Merchant ID missing' } });
        return;
      }

      const timeoutMinutes = req.body.timeoutMinutes || 15;
      const result = await abandonmentService.detectAndRecoverAbandonedSessions(merchantId, timeoutMinutes);
      res.status(200).json({ status: 'success', data: result });
    } catch (err: any) {
      res.status(500).json({ status: 'error', error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  }

  public static async listSessions(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = req.user?.merchantId;
      if (!merchantId) {
        res.status(401).json({ status: 'error', error: { code: 'UNAUTHORIZED', message: 'Merchant ID missing' } });
        return;
      }

      const sessions = await abandonmentService.getSessions(merchantId);
      res.status(200).json({ status: 'success', data: sessions });
    } catch (err: any) {
      res.status(500).json({ status: 'error', error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  }
}
