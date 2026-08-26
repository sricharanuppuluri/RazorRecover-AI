import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service';

const orderService = new OrderService();

export async function createOrderController(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await orderService.createOrder(req.body);
    res.status(201).json({ status: 'success', data: order });
  } catch (err) {
    next(err);
  }
}

export async function getOrderController(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await orderService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ status: 'error', error: { message: 'Order not found', code: 'NOT_FOUND' } });
    }
    res.status(200).json({ status: 'success', data: order });
  } catch (err) {
    next(err);
  }
}
