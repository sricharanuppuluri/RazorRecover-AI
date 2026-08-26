import { Request, Response } from 'express';
import { AuditComplianceService } from '../services/audit-compliance.service';

const complianceService = new AuditComplianceService();

export class AuditComplianceController {
  public async getProof(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).user?.merchantId || 'mch_test_01';
      const proof = await complianceService.verifyAuditVaultChain(merchantId);
      res.status(200).json({
        status: 'success',
        data: proof,
      });
    } catch (err: any) {
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  }

  public async getComplianceReport(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).user?.merchantId || 'mch_test_01';
      const report = await complianceService.generateComplianceReport(merchantId);
      res.status(200).json({
        status: 'success',
        data: report,
      });
    } catch (err: any) {
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  }
}
