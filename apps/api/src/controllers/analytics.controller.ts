import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service';

const analyticsService = new AnalyticsService();

export async function getRevenueLeaksController(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = {
      merchantId: req.user?.merchantId,
      dateRange: req.query.dateRange as string,
      category: req.query.category as string,
      paymentMethod: req.query.paymentMethod as string,
      bankProvider: req.query.bankProvider as string
    };
    const leaks = await analyticsService.getRevenueLeaks(filters);
    res.status(200).json({ status: 'success', data: leaks });
  } catch (err) {
    next(err);
  }
}
