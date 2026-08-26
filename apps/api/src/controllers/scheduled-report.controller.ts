import { Request, Response } from 'express';
import { ScheduledReportService } from '../services/scheduled-report.service';

const reportService = new ScheduledReportService();

export class ScheduledReportController {
  public async createSubscription(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).user?.merchantId || 'mch_test_01';
      const { title, cadence, recipients, format } = req.body;

      const report = await reportService.createSubscription(merchantId, {
        title,
        cadence,
        recipients,
        format,
      });

      res.status(201).json({
        status: 'success',
        data: report,
      });
    } catch (err: any) {
      res.status(400).json({
        status: 'error',
        error: { code: 'INVALID_INPUT', message: err.message },
      });
    }
  }

  public async listSubscriptions(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).user?.merchantId || 'mch_test_01';
      const reports = await reportService.listSubscriptions(merchantId);
      res.status(200).json({
        status: 'success',
        data: reports,
      });
    } catch (err: any) {
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  }

  public async generateReport(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).user?.merchantId || 'mch_test_01';
      const { id } = req.params;

      const result = await reportService.generateReportPayload(merchantId, id);
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({
        status: 'error',
        error: { code: 'GENERATION_FAILED', message: err.message },
      });
    }
  }
}
