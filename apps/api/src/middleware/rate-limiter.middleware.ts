import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const ipMap = new Map<string, RateLimitStore>();

export function createRateLimiter(options: { windowMs: number; max: number; message?: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Exclude Razorpay webhook routes so payment capture webhooks are never dropped
    if (req.originalUrl.startsWith('/api/webhooks') || req.originalUrl.startsWith('/webhooks')) {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const key = `${ip}:${req.user?.merchantId || 'anon'}`;
    const now = Date.now();
    const store = ipMap.get(key) || { count: 0, resetTime: now + options.windowMs };

    if (now > store.resetTime) {
      store.count = 1;
      store.resetTime = now + options.windowMs;
    } else {
      store.count++;
    }

    ipMap.set(key, store);

    if (store.count > options.max) {
      return res.status(429).json({
        status: 'error',
        error: {
          message: options.message || 'Too many requests. Please try again later.',
          code: 'TOO_MANY_REQUESTS'
        }
      });
    }

    next();
  };
}
