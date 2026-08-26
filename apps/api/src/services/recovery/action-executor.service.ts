import {
  AllowedAction,
  RecoveryCase,
  PolicyDecision,
  RecoveryAction,
  RecoveryActionStatus,
  CaseStatus
} from '@razorrecover/shared-types';
import { RecoveryStateMachine, RecoveryTransitionService } from '@razorrecover/recovery-engine';
import { RecoveryCaseRepository } from '../../repositories/recovery-case.repository';
import { PolicyDecisionRepository } from '../../repositories/policy-decision.repository';
import { RecoveryActionRepository } from '../../repositories/recovery-action.repository';
import { RecoveryLinkRepository } from '../../repositories/recovery-link.repository';
import { NotificationProvider, MockNotificationProvider } from '../notifications/notification-provider';
import { AuditService } from '../audit.service';
import { OrderRepository } from '../../repositories/order.repository';
import { PaymentRepository } from '../../repositories/payment.repository';
import { CustomerRepository } from '../../repositories/customer.repository';
import { PolicyEngine } from '@razorrecover/policy-engine';

export interface ExecuteActionInput {
  recoveryCaseId: string;
  action: AllowedAction;
  correlationId: string;
  idempotencyKey?: string;
  simulation?: boolean;
  actorType?: 'system' | 'ai' | 'merchant' | 'customer';
  actorId?: string;
}

export interface ExecuteActionResult {
  success: boolean;
  recoveryCaseId: string;
  action: AllowedAction;
  actionStatus: RecoveryActionStatus;
  actionId?: string;
  workflowState: CaseStatus;
  reason?: string;
  simulation: boolean;
  recoveryUrl?: string;
  correlationId: string;
}

export class ActionExecutorService {
  private caseRepo: RecoveryCaseRepository;
  private policyRepo: PolicyDecisionRepository;
  private actionRepo: RecoveryActionRepository;
  private linkRepo: RecoveryLinkRepository;
  private orderRepo: OrderRepository;
  private paymentRepo: PaymentRepository;
  private customerRepo: CustomerRepository;
  private notificationProvider: NotificationProvider;
  private auditService: AuditService;

  constructor(
    caseRepo?: RecoveryCaseRepository,
    policyRepo?: PolicyDecisionRepository,
    actionRepo?: RecoveryActionRepository,
    linkRepo?: RecoveryLinkRepository,
    notificationProvider?: NotificationProvider,
    auditService?: AuditService,
    orderRepo?: OrderRepository,
    paymentRepo?: PaymentRepository,
    customerRepo?: CustomerRepository
  ) {
    this.caseRepo = caseRepo || new RecoveryCaseRepository();
    this.policyRepo = policyRepo || new PolicyDecisionRepository();
    this.actionRepo = actionRepo || new RecoveryActionRepository();
    this.linkRepo = linkRepo || new RecoveryLinkRepository();
    this.notificationProvider = notificationProvider || new MockNotificationProvider();
    this.auditService = auditService || new AuditService();
    this.orderRepo = orderRepo || new OrderRepository();
    this.paymentRepo = paymentRepo || new PaymentRepository();
    this.customerRepo = customerRepo || new CustomerRepository();
  }

  public getNotificationProvider(): NotificationProvider {
    return this.notificationProvider;
  }

