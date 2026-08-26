import { Request, Response, NextFunction } from 'express';
import { AuditEventRepository } from '../repositories/audit-event.repository';

const auditRepo = new AuditEventRepository();

export async function getAuditTrailController(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = {
      merchantId: req.user?.merchantId,
      caseId: req.query.caseId as string,
      eventType: req.query.eventType as string,
      actorType: req.query.actorType as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20
    };

    const result = await auditRepo.findAll(filters);
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}
