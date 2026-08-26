import { FailureCategory } from '@razorrecover/shared-types';

export interface ScoringInputContext {
  orderAmount: number; // in paise
  capturedAmount?: number; // in paise
  category: FailureCategory;
  previousSuccessCount?: number;
  failureCount?: number;
  recentBankFailureRate?: number;
  contactOptIn?: boolean;
  highValueThreshold?: number; // in paise (default: 10000000 = ₹1,00,000)
  createdAt?: string; // payment failure timestamp
}

export interface ScoringOutput {
  amountAtRisk: number; // in paise
  recoveryProbability: number; // [0.0, 1.0]
  expectedRecoveryValue: number; // in paise
  priorityScore: number; // integer score
  highValue: boolean;
  urgencyFactor: number;
  customerIntentFactor: number;
  actionFeasibilityFactor: number;
}

export class ScoringService {
  public static DEFAULT_HIGH_VALUE_THRESHOLD = 10000000; // ₹1,00,000 in paise

  /**
   * Calculates deterministic revenue risk, recovery probability, expected recovery value, and priority score.
   * Precision strategy: Monetary amounts are maintained in integer smallest currency units (paise).
   * Expected recovery value is computed via integer-safe basis-point arithmetic:
   * basisPoints = Math.round(recoveryProbability * 10000)
   * expectedRecoveryValue = (BigInt(amountAtRisk) * BigInt(basisPoints)) / 10000n
   * This eliminates floating-point rounding precision issues on large monetary amounts.
   */
  public calculate(context: ScoringInputContext): ScoringOutput {
    const {
      orderAmount = 0,
      capturedAmount = 0,
      category,
      previousSuccessCount = 0,
      failureCount = 1,
      recentBankFailureRate = 0,
      contactOptIn = false,
      highValueThreshold = ScoringService.DEFAULT_HIGH_VALUE_THRESHOLD,
      createdAt
    } = context;

    // 1. Calculate Revenue At Risk (Paise)
    const rawRisk = Math.max(0, Math.floor(orderAmount) - Math.floor(capturedAmount));
    const amountAtRisk = rawRisk;
    const highValue = amountAtRisk >= highValueThreshold;

    // If already captured or zero risk, zero out probability and values
    if (category === 'ALREADY_CAPTURED' || amountAtRisk <= 0) {
      return {
        amountAtRisk: 0,
        recoveryProbability: 0.0,
        expectedRecoveryValue: 0,
        priorityScore: 0,
        highValue: false,
        urgencyFactor: 1.0,
        customerIntentFactor: 1.0,
        actionFeasibilityFactor: 0.0
      };
    }

    // 2. Deterministic Baseline Recovery Probability Model
    let baseProbability = 0.30; // Default baseline

    switch (category) {
      case 'TEMPORARY_BANK_DEGRADATION':
        baseProbability = 0.85;
        break;
      case 'CUSTOMER_AUTHENTICATION_ISSUE':
        baseProbability = 0.70;
        break;
      case 'CHECKOUT_ABANDONMENT':
        baseProbability = 0.50;
        break;
      case 'HIGH_VALUE_TRANSACTION':
        baseProbability = 0.60;
        break;
      case 'INSUFFICIENT_FUNDS':
        baseProbability = 0.40;
        break;
      case 'UNKNOWN_OR_AMBIGUOUS':
        baseProbability = 0.30;
        break;
      case 'REPEATED_FAILURE':
        baseProbability = 0.20;
        break;
    }

    // Apply deterministic modifiers
    let probabilityModifier = 0.0;

    // Repeat customer bonus (+0.10)
    if (previousSuccessCount > 0) {
      probabilityModifier += 0.10;
    }

    // High value transaction modifier (-0.05 due to authorization friction)
    if (highValue) {
      probabilityModifier -= 0.05;
    }

    // Repeated attempts penalty (-0.05 per additional failure past 1)
    if (failureCount > 1) {
      probabilityModifier -= Math.min(0.20, (failureCount - 1) * 0.05);
    }

    // Bank failure spike penalty (-0.10)
    if (recentBankFailureRate >= 0.25) {
      probabilityModifier -= 0.10;
    }

    // Customer contact opt-in bonus (+0.05)
    if (contactOptIn) {
      probabilityModifier += 0.05;
    }

    // Bound probability strictly between 0.0 and 1.0
    const rawProbability = baseProbability + probabilityModifier;
    const recoveryProbability = Math.max(0.0, Math.min(1.0, Math.round(rawProbability * 10000) / 10000));

    // 3. Expected Recovery Value (Basis-Point BigInt Integer Safe)
    const basisPoints = BigInt(Math.round(recoveryProbability * 10000));
    const safeRisk = BigInt(amountAtRisk);
    const expectedRecoveryValue = Number((safeRisk * basisPoints) / 10000n);

    // 4. Deterministic Priority Factors
    // Urgency Factor: 1.0 down to 0.5 based on elapsed hours up to 24h
    let elapsedHours = 0;
    if (createdAt) {
      const createdTime = new Date(createdAt).getTime();
      const now = Date.now();
      if (!isNaN(createdTime) && now >= createdTime) {
        elapsedHours = (now - createdTime) / (1000 * 60 * 60);
      }
    }

    let urgencyFactor = 1.0;
    if (elapsedHours > 1 && elapsedHours <= 24) {
      urgencyFactor = Math.max(0.5, 1.0 - ((elapsedHours - 1) / 23) * 0.5);
    } else if (elapsedHours > 24) {
      urgencyFactor = 0.3;
    }
    urgencyFactor = Math.round(urgencyFactor * 100) / 100;

    // Customer Intent Factor
    let customerIntentFactor = 1.0;
    if (previousSuccessCount > 0) {
      customerIntentFactor = 1.2;
    } else if (failureCount >= 3) {
      customerIntentFactor = 0.8;
    }

    // Action Feasibility Factor
    let actionFeasibilityFactor = 1.0;
    switch (category) {
      case 'TEMPORARY_BANK_DEGRADATION':
      case 'CUSTOMER_AUTHENTICATION_ISSUE':
      case 'CHECKOUT_ABANDONMENT':
        actionFeasibilityFactor = 1.0;
        break;
      case 'INSUFFICIENT_FUNDS':
        actionFeasibilityFactor = 0.8;
        break;
      case 'UNKNOWN_OR_AMBIGUOUS':
        actionFeasibilityFactor = 0.6;
        break;
      case 'REPEATED_FAILURE':
        actionFeasibilityFactor = 0.5;
        break;
      default:
        actionFeasibilityFactor = 1.0;
    }

    // 5. Priority Score Calculation
    // Integer-safe deterministic formula: priority_score = Math.floor(expected_recovery_value * urgency * intent * feasibility)
    const rawScore = expectedRecoveryValue * urgencyFactor * customerIntentFactor * actionFeasibilityFactor;
    const priorityScore = (isNaN(rawScore) || !isFinite(rawScore)) ? 0 : Math.max(0, Math.floor(rawScore));

    return {
      amountAtRisk,
      recoveryProbability,
      expectedRecoveryValue,
      priorityScore,
      highValue,
      urgencyFactor,
      customerIntentFactor,
      actionFeasibilityFactor
    };
  }
}

