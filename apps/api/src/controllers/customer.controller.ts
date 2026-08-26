import { Request, Response, NextFunction } from 'express';
import { CustomerService } from '../services/customer.service';

const customerService = new CustomerService();

export async function createCustomerController(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = await customerService.createCustomer(req.body);
    res.status(201).json({ status: 'success', data: customer });
  } catch (err) {
    next(err);
  }
}

export async function getCustomerController(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = await customerService.getCustomerById(req.params.id);
    if (!customer) {
      return res.status(404).json({ status: 'error', error: { message: 'Customer not found', code: 'NOT_FOUND' } });
    }
    res.status(200).json({ status: 'success', data: customer });
  } catch (err) {
    next(err);
  }
}
