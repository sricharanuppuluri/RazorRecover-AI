import { Request, Response } from 'express';
import { getRazorpayClient } from '../services/razorpay.service';

export function getRazorpayConfigController(req: Request, res: Response) {
  const client = getRazorpayClient();
  res.status(200).json({
    status: 'success',
    data: {
      keyId: client.getKeyId(),
      isConfigured: client.isConfigured()
    }
  });
}
