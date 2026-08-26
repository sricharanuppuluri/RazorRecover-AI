import { Request, Response, NextFunction } from 'express';
import { MerchantService } from '../services/merchant.service';

const merchantService = new MerchantService();

export async function createMerchantController(req: Request, res: Response, next: NextFunction) {
  try {
    const merchant = await merchantService.createMerchant(req.body);
    res.status(201).json({ status: 'success', data: merchant });
  } catch (err) {
    next(err);
  }
}

export async function getMerchantController(req: Request, res: Response, next: NextFunction) {
  try {
    const merchant = await merchantService.getMerchantById(req.params.id);
    if (!merchant) {
      return res.status(404).json({ status: 'error', error: { message: 'Merchant not found', code: 'NOT_FOUND' } });
    }
    res.status(200).json({ status: 'success', data: merchant });
  } catch (err) {
    next(err);
  }
}
