import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ActionExecutorService } from '../../apps/api/src/services/recovery/action-executor.service';
import { RecoveryCaseRepository } from '../../apps/api/src/repositories/recovery-case.repository';
import { PolicyDecisionRepository } from '../../apps/api/src/repositories/policy-decision.repository';
import { RecoveryActionRepository } from '../../apps/api/src/repositories/recovery-action.repository';
import { RecoveryLinkRepository } from '../../apps/api/src/repositories/recovery-link.repository';
import { MockNotificationProvider } from '../../apps/api/src/services/notifications/notification-provider';
import { AuditService } from '../../apps/api/src/services/audit.service';
import { OrderRepository } from '../../apps/api/src/repositories/order.repository';
import { PaymentRepository } from '../../apps/api/src/repositories/payment.repository';
import { CustomerRepository } from '../../apps/api/src/repositories/customer.repository';
import { AllowedAction } from '@razorrecover/shared-types';

describe('Phase 6: Action Executor & Safety System', () => {
  let caseRepo: RecoveryCaseRepository;
  let policyRepo: PolicyDecisionRepository;
  let actionRepo: RecoveryActionRepository;
  let linkRepo: RecoveryLinkRepository;
  let orderRepo: OrderRepository;
  let paymentRepo: PaymentRepository;
  let customerRepo: CustomerRepository;
  let mockNotif: MockNotificationProvider;
  let auditService: AuditService;
  let executor: ActionExecutorService;

  beforeEach(async () => {
    caseRepo = new RecoveryCaseRepository();
    policyRepo = new PolicyDecisionRepository();
    actionRepo = new RecoveryActionRepository();
    linkRepo = new RecoveryLinkRepository();
    orderRepo = new OrderRepository();
    paymentRepo = new PaymentRepository();
    customerRepo = new CustomerRepository();
    mockNotif = new MockNotificationProvider();
    auditService = new AuditService();

    actionRepo.clearInMemoryStore();
    linkRepo.clearInMemoryStore();
    mockNotif.clearRecords();

    executor = new ActionExecutorService(
      caseRepo,
      policyRepo,
      actionRepo,
      linkRepo,
      mockNotif,
      auditService,
      orderRepo,
      paymentRepo,
      customerRepo
    );
  });

  async function setupMockCase(overrides?: Partial<any>) {
    const cust = await customerRepo.create({
      id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      merchant_id: 'mch_01',
      external_customer_id: 'ext_cust_01',
      contact_opt_in: overrides?.contact_opt_in !== undefined ? overrides.contact_opt_in : true
    });

    const ord = await orderRepo.create({
      id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      merchant_id: 'mch_01',
      customer_id: cust.id,
      amount: overrides?.amount || 500000,
      currency: 'INR',
      status: overrides?.orderStatus || 'ATTEMPTED'
    });

    const pay = await paymentRepo.create({
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      merchant_id: 'mch_01',
      customer_id: cust.id,
      razorpay_order_id: ord.razorpay_order_id,
      amount: ord.amount,
      status: overrides?.paymentStatus || 'FAILED',
      failure_count: 1
    });

    const rc = await caseRepo.create({
      id: `rc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      merchant_id: 'mch_01',
      order_id: ord.id,
      payment_id: pay.id,
      case_type: 'PAYMENT_FAILURE',
      amount_at_risk: ord.amount,
      status: overrides?.caseStatus || 'POLICY_CHECK',
      retry_count: overrides?.retry_count || 0,
      notification_count: overrides?.notification_count || 0,
      expires_at: overrides?.expires_at || new Date(Date.now() + 24 * 3600 * 1000).toISOString()
    });

    if (overrides?.policyAllowed !== false) {
      await policyRepo.saveDecision({
        id: `pd_${Date.now()}`,
        recovery_case_id: rc.id,
        action: overrides?.policyAction || 'SEND_RECOVERY_LINK',
        allowed: overrides?.policyAllowed !== undefined ? overrides.policyAllowed : true,
        reasons: ['Policy approved action'],
        violated_rules: [],
        requires_human: overrides?.requires_human || false,
        policy_version: 'policy-v1',
        created_at: new Date().toISOString()
      });
    } else {
      await policyRepo.saveDecision({
        id: `pd_${Date.now()}`,
        recovery_case_id: rc.id,
        action: overrides?.policyAction || 'STOP',
        allowed: false,
        reasons: ['Policy denied: retry limit reached'],
        violated_rules: ['MAX_RETRIES_EXCEEDED'],
        requires_human: false,
        policy_version: 'policy-v1',
        created_at: new Date().toISOString()
      });
    }

    return { cust, ord, pay, rc };
  }

  it('1. Policy denied -> action NOT executed', async () => {
    const { rc } = await setupMockCase({ policyAllowed: false });

    const result = await executor.executeAction({
      recoveryCaseId: rc.id,
      action: 'WAIT_AND_RETRY',
      correlationId: 'corr_denied'
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.workflowState, 'STOPPED');
    assert.match(result.reason!, /Policy Engine explicitly denied execution/);
  });

  it('2. Policy approved -> action executes successfully', async () => {
    const { rc } = await setupMockCase({ policyAction: 'SEND_RECOVERY_LINK' });

    const result = await executor.executeAction({
      recoveryCaseId: rc.id,
      action: 'SEND_RECOVERY_LINK',
      correlationId: 'corr_approved'
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.actionStatus, 'SUCCEEDED');
    assert.strictEqual(result.workflowState, 'WAITING_FOR_OUTCOME');
    assert.ok(result.recoveryUrl);
  });

  it('3. Captured payment pre-execution check -> cancels action and transitions case to RECOVERED', async () => {
    const { rc } = await setupMockCase({ paymentStatus: 'CAPTURED', orderStatus: 'PAID' });

    const result = await executor.executeAction({
      recoveryCaseId: rc.id,
      action: 'SEND_RECOVERY_LINK',
      correlationId: 'corr_already_captured'
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.workflowState, 'RECOVERED');
    assert.match(result.reason!, /already captured/);

    const updatedCase = await caseRepo.findById(rc.id);
    assert.strictEqual(updatedCase?.status, 'RECOVERED');
  });

  it('4. Expired recovery case -> action NOT executed and case stopped', async () => {
    const expiredTime = new Date(Date.now() - 1000).toISOString();
    const { rc } = await setupMockCase({ expires_at: expiredTime });

    const result = await executor.executeAction({
      recoveryCaseId: rc.id,
      action: 'SEND_RECOVERY_LINK',
      correlationId: 'corr_expired'
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.workflowState, 'STOPPED');
    assert.match(result.reason!, /expired/i);
  });

  it('5. Customer contact_opt_in false -> notification action NOT executed', async () => {
    const { rc } = await setupMockCase({ contact_opt_in: false, policyAction: 'SEND_REMINDER' });

    const result = await executor.executeAction({
      recoveryCaseId: rc.id,
      action: 'SEND_REMINDER',
      correlationId: 'corr_opted_out'
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.workflowState, 'STOPPED');
    assert.match(result.reason!, /opted out/i);
  });

  it('6. High-value human-review required case -> action NOT executed automatically', async () => {
    const { rc } = await setupMockCase({ requires_human: true, policyAction: 'SEND_RECOVERY_LINK' });

    const result = await executor.executeAction({
      recoveryCaseId: rc.id,
      action: 'SEND_RECOVERY_LINK',
      correlationId: 'corr_human_req'
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.workflowState, 'HUMAN_REVIEW');
    assert.match(result.reason!, /human review/i);
  });

  it('7. Duplicate action request -> satisfied via idempotency key without duplicate execution', async () => {
    const { rc } = await setupMockCase({ policyAction: 'WAIT_AND_RETRY' });

    const res1 = await executor.executeAction({
      recoveryCaseId: rc.id,
      action: 'WAIT_AND_RETRY',
      correlationId: 'corr_idemp_1'
    });
    assert.strictEqual(res1.success, true);

    const res2 = await executor.executeAction({
      recoveryCaseId: rc.id,
      action: 'WAIT_AND_RETRY',
      correlationId: 'corr_idemp_1'
    });
    assert.strictEqual(res2.success, true);
    assert.strictEqual(res2.actionId, res1.actionId);
    assert.match(res2.reason!, /idempotency/i);
  });

  it('8. Simulation mode -> sets simulation: true and records execution cleanly', async () => {
    const { rc } = await setupMockCase({ policyAction: 'OFFER_ALTERNATE_PAYMENT' });

    const result = await executor.executeAction({
      recoveryCaseId: rc.id,
      action: 'OFFER_ALTERNATE_PAYMENT',
      correlationId: 'corr_sim',
      simulation: true
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.simulation, true);
  });

  it('9. Action execution success does NOT mean money recovered (case state remains WAITING_FOR_OUTCOME)', async () => {
    const { rc } = await setupMockCase({ policyAction: 'SEND_RECOVERY_LINK' });

    const result = await executor.executeAction({
      recoveryCaseId: rc.id,
      action: 'SEND_RECOVERY_LINK',
      correlationId: 'corr_wait_outcome'
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.workflowState, 'WAITING_FOR_OUTCOME');

    const updatedCase = await caseRepo.findById(rc.id);
    assert.notStrictEqual(updatedCase?.status, 'RECOVERED');
    assert.strictEqual(updatedCase?.recovered_amount, 0);
  });
});