  /**
   * Executes a bounded, policy-approved recovery action.
   */
  public async executeAction(input: ExecuteActionInput): Promise<ExecuteActionResult> {
    const { recoveryCaseId, action, correlationId, simulation = false, actorType = 'system', actorId } = input;

    // 1. Fetch Recovery Case
    const recoveryCase = await this.caseRepo.findById(recoveryCaseId);
    if (!recoveryCase) {
      return this.rejectExecution(recoveryCaseId, action, 'Recovery case not found', correlationId, simulation);
    }

    // 2. Fetch Order & Payment to confirm current trusted payment status
    const order = await this.orderRepo.findById(recoveryCase.order_id);
    const payment = recoveryCase.payment_id ? await this.paymentRepo.findById(recoveryCase.payment_id) : null;

    // CRITICAL SAFETY CHECK 1: Never execute action if payment is already captured or order paid
    if (order?.status === 'PAID' || payment?.status === 'CAPTURED') {
      await this.handleAlreadyPaidRaceCondition(recoveryCase, order, payment, correlationId);
      return this.rejectExecution(recoveryCaseId, action, 'Payment is already captured / order paid. Action cancelled.', correlationId, simulation, 'RECOVERED');
    }

    // CRITICAL SAFETY CHECK 2: Case status must not be terminal (RECOVERED or STOPPED)
    if (RecoveryStateMachine.isTerminal(recoveryCase.status)) {
      return this.rejectExecution(recoveryCaseId, action, `Cannot execute action on terminal case state ${recoveryCase.status}`, correlationId, simulation, recoveryCase.status);
    }

    // CRITICAL SAFETY CHECK 3: Verify case has not expired
    const now = new Date();
    const expiresAt = new Date(recoveryCase.expires_at);
    if (now >= expiresAt) {
      await this.stopCase(recoveryCase, 'CASE_EXPIRED', correlationId);
      return this.rejectExecution(recoveryCaseId, action, 'Recovery window expired. Case stopped.', correlationId, simulation, 'STOPPED');
    }

    // 3. Fetch latest Policy Decision
    const policyDecision = await this.policyRepo.findLatestByCaseId(recoveryCaseId);
    if (!policyDecision) {
      return this.rejectExecution(recoveryCaseId, action, 'No policy decision found for recovery case', correlationId, simulation);
    }

    // CRITICAL SAFETY CHECK 4: Policy MUST allow the decision
    if (!policyDecision.allowed) {
      await this.stopCase(recoveryCase, 'POLICY_DENIED', correlationId);
      return this.rejectExecution(recoveryCaseId, action, `Policy Engine explicitly denied execution: ${policyDecision.reasons.join(', ')}`, correlationId, simulation, 'STOPPED');
    }

    // CRITICAL SAFETY CHECK 5: Action MUST match approved action in policy decision
    if (policyDecision.action !== action && action !== 'STOP' && action !== 'ESCALATE_HUMAN') {
      return this.rejectExecution(
        recoveryCaseId,
        action,
        `Requested action ${action} does not match policy approved action ${policyDecision.action}`,
        correlationId,
        simulation
      );
    }

    // CRITICAL SAFETY CHECK 6: High-value / Human-required case guard
    if (policyDecision.requires_human && recoveryCase.status !== 'HUMAN_REVIEW' && actorType !== 'merchant') {
      await this.escalateToHuman(recoveryCase, 'Policy requires human review before action execution', correlationId);
      return this.rejectExecution(recoveryCaseId, action, 'High-value or high-risk case requires human review', correlationId, simulation, 'HUMAN_REVIEW');
    }

    // CRITICAL SAFETY CHECK 7: Customer Opt-In check for notification actions
    const customer = await this.customerRepo.findById(order?.customer_id || '');
    const isNotificationAction = ['SEND_REMINDER', 'SEND_RECOVERY_LINK', 'OFFER_ALTERNATE_PAYMENT'].includes(action);
    if (isNotificationAction && customer && !customer.contact_opt_in) {
      await this.stopCase(recoveryCase, 'CUSTOMER_OPTED_OUT', correlationId);
      return this.rejectExecution(recoveryCaseId, action, 'Customer has opted out of notifications. Case stopped.', correlationId, simulation, 'STOPPED');
    }

    // CRITICAL SAFETY CHECK 8: Concurrency & Idempotency Key check
    const attemptNumber = (recoveryCase.retry_count || 0) + (recoveryCase.notification_count || 0) + 1;
    const idempotencyKey = input.idempotencyKey || correlationId || `${recoveryCaseId}_${action}_att${attemptNumber}`;
    const existingAction = await this.actionRepo.findByIdempotencyKey(idempotencyKey);
    if (existingAction) {
      return {
        success: existingAction.status === 'SUCCEEDED',
        recoveryCaseId,
        action,
        actionStatus: existingAction.status,
        actionId: existingAction.id,
        workflowState: recoveryCase.status,
        reason: 'Duplicate request satisfied via idempotency key.',
        simulation: existingAction.simulation || false,
        correlationId
      };
    }

    // Check if there is already a running action for this case
    const existingActions = await this.actionRepo.findByCaseId(recoveryCaseId);
    const hasRunningAction = existingActions.some(a => a.status === 'RUNNING' || a.status === 'PENDING');
    if (hasRunningAction) {
      return this.rejectExecution(recoveryCaseId, action, 'Concurrent action is already executing for this recovery case.', correlationId, simulation);
    }

    // 4. Create Durable Action Record in PENDING state
    let actionRecord: RecoveryAction;
    try {
      actionRecord = await this.actionRepo.createAction({
        recovery_case_id: recoveryCaseId,
        merchant_id: recoveryCase.merchant_id,
        action_type: action,
        status: 'PENDING',
        correlation_id: correlationId,
        idempotency_key: idempotencyKey,
        attempt_number: attemptNumber,
        expires_at: recoveryCase.expires_at,
        simulation
      });
    } catch (err) {
      return this.rejectExecution(recoveryCaseId, action, `Failed to create durable action record: ${(err as Error).message}`, correlationId, simulation);
    }

    // Audit ACTION_REQUESTED
    await this.auditService.logEvent({
      merchantId: recoveryCase.merchant_id,
      recoveryCaseId: recoveryCaseId,
      eventType: 'ACTION_REQUESTED',
      actorType: actorType,
      actorId: actorId,
      action: action,
      inputSummary: `Executing ${action} (attempt ${attemptNumber})`,
      decisionSummary: `Policy approved: ${policyDecision.allowed}`,
      policyResult: policyDecision.allowed ? 'APPROVED' : 'DENIED',
      correlationId: correlationId
    });

    // 5. Execute Action based on Action Type
    await this.actionRepo.updateActionStatus(actionRecord.id, 'RUNNING', { startedAt: new Date().toISOString() });

    try {
      let result: { success: boolean; recoveryUrl?: string; summary?: string; errorCode?: string; errorMessage?: string };

      switch (action) {
        case 'WAIT_AND_RETRY':
          result = await this.handleWaitAndRetry(recoveryCase, actionRecord, correlationId, simulation);
          break;
        case 'OFFER_ALTERNATE_PAYMENT':
          result = await this.handleOfferAlternatePayment(recoveryCase, actionRecord, correlationId, simulation);
          break;
        case 'SEND_RECOVERY_LINK':
          result = await this.handleSendRecoveryLink(recoveryCase, customer?.id || '', actionRecord, correlationId, simulation);
          break;
        case 'SEND_REMINDER':
          result = await this.handleSendReminder(recoveryCase, customer?.id || '', actionRecord, correlationId, simulation);
          break;
        case 'ESCALATE_HUMAN':
          result = await this.handleEscalateHuman(recoveryCase, correlationId);
          break;
        case 'STOP':
          result = await this.handleStop(recoveryCase, correlationId);
          break;
        default:
          result = { success: false, errorCode: 'INVALID_ACTION', errorMessage: `Unsupported action type: ${action}` };
      }

      if (result.success) {
        await this.actionRepo.updateActionStatus(actionRecord.id, 'SUCCEEDED', {
          completedAt: new Date().toISOString(),
          resultSummary: result.summary || `Action ${action} succeeded`
        });

        await this.auditService.logEvent({
          merchantId: recoveryCase.merchant_id,
          recoveryCaseId: recoveryCaseId,
          eventType: 'ACTION_SUCCEEDED',
          actorType: actorType,
          actorId: actorId,
          action: action,
          outcome: 'SUCCEEDED',
          decisionSummary: result.summary,
          correlationId: correlationId
        });

        // Re-fetch updated case status
        const updatedCase = await this.caseRepo.findById(recoveryCaseId);

        return {
          success: true,
          recoveryCaseId,
          action,
          actionStatus: 'SUCCEEDED',
          actionId: actionRecord.id,
          workflowState: updatedCase?.status || recoveryCase.status,
          recoveryUrl: result.recoveryUrl,
          simulation,
          correlationId
        };
      } else {
        await this.actionRepo.updateActionStatus(actionRecord.id, 'FAILED', {
          completedAt: new Date().toISOString(),
          errorCode: result.errorCode || 'EXECUTION_FAILED',
          errorMessage: result.errorMessage || 'Action execution failed'
        });

        await this.auditService.logEvent({
          merchantId: recoveryCase.merchant_id,
          recoveryCaseId: recoveryCaseId,
          eventType: 'ACTION_FAILED',
          actorType: actorType,
          actorId: actorId,
          action: action,
          outcome: 'FAILED',
          decisionSummary: result.errorMessage,
          correlationId: correlationId
        });

        // Transition workflow to FAILED or STOPPED
        await this.handleActionFailureTransition(recoveryCase, correlationId);
        const updatedCase = await this.caseRepo.findById(recoveryCaseId);

        return {
          success: false,
          recoveryCaseId,
          action,
          actionStatus: 'FAILED',
          actionId: actionRecord.id,
          workflowState: updatedCase?.status || 'FAILED',
          reason: result.errorMessage,
          simulation,
          correlationId
        };
      }
    } catch (err) {
      const errorMsg = (err as Error).message;
      await this.actionRepo.updateActionStatus(actionRecord.id, 'FAILED', {
        completedAt: new Date().toISOString(),
        errorCode: 'UNHANDLED_ERROR',
        errorMessage: errorMsg
      });
      await this.handleActionFailureTransition(recoveryCase, correlationId);

      return {
        success: false,
        recoveryCaseId,
        action,
        actionStatus: 'FAILED',
        actionId: actionRecord.id,
        workflowState: 'FAILED',
        reason: errorMsg,
        simulation,
        correlationId
      };
    }
  }

