import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service';

const paymentService = new PaymentService();

export async function createPaymentController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = {
      ...req.body,
      merchant_id: req.user?.merchantId || req.body.merchant_id || 'mch_test_01'
    };
    const payment = await paymentService.createPayment(input);
    res.status(201).json({ status: 'success', data: payment });
  } catch (err) {
    next(err);
  }
}

export async function getPaymentController(req: Request, res: Response, next: NextFunction) {
  try {
    const payment = await paymentService.getPaymentById(req.params.id);
    const merchantId = req.user?.merchantId;
    if (!payment || (merchantId && payment.merchant_id !== merchantId)) {
      return res.status(404).json({ status: 'error', error: { message: 'Payment not found', code: 'NOT_FOUND' } });
    }
    res.status(200).json({ status: 'success', data: payment });
  } catch (err) {
    next(err);
  }
}
