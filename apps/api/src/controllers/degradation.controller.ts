import { Request, Response } from 'express';
import { DegradationService } from '../services/degradation.service';

const degradationService = new DegradationService();

export class DegradationController {
  public getAlerts = async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = req.user?.merchantId;
      if (!merchantId) {
        res.status(401).json({ status: 'error', error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } });
        return;
      }

      const windowMinutes = req.query.windowMinutes ? Number(req.query.windowMinutes) : 30;
      const threshold = req.query.threshold ? Number(req.query.threshold) : 0.35;

      const alerts = await degradationService.detectDegradationAlerts(merchantId, windowMinutes, threshold);
      res.status(200).json({ status: 'success', data: alerts });
    } catch (err: any) {
      res.status(500).json({ status: 'error', error: { message: err.message, code: 'INTERNAL_ERROR' } });
    }
  };
}
