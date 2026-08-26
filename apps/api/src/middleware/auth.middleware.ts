import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@razorrecover/shared-types';
import { env } from '../config/env';

export interface AuthPrincipal {
  userId: string;
  merchantId: string;
  role: UserRole;
  email?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPrincipal;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Check Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();

      if (token.includes('|')) {
        const parts = token.split('|');
        let merchantId = 'mch_test_01';
        let role: UserRole = 'OWNER';
        let userId = 'usr_01';

        for (const p of parts) {
          const [k, v] = p.split(':');
          if (k === 'mch') merchantId = v;
          if (k === 'role') role = v as UserRole;
          if (k === 'user') userId = v;
        }

        req.user = { userId, merchantId, role };
        return next();
      }
    }

    // 2. Dev / Test header fallback - strictly prohibited in production
    const isProduction = env.NODE_ENV === 'production';
    if (isProduction) {
      return res.status(401).json({
        status: 'error',
        error: {
          message: 'Authentication required. Bearer token missing or invalid.',
          code: 'UNAUTHORIZED'
        }
      });
    }

    // Accept dev headers only in development / test environments
    const headerMerchantId = req.headers['x-merchant-id'] as string;
    const headerRole = req.headers['x-user-role'] as UserRole;
    const headerUserId = req.headers['x-user-id'] as string;

    const validRoles: UserRole[] = ['OWNER', 'ADMIN', 'OPERATOR', 'VIEWER'];
    const role = (headerRole && validRoles.includes(headerRole)) ? headerRole : 'OWNER';
    const merchantId = headerMerchantId || 'mch_test_01';
    const userId = headerUserId || 'usr_demo_01';

    req.user = {
      userId,
      merchantId,
      role
    };

    next();
  } catch (err) {
    res.status(401).json({
      status: 'error',
      error: {
        message: 'Authentication failed',
        code: 'UNAUTHORIZED'
      }
    });
  }
}
