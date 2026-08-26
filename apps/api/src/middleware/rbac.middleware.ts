import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@razorrecover/shared-types';
import { AuditEventRepository } from '../repositories/audit-event.repository';

const auditRepo = new AuditEventRepository();

const ROLE_HIERARCHY: Record<UserRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  OPERATOR: 2,
  VIEWER: 1
};

export function requireRole(...allowedRoles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED'
        }
      });
    }

    const userRoleLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const minAllowedLevel = Math.min(...allowedRoles.map(r => ROLE_HIERARCHY[r] || 99));

    if (userRoleLevel < minAllowedLevel) {
      // Audit access denial
      await auditRepo.create({
        merchant_id: req.user.merchantId,
        event_type: 'ACCESS_DENIED',
        actor_type: 'merchant',
        actor_id: req.user.userId,
        action: `${req.method} ${req.originalUrl}`,
        decision_summary: `Access denied for role ${req.user.role}. Required minimum role from [${allowedRoles.join(', ')}]`,
        outcome: 'DENIED'
      });

      return res.status(403).json({
        status: 'error',
        error: {
          message: 'You do not have permission to perform this action.',
          code: 'FORBIDDEN'
        }
      });
    }

    next();
  };
}