  // --- ACTION HANDLERS ---

  private async handleWaitAndRetry(
    recoveryCase: RecoveryCase,
    actionRecord: RecoveryAction,
    correlationId: string,
    simulation: boolean
  ): Promise<{ success: boolean; summary?: string; errorCode?: string; errorMessage?: string }> {
    // 1. Transition case state: POLICY_CHECK / ACTION_PENDING -> ACTION_SENT -> WAITING_FOR_OUTCOME
    await this.transitionCaseState(recoveryCase, 'ACTION_SENT', 'Retry operation scheduled', correlationId);
    await this.transitionCaseState(recoveryCase, 'WAITING_FOR_OUTCOME', 'Awaiting retry outcome', correlationId);

    // 2. Increment retry count
    await this.caseRepo.incrementRetryCount(recoveryCase.id);

    return {
      success: true,
      summary: simulation ? '[Simulation] Bounded payment retry scheduled successfully.' : 'Payment retry scheduled server-side.'
    };
  }

  private async handleOfferAlternatePayment(
    recoveryCase: RecoveryCase,
    actionRecord: RecoveryAction,
    correlationId: string,
    simulation: boolean
  ): Promise<{ success: boolean; recoveryUrl?: string; summary?: string; errorCode?: string; errorMessage?: string }> {
    // Generate recovery checkout link
    const { link, rawToken } = await this.linkRepo.createRecoveryLink({
      recoveryCaseId: recoveryCase.id,
      merchantId: recoveryCase.merchant_id,
      orderId: recoveryCase.order_id,
      expiryHours: 24
    });

    const recoveryUrl = `/checkout/recovery?token=${rawToken}&case=${recoveryCase.id}`;

    // Transition state
    await this.transitionCaseState(recoveryCase, 'ACTION_SENT', 'Alternate payment offer created', correlationId);
    await this.transitionCaseState(recoveryCase, 'WAITING_FOR_OUTCOME', 'Awaiting alternate payment outcome', correlationId);

    // Increment notification count
    await this.caseRepo.incrementNotificationCount(recoveryCase.id);

    return {
      success: true,
      recoveryUrl,
      summary: simulation ? '[Simulation] Alternate payment link created successfully.' : 'Alternate payment link generated.'
    };
  }

