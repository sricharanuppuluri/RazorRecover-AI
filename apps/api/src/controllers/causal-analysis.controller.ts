import { Request, Response } from 'express';
import { CausalAnalysisService } from '../services/causal-analysis.service';

const causalService = new CausalAnalysisService();

export class CausalAnalysisController {
  public async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).user?.merchantId || 'mch_test_01';
      const metrics = await causalService.computeCausalImpact(merchantId);
      res.status(200).json({
        status: 'success',
        data: metrics,
      });
    } catch (err: any) {
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  }

  public async getCounterfactualDetails(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).user?.merchantId || 'mch_test_01';
      const details = await causalService.getCounterfactualDetails(merchantId);
      res.status(200).json({
        status: 'success',
        data: details,
      });
    } catch (err: any) {
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  }
}
