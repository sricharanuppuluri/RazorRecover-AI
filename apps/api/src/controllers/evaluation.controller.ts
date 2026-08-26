import { Request, Response, NextFunction } from 'express';
import { EvaluationService } from '../services/evaluation.service';

const evaluationService = new EvaluationService();

export async function getEvaluationSummaryController(req: Request, res: Response, next: NextFunction) {
  try {
    const summary = evaluationService.getEvaluationSummary();
    res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
}