  private async handleSendRecoveryLink(
    recoveryCase: RecoveryCase,
    customerId: string,
    actionRecord: RecoveryAction,
    correlationId: string,
    simulation: boolean
  ): Promise<{ success: boolean; recoveryUrl?: string; summary?: string; errorCode?: string; errorMessage?: string }> {
    const { link, rawToken } = await this.linkRepo.createRecoveryLink({
      recoveryCaseId: recoveryCase.id,
      merchantId: recoveryCase.merchant_id,
      orderId: recoveryCase.order_id,
      expiryHours: 24
    });

    const recoveryUrl = `/checkout/recovery?token=${rawToken}&case=${recoveryCase.id}`;

    // Dispatch notification
    const notifResult = await this.notificationProvider.sendRecoveryMessage({
      merchantId: recoveryCase.merchant_id,
      customerId: customerId || 'cust_unknown',
      recoveryCaseId: recoveryCase.id,
      channel: 'email',
      messageType: 'RECOVERY_LINK',
      recoveryUrl,
      correlationId
    });

    if (!notifResult.success) {
      return {
        success: false,
        errorCode: 'NOTIFICATION_DISPATCH_FAILED',
        errorMessage: notifResult.error || 'Failed to dispatch recovery link notification'
      };
    }

    await this.caseRepo.incrementNotificationCount(recoveryCase.id);
    await this.transitionCaseState(recoveryCase, 'ACTION_SENT', 'Recovery link notification sent', correlationId);
    await this.transitionCaseState(recoveryCase, 'WAITING_FOR_OUTCOME', 'Awaiting customer response to recovery link', correlationId);

    return {
      success: true,
      recoveryUrl,
      summary: simulation ? '[Simulation] Recovery link notification sent successfully.' : `Recovery link sent (Notif ID: ${notifResult.notificationId})`
    };
  }

