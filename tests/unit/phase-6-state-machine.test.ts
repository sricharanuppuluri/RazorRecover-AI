import { describe, it } from 'node:test';
import assert from 'node:assert';
import { RecoveryStateMachine, RecoveryTransitionService } from '@razorrecover/recovery-engine';
import { CaseStatus } from '@razorrecover/shared-types';

describe('Phase 6: Recovery State Machine', () => {
  it('1. NEW -> DETECTED transition should be valid', () => {
    const res = RecoveryStateMachine.validateTransition({
      recoveryCaseId: 'rc_01',
      merchantId: 'mch_01',
      currentState: 'NEW',
      targetState: 'DETECTED',
      triggerEvent: 'CASE_CREATED',
      actorType: 'system',
      correlationId: 'corr_01'
    });
    assert.strictEqual(res.valid, true);
  });

  it('2. DETECTED -> DIAGNOSING transition should be valid', () => {
    const res = RecoveryStateMachine.validateTransition({
      recoveryCaseId: 'rc_01',
      merchantId: 'mch_01',
      currentState: 'DETECTED',
      targetState: 'DIAGNOSING',
      triggerEvent: 'START_DIAGNOSIS',
      actorType: 'system',
      correlationId: 'corr_01'
    });
    assert.strictEqual(res.valid, true);
  });

  it('3. DIAGNOSING -> SCORED transition should be valid', () => {
    const res = RecoveryStateMachine.validateTransition({
      recoveryCaseId: 'rc_01',
      merchantId: 'mch_01',
      currentState: 'DIAGNOSING',
      targetState: 'SCORED',
      triggerEvent: 'ANALYSIS_COMPLETE',
      actorType: 'system',
      correlationId: 'corr_01'
    });
    assert.strictEqual(res.valid, true);
  });

  it('4. SCORED -> AI_RECOMMENDED transition should be valid', () => {
    const res = RecoveryStateMachine.validateTransition({
      recoveryCaseId: 'rc_01',
      merchantId: 'mch_01',
      currentState: 'SCORED',
      targetState: 'AI_RECOMMENDED',
      triggerEvent: 'AI_PROMPT_GENERATED',
      actorType: 'ai',
      correlationId: 'corr_01'
    });
    assert.strictEqual(res.valid, true);
  });

  it('5. AI_RECOMMENDED -> POLICY_CHECK transition should be valid', () => {
    const res = RecoveryStateMachine.validateTransition({
      recoveryCaseId: 'rc_01',
      merchantId: 'mch_01',
      currentState: 'AI_RECOMMENDED',
      targetState: 'POLICY_CHECK',
      triggerEvent: 'POLICY_EVALUATION',
      actorType: 'system',
      correlationId: 'corr_01'
    });
    assert.strictEqual(res.valid, true);
  });

  it('6. POLICY_CHECK -> STOPPED (DENIED) transition should be valid', () => {
    const res = RecoveryStateMachine.validateTransition({
      recoveryCaseId: 'rc_01',
      merchantId: 'mch_01',
      currentState: 'POLICY_CHECK',
      targetState: 'STOPPED',
      triggerEvent: 'POLICY_DENIED',
      actorType: 'system',
      correlationId: 'corr_01'
    });
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.terminal, true);
  });

  it('7. POLICY_CHECK -> HUMAN_REVIEW (HUMAN_REQUIRED) transition should be valid', () => {
    const res = RecoveryStateMachine.validateTransition({
      recoveryCaseId: 'rc_01',
      merchantId: 'mch_01',
      currentState: 'POLICY_CHECK',
      targetState: 'HUMAN_REVIEW',
      triggerEvent: 'HIGH_VALUE_ESCALATION',
      actorType: 'system',
      correlationId: 'corr_01'
    });
    assert.strictEqual(res.valid, true);
  });

  it('8. POLICY_CHECK -> ACTION_PENDING (APPROVED) transition should be valid', () => {
    const res = RecoveryStateMachine.validateTransition({
      recoveryCaseId: 'rc_01',
      merchantId: 'mch_01',
      currentState: 'POLICY_CHECK',
      targetState: 'ACTION_PENDING',
      triggerEvent: 'POLICY_APPROVED',
      actorType: 'system',
      correlationId: 'corr_01'
    });
    assert.strictEqual(res.valid, true);
  });

  it('9. ACTION_PENDING -> ACTION_SENT transition should be valid', () => {
    const res = RecoveryStateMachine.validateTransition({
      recoveryCaseId: 'rc_01',
      merchantId: 'mch_01',
      currentState: 'ACTION_PENDING',
      targetState: 'ACTION_SENT',
      triggerEvent: 'ACTION_DISPATCHED',
      actorType: 'system',
      correlationId: 'corr_01'
    });
    assert.strictEqual(res.valid, true);
  });

  it('10. ACTION_SENT -> WAITING_FOR_OUTCOME transition should be valid', () => {
    const res = RecoveryStateMachine.validateTransition({
      recoveryCaseId: 'rc_01',
      merchantId: 'mch_01',
      currentState: 'ACTION_SENT',
      targetState: 'WAITING_FOR_OUTCOME',
      triggerEvent: 'AWAITING_CUSTOMER',
      actorType: 'system',
      correlationId: 'corr_01'
    });
    assert.strictEqual(res.valid, true);
  });

  it('11. WAITING_FOR_OUTCOME -> RECOVERED transition should be valid', () => {
    const res = RecoveryStateMachine.validateTransition({
      recoveryCaseId: 'rc_01',
      merchantId: 'mch_01',
      currentState: 'WAITING_FOR_OUTCOME',
      targetState: 'RECOVERED',
      triggerEvent: 'PAYMENT_CAPTURED',
      actorType: 'system',
      correlationId: 'corr_01'
    });
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.terminal, true);
  });

  it('12. WAITING_FOR_OUTCOME -> FAILED transition should be valid', () => {
    const res = RecoveryStateMachine.validateTransition({
      recoveryCaseId: 'rc_01',
      merchantId: 'mch_01',
      currentState: 'WAITING_FOR_OUTCOME',
      targetState: 'FAILED',
      triggerEvent: 'ATTEMPT_FAILED',
      actorType: 'system',
      correlationId: 'corr_01'
    });
    assert.strictEqual(res.valid, true);
  });

  it('13. FAILED -> ACTION_PENDING (retry allowed) transition should be valid', () => {
    const res = RecoveryStateMachine.validateTransition({
      recoveryCaseId: 'rc_01',
      merchantId: 'mch_01',
      currentState: 'FAILED',
      targetState: 'ACTION_PENDING',
      triggerEvent: 'SCHEDULE_RETRY',
      actorType: 'system',
      correlationId: 'corr_01'
    });
    assert.strictEqual(res.valid, true);
  });

  it('14. FAILED -> STOPPED (retry limit reached) transition should be valid', () => {
    const res = RecoveryStateMachine.validateTransition({
      recoveryCaseId: 'rc_01',
      merchantId: 'mch_01',
      currentState: 'FAILED',
      targetState: 'STOPPED',
      triggerEvent: 'RETRY_LIMIT_EXCEEDED',
      actorType: 'system',
      correlationId: 'corr_01'
    });
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.terminal, true);
  });

  it('15. Expiry -> STOPPED from active state should be valid', () => {
    const res = RecoveryStateMachine.validateTransition({
      recoveryCaseId: 'rc_01',
      merchantId: 'mch_01',
      currentState: 'WAITING_FOR_OUTCOME',
      targetState: 'STOPPED',
      triggerEvent: 'CASE_EXPIRED',
      actorType: 'system',
      correlationId: 'corr_01'
    });
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.terminal, true);
  });

  it('16. Trusted successful payment from any active state -> RECOVERED should be valid', () => {
    const activeStates: CaseStatus[] = ['NEW', 'DETECTED', 'DIAGNOSING', 'SCORED', 'AI_RECOMMENDED', 'POLICY_CHECK', 'HUMAN_REVIEW', 'ACTION_PENDING', 'ACTION_SENT', 'WAITING_FOR_OUTCOME', 'FAILED'];

    for (const state of activeStates) {
      const res = RecoveryStateMachine.validateTransition({
        recoveryCaseId: 'rc_01',
        merchantId: 'mch_01',
        currentState: state,
        targetState: 'RECOVERED',
        triggerEvent: 'PAYMENT_CAPTURED_WEBHOOK',
        actorType: 'system',
        correlationId: 'corr_01'
      });
      assert.strictEqual(res.valid, true, `Transition from ${state} to RECOVERED should be valid.`);
    }
  });

  it('17. Rejects transition out of terminal state RECOVERED or STOPPED', () => {
    const res1 = RecoveryStateMachine.validateTransition({
      recoveryCaseId: 'rc_01',
      merchantId: 'mch_01',
      currentState: 'RECOVERED',
      targetState: 'ACTION_PENDING',
      triggerEvent: 'STALE_RETRY',
      actorType: 'system',
      correlationId: 'corr_01'
    });
    assert.strictEqual(res1.valid, false);

    const res2 = RecoveryStateMachine.validateTransition({
      recoveryCaseId: 'rc_01',
      merchantId: 'mch_01',
      currentState: 'STOPPED',
      targetState: 'ACTION_SENT',
      triggerEvent: 'RETRY_AFTER_STOP',
      actorType: 'system',
      correlationId: 'corr_01'
    });
    assert.strictEqual(res2.valid, false);
  });

  it('18. Rejects arbitrary invalid transitions (e.g. NEW -> WAITING_FOR_OUTCOME)', () => {
    const res = RecoveryStateMachine.validateTransition({
      recoveryCaseId: 'rc_01',
      merchantId: 'mch_01',
      currentState: 'NEW',
      targetState: 'WAITING_FOR_OUTCOME',
      triggerEvent: 'SKIPPED_STEPS',
      actorType: 'system',
      correlationId: 'corr_01'
    });
    assert.strictEqual(res.valid, false);
  });

  it('19. Process transition generates correct outcome payload', () => {
    const outcome = RecoveryTransitionService.processTransition({
      recoveryCaseId: 'rc_99',
      merchantId: 'mch_01',
      currentState: 'ACTION_PENDING',
      targetState: 'ACTION_SENT',
      triggerEvent: 'ACTION_DISPATCH',
      actorType: 'system',
      correlationId: 'corr_test_99'
    });

    assert.strictEqual(outcome.success, true);
    assert.strictEqual(outcome.previousState, 'ACTION_PENDING');
    assert.strictEqual(outcome.newState, 'ACTION_SENT');
    assert.strictEqual(outcome.correlationId, 'corr_test_99');
  });
});
