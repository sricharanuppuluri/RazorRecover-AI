import { Request, Response, NextFunction } from 'express';
import { RecoveryCaseService } from '../services/recovery-case.service';
import { AIPolicyPipelineService } from '../services/ai-policy-pipeline.service';

const recoveryCaseService = new RecoveryCaseService();
const aiPolicyPipelineService = new AIPolicyPipelineService();

export async function createRecoveryCaseController(req: Request, res: Response, next: NextFunction) {
  try {
    const rc = await recoveryCaseService.createRecoveryCase(req.body);
    res.status(201).json({ status: 'success', data: rc });
  } catch (err) {
    next(err);
  }
}

export async function getRecoveryCaseController(req: Request, res: Response, next: NextFunction) {
  try {
    const rc = await recoveryCaseService.getRecoveryCaseById(req.params.id);
    if (!rc) {
      return res.status(404).json({ status: 'error', error: { message: 'Recovery case not found', code: 'NOT_FOUND' } });
    }
    res.status(200).json({ status: 'success', data: rc });
  } catch (err) {
    next(err);
  }
}

export async function triggerAIDecisionController(req: Request, res: Response, next: NextFunction) {
  try {
    const caseId = req.params.id;
    const result = await aiPolicyPipelineService.processCaseAIDecision(caseId);
    res.status(200).json({ status: 'success', data: result });
  } catch (err: any) {
    if (err?.message?.includes('not found')) {
      return res.status(404).json({ status: 'error', error: { message: err.message, code: 'NOT_FOUND' } });
    }
    next(err);
  }
}
