import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service';

const paymentService = new PaymentService();

export async function createPaymentController(req: Request, res: Response, next: NextFunction) {
  try {
    const payment = await paymentService.createPayment(req.body);
    res.status(201).json({ status: 'success', data: payment });
  } catch (err) {
    next(err);
  }
}

export async function getPaymentController(req: Request, res: Response, next: NextFunction) {
  try {
    const payment = await paymentService.getPaymentById(req.params.id);
    if (!payment) {
      return res.status(404).json({ status: 'error', error: { message: 'Payment not found', code: 'NOT_FOUND' } });
    }
    res.status(200).json({ status: 'success', data: payment });
  } catch (err) {
    next(err);
  }
}
