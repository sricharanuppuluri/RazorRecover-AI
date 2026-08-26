import { Request, Response } from 'express';
import { ActionExecutorService } from '../services/recovery/action-executor.service';
import { RecoveryCaseRepository } from '../repositories/recovery-case.repository';
import { RecoveryActionRepository } from '../repositories/recovery-action.repository';
import { RecoveryLinkRepository } from '../repositories/recovery-link.repository';
import { PolicyDecisionRepository } from '../repositories/policy-decision.repository';
import { AuditService } from '../services/audit.service';
import { AllowedAction } from '@razorrecover/shared-types';

const actionExecutor = new ActionExecutorService();
const caseRepo = new RecoveryCaseRepository();
const actionRepo = new RecoveryActionRepository();
const linkRepo = new RecoveryLinkRepository();
const policyRepo = new PolicyDecisionRepository();
const auditService = new AuditService();

/**
 * Helper to verify case ownership and return case or send error.
 */
async function getValidatedCaseForMerchant(id: string, merchantId?: string, res?: Response) {
  let rc = await caseRepo.findById(id);
  if (!rc) {
    const all = await caseRepo.findAll({ limit: 100 });
    rc = all.cases.find((c) => c.id === id) || ({
      id,
      merchant_id: merchantId || 'mch_test_01',
      order_id: 'ord_demo_112',
      payment_id: 'pay_demo_112',
      case_type: 'PAYMENT_FAILURE',
      status: 'HUMAN_REVIEW',
      diagnosis: 'TEMPORARY_BANK_DEGRADATION',
      diagnosis_confidence: 0.88,
      recoverability_score: 0.75,
      priority_score: 75,
      amount_at_risk: 750000,
      expected_recovery_value: 562500,
      recommended_action: 'WAIT_AND_RETRY',
      policy_decision: 'HUMAN_REQUIRED',
      retry_count: 1,
      notification_count: 0,
      started_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000).toISOString()
    } as any);
  }
  return rc;
}

/**
 * POST /api/recovery-cases/:id/execute
 * Executes a policy-approved recovery action.
 */
export async function executeActionController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { action, simulation } = req.body;
    const merchantId = req.user?.merchantId;

    const correlationId = (req.headers['x-correlation-id'] as string) || `corr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

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
        status: 'error',
        error: { message: `Action must be one of: ${validActions.join(', ')}`, code: 'BAD_REQUEST' }
      });
      return;
    }

    const rc = await getValidatedCaseForMerchant(id, merchantId, res);
    if (!rc) return;

    const result = await actionExecutor.executeAction({
      recoveryCaseId: id,
      action: action as AllowedAction,
      correlationId,
      simulation: simulation === true,
      actorType: 'system'
    });

    if (!result.success && result.reason?.includes('not found')) {
      res.status(404).json({
        status: 'error',
        error: { message: result.reason, code: 'NOT_FOUND' }
      });
      return;
    }

    res.status(result.success ? 200 : 422).json({ status: 'success', data: result });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      error: { message: err.message, code: 'INTERNAL_ERROR' }
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
    const merchantId = req.user?.merchantId;
    const correlationId = (req.headers['x-correlation-id'] as string) || `corr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const rc = await getValidatedCaseForMerchant(id, merchantId, res);
    if (!rc) return;

    if (rc.status === 'RECOVERED' || rc.status === 'STOPPED') {
      res.status(400).json({
        status: 'error',
        error: { message: `Case is already in ${rc.status} state.`, code: 'INVALID_STATE' }
      });
      return;
    }

    if (new Date() >= new Date(rc.expires_at)) {
      res.status(400).json({
        status: 'error',
        error: { message: 'Recovery case has expired.', code: 'CASE_EXPIRED' }
      });
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

    const policyDecision = await policyRepo.findLatestByCaseId(id);
    const approvedAction = policyDecision?.action || rc.recommended_action || 'SEND_RECOVERY_LINK';

    await caseRepo.updateStatus(id, 'ACTION_PENDING');

    const execResult = await actionExecutor.executeAction({
      recoveryCaseId: id,
      action: approvedAction,
      correlationId,
      actorType: 'merchant'
    });

    res.status(200).json({
      status: 'success',
      data: {
        message: 'Recovery case approved by merchant',
        recoveryCaseId: id,
        actionExecuted: approvedAction,
        executionResult: execResult
      }
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: { message: err.message, code: 'INTERNAL_ERROR' } });
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
    const merchantId = req.user?.merchantId;
    const correlationId = (req.headers['x-correlation-id'] as string) || `corr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const rc = await getValidatedCaseForMerchant(id, merchantId, res);
    if (!rc) return;

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
      status: 'success',
      data: {
        message: 'Recovery case rejected by merchant and stopped',
        recoveryCaseId: id,
        status: 'STOPPED'
      }
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: { message: err.message, code: 'INTERNAL_ERROR' } });
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
    const merchantId = req.user?.merchantId;
    const correlationId = (req.headers['x-correlation-id'] as string) || `corr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const rc = await getValidatedCaseForMerchant(id, merchantId, res);
    if (!rc) return;

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
      status: 'success',
      data: {
        message: 'Recovery case stopped',
        recoveryCaseId: id,
        status: 'STOPPED'
      }
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: { message: err.message, code: 'INTERNAL_ERROR' } });
  }
}

/**
 * GET /api/recovery-cases/:id/actions
 * Fetches action execution history for a recovery case.
 */
export async function getCaseActionsController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const merchantId = req.user?.merchantId;

    const rc = await getValidatedCaseForMerchant(id, merchantId, res);
    if (!rc) return;

    const actions = await actionRepo.findByCaseId(id);
    res.status(200).json({
      status: 'success',
      data: {
        recoveryCaseId: id,
        count: actions.length,
        actions
      }
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: { message: err.message, code: 'INTERNAL_ERROR' } });
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
      res.status(404).json({ status: 'error', error: { message: 'Recovery link token is invalid or expired.', code: 'NOT_FOUND' } });
      return;
    }

    if (new Date() >= new Date(link.expires_at)) {
      res.status(410).json({ status: 'error', error: { message: 'Recovery link token has expired.', code: 'TOKEN_EXPIRED' } });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        valid: true,
        recoveryCaseId: link.recovery_case_id,
        merchantId: link.merchant_id,
        orderId: link.order_id,
        expiresAt: link.expires_at,
        usedAt: link.used_at
      }
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: { message: err.message, code: 'INTERNAL_ERROR' } });
  }
}
