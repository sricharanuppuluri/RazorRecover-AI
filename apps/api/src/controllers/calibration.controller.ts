import { Request, Response } from 'express';
import { CalibrationService } from '../services/calibration.service';

const calibrationService = new CalibrationService();

export class CalibrationController {
  public static async getCalibration(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = req.user?.merchantId;
      if (!merchantId) {
        res.status(401).json({ status: 'error', error: { code: 'UNAUTHORIZED', message: 'Merchant ID missing' } });
        return;
      }

      const metrics = await calibrationService.calculateCalibration(merchantId);
      res.status(200).json({ status: 'success', data: metrics });
    } catch (err: any) {
      res.status(500).json({ status: 'error', error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  }

  public static async getDriftAlerts(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = req.user?.merchantId;
      if (!merchantId) {
        res.status(401).json({ status: 'error', error: { code: 'UNAUTHORIZED', message: 'Merchant ID missing' } });
        return;
      }

      const alerts = await calibrationService.detectDrift(merchantId);
      res.status(200).json({ status: 'success', data: alerts });
    } catch (err: any) {
      res.status(500).json({ status: 'error', error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  }
}
