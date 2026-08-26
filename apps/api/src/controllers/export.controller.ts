import { Request, Response } from 'express';
import { ExportService } from '../services/export.service';

const exportService = new ExportService();

export class ExportController {
  public exportCasesCsv = async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = req.user?.merchantId;
      if (!merchantId) {
        res.status(401).json({ status: 'error', error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } });
        return;
      }

      const csv = await exportService.exportCasesCsv(merchantId);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=recovery_cases_${merchantId}.csv`);
      res.status(200).send(csv);
    } catch (err: any) {
      res.status(500).json({ status: 'error', error: { message: err.message, code: 'EXPORT_FAILED' } });
    }
  };

  public exportAuditCsv = async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = req.user?.merchantId;
      if (!merchantId) {
        res.status(401).json({ status: 'error', error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } });
        return;
      }

      const csv = await exportService.exportAuditCsv(merchantId);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=audit_trail_${merchantId}.csv`);
      res.status(200).send(csv);
    } catch (err: any) {
      res.status(500).json({ status: 'error', error: { message: err.message, code: 'EXPORT_FAILED' } });
    }
  };
}
