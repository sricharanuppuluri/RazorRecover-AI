import { Request, Response, NextFunction } from 'express';
import { CustomerService } from '../services/customer.service';

const customerService = new CustomerService();

export async function createCustomerController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = {
      ...req.body,
      merchant_id: req.user?.merchantId || req.body.merchant_id || 'mch_test_01'
    };
    const customer = await customerService.createCustomer(input);
    res.status(201).json({ status: 'success', data: customer });
  } catch (err) {
    next(err);
  }
}

export async function getCustomerController(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = await customerService.getCustomerById(req.params.id);
    const merchantId = req.user?.merchantId;
    if (!customer || (merchantId && customer.merchant_id !== merchantId)) {
      return res.status(404).json({ status: 'error', error: { message: 'Customer not found', code: 'NOT_FOUND' } });
    }
    res.status(200).json({ status: 'success', data: customer });
  } catch (err) {
    next(err);
  }
}
