import { Request, Response, NextFunction } from 'express';
import { MerchantSettingsService } from '../services/merchant-settings.service';
import { AuditEventRepository } from '../repositories/audit-event.repository';

const settingsService = new MerchantSettingsService();
const auditRepo = new AuditEventRepository();

export async function getMerchantSettingsController(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.user?.merchantId || 'mch_test_01';
    const settings = await settingsService.getSettings(merchantId);
    res.status(200).json({ status: 'success', data: settings });
  } catch (err) {
    next(err);
  }
}

export async function updateMerchantSettingsController(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.user?.merchantId || 'mch_test_01';
    const updated = await settingsService.updateSettings(merchantId, req.body);

    await auditRepo.create({
      merchant_id: merchantId,
      event_type: 'SETTINGS_UPDATED',
      actor_type: 'merchant',
      actor_id: req.user?.userId || 'usr_01',
      action: 'UPDATE_SETTINGS',
      decision_summary: `Merchant settings updated for ${merchantId}`,
      outcome: 'SUCCESS'
    });

    res.status(200).json({ status: 'success', data: updated });
  } catch (err: any) {
    res.status(400).json({ status: 'error', error: { message: err.message, code: 'VALIDATION_ERROR' } });
  }
}