  private async handleSendReminder(
    recoveryCase: RecoveryCase,
    customerId: string,
    actionRecord: RecoveryAction,
    correlationId: string,
    simulation: boolean
  ): Promise<{ success: boolean; summary?: string; errorCode?: string; errorMessage?: string }> {
    const notifResult = await this.notificationProvider.sendRecoveryMessage({
      merchantId: recoveryCase.merchant_id,
      customerId: customerId || 'cust_unknown',
      recoveryCaseId: recoveryCase.id,
      channel: 'email',
      messageType: 'PAYMENT_REMINDER',
      correlationId
    });

    if (!notifResult.success) {
      return {
        success: false,
        errorCode: 'REMINDER_DISPATCH_FAILED',
        errorMessage: notifResult.error || 'Failed to dispatch payment reminder notification'
      };
    }

    await this.caseRepo.incrementNotificationCount(recoveryCase.id);
    await this.transitionCaseState(recoveryCase, 'ACTION_SENT', 'Payment reminder sent', correlationId);
    await this.transitionCaseState(recoveryCase, 'WAITING_FOR_OUTCOME', 'Awaiting customer response to reminder', correlationId);

    return {
      success: true,
      summary: simulation ? '[Simulation] Payment reminder notification sent successfully.' : `Reminder sent (Notif ID: ${notifResult.notificationId})`
    };
  }

  private async handleEscalateHuman(
    recoveryCase: RecoveryCase,
    correlationId: string
  ): Promise<{ success: boolean; summary?: string }> {
    await this.escalateToHuman(recoveryCase, 'Manual or policy escalation requested', correlationId);
    return {
      success: true,
      summary: 'Recovery case escalated to HUMAN_REVIEW state.'
    };
  }

  private async handleStop(
    recoveryCase: RecoveryCase,
    correlationId: string
  ): Promise<{ success: boolean; summary?: string }> {
    await this.stopCase(recoveryCase, 'POLICY_OR_MANUAL_STOP', correlationId);
    return {
      success: true,
      summary: 'Recovery case transitioned to STOPPED state.'
    };
  }

  // --- UTILITIES & RACE CONDITION HANDLERS ---

  private async handleAlreadyPaidRaceCondition(
    recoveryCase: RecoveryCase,
    order: any,
    payment: any,
    correlationId: string
  ): Promise<void> {
    const recoveredAmount = payment?.amount || order?.amount || recoveryCase.amount_at_risk;
    await this.caseRepo.updateStatus(recoveryCase.id, 'RECOVERED', {
      closedAt: new Date().toISOString(),
      closeReason: 'PAYMENT_CAPTURED',
      recoveredAmount
    });

    await this.auditService.logEvent({
      merchantId: recoveryCase.merchant_id,
      recoveryCaseId: recoveryCase.id,
      eventType: 'RECOVERY_CASE_RECOVERED',
      actorType: 'system',
      action: 'RECOVER_CASE',
      outcome: 'RECOVERED',
      decisionSummary: `Payment captured during pre-execution check. Case marked RECOVERED.`,
      correlationId: correlationId
    });
  }

