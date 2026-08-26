import {
  AllowedAction,
  PolicyEvaluationResult,
  PolicyProfile,
  RecoveryAnalysisResult,
  AIDecisionOutput
} from '@razorrecover/shared-types';

export const POLICY_VERSION = 'policy-v1';

export interface PolicyEvaluationInput {
  aiDecision: AIDecisionOutput;
  deterministicAnalysis: RecoveryAnalysisResult;
  merchantPolicy?: Partial<PolicyProfile>;
  customer?: { contact_opt_in?: boolean };
  order?: { status?: string };
  payment?: { status?: string };
  recoveryCase?: {
    status?: string;
    retry_count?: number;
    notification_count?: number;
    expires_at?: string;
  };
}

export const DEFAULT_POLICY_PROFILE: PolicyProfile = {
  id: 'pol_default',
  merchant_id: 'mch_test_01',
  max_retry_attempts: 3,
  max_notifications: 2,
  high_value_threshold: 10000000, // ₹1,00,000 in paise
  min_recovery_probability: 0.20,
  min_ai_confidence: 0.60,
  recovery_window_hours: 24,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

export class PolicyEngine {
  public static readonly VERSION = POLICY_VERSION;

  /**
   * Evaluates deterministic policy rules over an AI recommendation and Phase 4 deterministic context.
   * The Policy Engine is the final authority. The LLM can ONLY recommend; Policy decides ALLOW/DENY/ESCALATE.
   */
  public evaluate(input: PolicyEvaluationInput): PolicyEvaluationResult {
    const {
      aiDecision,
      deterministicAnalysis,
      merchantPolicy = {},
      customer = {},
      order = {},
      payment = {},
      recoveryCase = {}
    } = input;

    const policy: PolicyProfile = { ...DEFAULT_POLICY_PROFILE, ...merchantPolicy };
    const action = aiDecision.recommendedAction;

    // Helper functions for action category
    const isRetryAction = action === 'RETRY' || action === 'WAIT_AND_RETRY';
    const isNotifyAction = action === 'NOTIFY' || action === 'SEND_REMINDER' || action === 'SEND_RECOVERY_LINK';

    // 1. Payment or Order Already Successful -> DENY
    if (
      payment.status === 'CAPTURED' ||
      order.status === 'PAID' ||
      deterministicAnalysis.diagnosis?.category === 'ALREADY_CAPTURED'
    ) {
      return {
        action: 'NO_ACTION',
        allowed: false,
        reasons: ['PAYMENT_ALREADY_CAPTURED'],
        violatedRules: ['RULE_NO_RECOVERY_ON_SUCCESSFUL_PAYMENT'],
        requiresHuman: false,
        policyVersion: POLICY_VERSION
      };
    }

    // 2. Amount at risk <= 0 -> DENY
    if (deterministicAnalysis.amountAtRisk <= 0) {
      return {
        action: 'NO_ACTION',
        allowed: false,
        reasons: ['ZERO_AMOUNT_AT_RISK'],
        violatedRules: ['RULE_ZERO_AMOUNT_AT_RISK'],
        requiresHuman: false,
        policyVersion: POLICY_VERSION
      };
    }

    // 3. Recovery case closed or expired -> DENY
    const isExpired = recoveryCase.expires_at ? new Date(recoveryCase.expires_at).getTime() <= Date.now() : false;
    const isClosed = recoveryCase.status === 'STOPPED' || recoveryCase.status === 'RECOVERED' || recoveryCase.status === 'FAILED';
    if (isClosed || isExpired) {
      return {
        action: 'NO_ACTION',
        allowed: false,
        reasons: [isExpired ? 'CASE_EXPIRED' : 'CASE_ALREADY_CLOSED'],
        violatedRules: ['RULE_CASE_CLOSED_OR_EXPIRED'],
        requiresHuman: false,
        policyVersion: POLICY_VERSION
      };
    }

    // 4. Retry limit exceeded -> ESCALATE
    if (isRetryAction && (recoveryCase.retry_count || 0) >= policy.max_retry_attempts) {
      return {
        action: 'ESCALATE',
        allowed: false,
        reasons: ['RETRY_LIMIT_EXCEEDED'],
        violatedRules: ['RULE_MAX_RETRY_LIMIT_REACHED'],
        requiresHuman: true,
        policyVersion: POLICY_VERSION
      };
    }

    // 5. Notification limit exceeded -> ESCALATE
    if (isNotifyAction && (recoveryCase.notification_count || 0) >= policy.max_notifications) {
      return {
        action: 'ESCALATE',
        allowed: false,
        reasons: ['NOTIFICATION_LIMIT_EXCEEDED'],
        violatedRules: ['RULE_MAX_NOTIFICATION_LIMIT_REACHED'],
        requiresHuman: true,
        policyVersion: POLICY_VERSION
      };
    }

    // 6. Customer contact opt-in is false -> DENY
    if (isNotifyAction && customer.contact_opt_in === false) {
      return {
        action: 'NO_ACTION',
        allowed: false,
        reasons: ['CUSTOMER_CONTACT_NOT_ALLOWED'],
        violatedRules: ['RULE_CUSTOMER_OPTED_OUT_OF_CONTACT'],
        requiresHuman: false,
        policyVersion: POLICY_VERSION
      };
    }

    // 7. High-value transaction -> ESCALATE (Human review required for high-value retries)
    if (deterministicAnalysis.highValue && isRetryAction) {
      return {
        action: 'ESCALATE',
        allowed: false,
        reasons: ['HIGH_VALUE_REQUIRES_REVIEW'],
        violatedRules: ['RULE_HIGH_VALUE_REQUIRES_HUMAN_REVIEW'],
        requiresHuman: true,
        policyVersion: POLICY_VERSION
      };
    }

    // 8. Low AI Confidence -> ESCALATE
    if (aiDecision.confidence < policy.min_ai_confidence) {
      return {
        action: 'ESCALATE',
        allowed: false,
        reasons: ['LOW_AI_CONFIDENCE'],
        violatedRules: ['RULE_AI_CONFIDENCE_BELOW_THRESHOLD'],
        requiresHuman: true,
        policyVersion: POLICY_VERSION
      };
    }

    // 9. Low Recovery Probability -> DENY / NO_ACTION
    if (aiDecision.recoveryProbability < policy.min_recovery_probability) {
      return {
        action: 'NO_ACTION',
        allowed: false,
        reasons: ['LOW_RECOVERY_PROBABILITY'],
        violatedRules: ['RULE_RECOVERY_PROBABILITY_TOO_LOW'],
        requiresHuman: false,
        policyVersion: POLICY_VERSION
      };
    }

    // 10. Ambiguous diagnosis or explicit AI escalation recommendation -> ESCALATE
    if (
      aiDecision.diagnosis === 'UNKNOWN_OR_AMBIGUOUS' ||
      aiDecision.recommendedAction === 'ESCALATE' ||
      aiDecision.recommendedAction === 'ESCALATE_HUMAN'
    ) {
      return {
        action: 'ESCALATE',
        allowed: false,
        reasons: ['AMBIGUOUS_DIAGNOSIS'],
        violatedRules: ['RULE_UNSOLVED_OR_AMBIGUOUS_DIAGNOSIS'],
        requiresHuman: true,
        policyVersion: POLICY_VERSION
      };
    }

    // 11. All deterministic policy checks pass -> ALLOW
    return {
      action: action,
      allowed: true,
      reasons: ['POLICY_RULES_PASSED'],
      violatedRules: [],
      requiresHuman: false,
      policyVersion: POLICY_VERSION
    };
  }
}
