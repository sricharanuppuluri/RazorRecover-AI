import { Request, Response, NextFunction } from 'express';
import { MerchantSettingsService } from '../services/merchant-settings.service';

const settingsService = new MerchantSettingsService();

export async function getMerchantSettingsController(req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await settingsService.getSettings();
    res.status(200).json({ status: 'success', data: settings });
  } catch (err) {
    next(err);
  }
}

export async function updateMerchantSettingsController(req: Request, res: Response, next: NextFunction) {
  try {
    const updated = await settingsService.updateSettings('mch_test_01', req.body);
    res.status(200).json({ status: 'success', data: updated });
  } catch (err: any) {
    res.status(400).json({ status: 'error', error: { message: err.message, code: 'VALIDATION_ERROR' } });
  }
}