  private async handleActionFailureTransition(recoveryCase: RecoveryCase, correlationId: string): Promise<void> {
    const currentCase = await this.caseRepo.findById(recoveryCase.id);
    if (!currentCase || RecoveryStateMachine.isTerminal(currentCase.status)) return;

    // Check if retry is allowed
    const maxRetries = 3;
    if ((currentCase.retry_count || 0) < maxRetries) {
      await this.transitionCaseState(currentCase, 'FAILED', 'Action execution failed', correlationId);
    } else {
      await this.stopCase(currentCase, 'RETRY_LIMIT_EXCEEDED', correlationId);
    }
  }

  private async transitionCaseState(
    recoveryCase: RecoveryCase,
    targetState: CaseStatus,
    reason: string,
    correlationId: string
  ): Promise<void> {
    let currentCase = await this.caseRepo.findById(recoveryCase.id);
    if (!currentCase) return;

    // If starting from POLICY_CHECK or FAILED and target is ACTION_SENT, step through ACTION_PENDING first
    if ((currentCase.status === 'POLICY_CHECK' || currentCase.status === 'FAILED') && targetState === 'ACTION_SENT') {
      await this.transitionCaseState(currentCase, 'ACTION_PENDING', 'Policy check passed; action pending execution', correlationId);
      currentCase = await this.caseRepo.findById(recoveryCase.id);
      if (!currentCase) return;
    }

    const transitionOutcome = RecoveryTransitionService.processTransition({
      recoveryCaseId: currentCase.id,
      merchantId: currentCase.merchant_id,
      currentState: currentCase.status,
      targetState,
      triggerEvent: 'ACTION_EXECUTION_STEP',
      actorType: 'system',
      reason,
      correlationId
    });

    if (transitionOutcome.success) {
      await this.caseRepo.updateStatus(currentCase.id, targetState, {
        closedAt: ['RECOVERED', 'STOPPED'].includes(targetState) ? new Date().toISOString() : undefined,
        closeReason: ['RECOVERED', 'STOPPED'].includes(targetState) ? reason : undefined
      });

      await this.auditService.logEvent({
        merchantId: currentCase.merchant_id,
        recoveryCaseId: currentCase.id,
        eventType: 'RECOVERY_CASE_STATE_CHANGED',
        actorType: 'system',
        action: 'STATE_TRANSITION',
        inputSummary: `From ${currentCase.status} to ${targetState}`,
        decisionSummary: reason,
        outcome: targetState,
        correlationId: correlationId
      });
    }
  }

  private async stopCase(recoveryCase: RecoveryCase, reason: string, correlationId: string): Promise<void> {
    await this.caseRepo.updateStatus(recoveryCase.id, 'STOPPED', {
      closedAt: new Date().toISOString(),
      closeReason: reason
    });

    await this.auditService.logEvent({
      merchantId: recoveryCase.merchant_id,
      recoveryCaseId: recoveryCase.id,
      eventType: 'RECOVERY_CASE_STOPPED',
      actorType: 'system',
      action: 'STOP_RECOVERY',
      outcome: 'STOPPED',
      decisionSummary: `Case stopped: ${reason}`,
      correlationId: correlationId
    });
  }

  private async escalateToHuman(recoveryCase: RecoveryCase, reason: string, correlationId: string): Promise<void> {
    await this.caseRepo.updateStatus(recoveryCase.id, 'HUMAN_REVIEW');

    await this.auditService.logEvent({
      merchantId: recoveryCase.merchant_id,
      recoveryCaseId: recoveryCase.id,
      eventType: 'HUMAN_REVIEW_REQUESTED',
      actorType: 'system',
      action: 'ESCALATE_HUMAN',
      outcome: 'HUMAN_REVIEW',
      decisionSummary: reason,
      correlationId: correlationId
    });
  }

  private rejectExecution(
    recoveryCaseId: string,
    action: AllowedAction,
    reason: string,
    correlationId: string,
    simulation: boolean,
    workflowState: CaseStatus = 'STOPPED'
  ): ExecuteActionResult {
    return {
      success: false,
      recoveryCaseId,
      action,
      actionStatus: 'FAILED',
      workflowState,
      reason,
      simulation,
      correlationId
    };
  }
}
