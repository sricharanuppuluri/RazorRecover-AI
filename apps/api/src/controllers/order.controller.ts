import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service';
import { RazorpayServiceError } from '../services/razorpay/client';

const orderService = new OrderService();

export async function createOrderController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = {
      ...req.body,
      merchant_id: req.user?.merchantId || req.body.merchant_id || 'mch_test_01'
    };
    const result = await orderService.createOrder(input);
    res.status(201).json({ status: 'success', data: result });
  } catch (err: any) {
    if (err instanceof RazorpayServiceError) {
      return res.status(err.statusCode).json({
        status: 'error',
        error: {
          message: err.message,
          code: 'RAZORPAY_API_ERROR',
          details: err.details
        }
      });
    }
    next(err);
  }
}

export async function getOrderController(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await orderService.getOrderById(req.params.id);
    const merchantId = req.user?.merchantId;
    if (!order || (merchantId && order.merchant_id !== merchantId)) {
      return res.status(404).json({ status: 'error', error: { message: 'Order not found', code: 'NOT_FOUND' } });
    }
    res.status(200).json({ status: 'success', data: order });
  } catch (err) {
    next(err);
  }
}
