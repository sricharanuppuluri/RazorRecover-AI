import { Request, Response } from 'express';
import { ActionExecutorService } from '../services/recovery/action-executor.service';
import { RecoveryCaseRepository } from '../repositories/recovery-case.repository';
import { RecoveryActionRepository } from '../repositories/recovery-action.repository';
import { RecoveryLinkRepository } from '../repositories/recovery-link.repository';
import { PolicyDecisionRepository } from '../repositories/policy-decision.repository';
import { AuditService } from '../services/audit.service';
import { PolicyEngine } from '@razorrecover/policy-engine';
import { AllowedAction } from '@razorrecover/shared-types';

const actionExecutor = new ActionExecutorService();
const caseRepo = new RecoveryCaseRepository();
const actionRepo = new RecoveryActionRepository();
const linkRepo = new RecoveryLinkRepository();
const policyRepo = new PolicyDecisionRepository();
const auditService = new AuditService();

/**
  * POST /api/recovery-cases/:id/execute
  * Executes a policy-approved recovery action.
  */
export async function executeActionController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { action, simulation } = req.body;

    const correlationId = (req.headers['x-correlation-id'] as string) || `corr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Verify allowed action enum
    const validActions: AllowedAction[] = [
      'WAIT_AND_RETRY',
      'OFFER_ALTERNATE_PAYMENT',
      'SEND_RECOVERY_LINK',
      'SEND_REMINDER',
      'ESCALATE_HUMAN',
      'STOP'
    ];

    if (!action || !validActions.includes(action as AllowedAction)) {
      res.status(400).json({
        error: 'Invalid action',
        message: `Action must be one of: ${validActions.join(', ')}`
      });
      return;
    }

    const result = await actionExecutor.executeAction({
      recoveryCaseId: id,
      action: action as AllowedAction,
      correlationId,
      simulation: simulation === true,
      actorType: 'system'
    });

    if (!result.success && result.reason?.includes('not found')) {
      res.status(404).json({
        error: 'Case Not Found',
        message: result.reason
      });
      return;
    }

    res.status(result.success ? 200 : 422).json(result);
  } catch (err: any) {
    res.status(500).json({
      error: 'Action Execution Error',
      message: err.message
    });
  }
}

/**
  * POST /api/recovery-cases/:id/approve
  * Human approval endpoint for cases in HUMAN_REVIEW state.
  */
export async function approveCaseController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const correlationId = (req.headers['x-correlation-id'] as string) || `corr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const rc = await caseRepo.findById(id);
    if (!rc) {
      res.status(404).json({ error: 'Case Not Found', message: `Recovery case ${id} not found.` });
      return;
    }

    if (rc.status !== 'HUMAN_REVIEW') {
      res.status(400).json({ error: 'Invalid Case State', message: `Case is in ${rc.status} state, but approval requires HUMAN_REVIEW state.` });
      return;
    }

    if (new Date() >= new Date(rc.expires_at)) {
      res.status(400).json({ error: 'Case Expired', message: 'Recovery case has expired.' });
      return;
    }

    // Record human approval audit event
    await auditService.logEvent({
      merchantId: rc.merchant_id,
      recoveryCaseId: id,
      eventType: 'HUMAN_APPROVAL',
      actorType: 'merchant',
      action: 'APPROVE_RECOVERY',
      outcome: 'APPROVED',
      decisionSummary: 'Merchant operator manually approved recovery action',
      correlationId
    });

    // Re-check latest policy decision
    const policyDecision = await policyRepo.findLatestByCaseId(id);
    const approvedAction = policyDecision?.action || rc.recommended_action || 'SEND_RECOVERY_LINK';

    // Transition to ACTION_PENDING
    await caseRepo.updateStatus(id, 'ACTION_PENDING');

    // Automatically trigger ActionExecutor for approved action
    const execResult = await actionExecutor.executeAction({
      recoveryCaseId: id,
      action: approvedAction,
      correlationId,
      actorType: 'merchant'
    });

    res.status(200).json({
      message: 'Recovery case approved by merchant',
      recoveryCaseId: id,
      actionExecuted: approvedAction,
      executionResult: execResult
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Approval Error', message: err.message });
  }
}

/**
  * POST /api/recovery-cases/:id/reject
  * Human rejection endpoint for cases in HUMAN_REVIEW state.
  */
export async function rejectCaseController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const correlationId = (req.headers['x-correlation-id'] as string) || `corr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const rc = await caseRepo.findById(id);
    if (!rc) {
      res.status(404).json({ error: 'Case Not Found', message: `Recovery case ${id} not found.` });
      return;
    }

    await auditService.logEvent({
      merchantId: rc.merchant_id,
      recoveryCaseId: id,
      eventType: 'HUMAN_REJECTION',
      actorType: 'merchant',
      action: 'REJECT_RECOVERY',
      outcome: 'STOPPED',
      decisionSummary: reason || 'Merchant operator rejected recovery action',
      correlationId
    });

    await caseRepo.updateStatus(id, 'STOPPED', {
      closedAt: new Date().toISOString(),
      closeReason: reason || 'HUMAN_REJECTED'
    });

    res.status(200).json({
      message: 'Recovery case rejected by merchant and stopped',
      recoveryCaseId: id,
      status: 'STOPPED'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Rejection Error', message: err.message });
  }
}

/**
  * POST /api/recovery-cases/:id/stop
  * Manual stop endpoint for active recovery cases.
  */
export async function stopCaseController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const correlationId = (req.headers['x-correlation-id'] as string) || `corr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const rc = await caseRepo.findById(id);
    if (!rc) {
      res.status(404).json({ error: 'Case Not Found', message: `Recovery case ${id} not found.` });
      return;
    }

    await caseRepo.updateStatus(id, 'STOPPED', {
      closedAt: new Date().toISOString(),
      closeReason: reason || 'MANUAL_STOP'
    });

    await auditService.logEvent({
      merchantId: rc.merchant_id,
      recoveryCaseId: id,
      eventType: 'RECOVERY_CASE_STOPPED',
      actorType: 'merchant',
      action: 'STOP_RECOVERY',
      outcome: 'STOPPED',
      decisionSummary: reason || 'Merchant manually stopped recovery case',
      correlationId
    });

    res.status(200).json({
      message: 'Recovery case stopped',
      recoveryCaseId: id,
      status: 'STOPPED'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Stop Error', message: err.message });
  }
}

/**
  * GET /api/recovery-cases/:id/actions
  * Fetches action execution history for a recovery case.
  */
export async function getCaseActionsController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const actions = await actionRepo.findByCaseId(id);
    res.status(200).json({
      recoveryCaseId: id,
      count: actions.length,
      actions
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Fetch Actions Error', message: err.message });
  }
}

/**
  * GET /api/recovery-links/:token
  * Resolves recovery link token securely.
  */
export async function resolveRecoveryLinkController(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.params;
    const link = await linkRepo.findByToken(token);

    if (!link) {
      res.status(404).json({ error: 'Invalid Token', message: 'Recovery link token is invalid or expired.' });
      return;
    }

    if (new Date() >= new Date(link.expires_at)) {
      res.status(410).json({ error: 'Token Expired', message: 'Recovery link token has expired.' });
      return;
    }

    res.status(200).json({
      valid: true,
      recoveryCaseId: link.recovery_case_id,
      merchantId: link.merchant_id,
      orderId: link.order_id,
      expiresAt: link.expires_at,
      usedAt: link.used_at
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Resolve Token Error', message: err.message });
  }
}
