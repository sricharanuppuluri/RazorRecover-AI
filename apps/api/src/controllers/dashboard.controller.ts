import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';

const dashboardService = new DashboardService();

export async function getDashboardSummaryController(req: Request, res: Response, next: NextFunction) {
  try {
    const summary = await dashboardService.getSummary();
    res.status(200).json({ status: 'success', data: summary });
  } catch (err) {
    next(err);
  }
}
