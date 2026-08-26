import { AllowedAction, FailureCategory } from '@razorrecover/shared-types';
import { SeededPRNG } from './seeded-prng';

export interface GroundTruthOutcome {
  ground_truth_recoverable: boolean;
  ground_truth_best_action: AllowedAction;
  ground_truth_recovered: boolean;
  recovered_amount: number;
  intervention_cost: number;
}

export interface SyntheticFeatureContext {
  category: FailureCategory;
  amount: number; // in paise
  isHighValue: boolean;
  isRepeatCustomer: boolean;
  previousSuccessCount: number;
  previousFailureCount: number;
  attemptNumber: number;
  timeSinceFirstAttempt: number;
  contactOptIn: boolean;
  bankProvider: string;
  paymentMethod: string;
}

export function generateGroundTruth(
  prng: SeededPRNG,
  ctx: SyntheticFeatureContext
): GroundTruthOutcome {
  // 1. Terminal / Non-recoverable conditions
  if (ctx.category === 'ALREADY_CAPTURED') {
    return {
      ground_truth_recoverable: false,
      ground_truth_best_action: 'STOP',
      ground_truth_recovered: false,
      recovered_amount: 0,
      intervention_cost: 0
    };
  }

  if (ctx.previousFailureCount >= 4 || ctx.attemptNumber >= 4) {
    return {
      ground_truth_recoverable: false,
      ground_truth_best_action: 'STOP',
      ground_truth_recovered: false,
      recovered_amount: 0,
      intervention_cost: 0
    };
  }

  // 2. High-value + ambiguous -> ESCALATE_HUMAN
  if (ctx.isHighValue && ctx.category === 'UNKNOWN_OR_AMBIGUOUS') {
    const recoverable = prng.nextFloat() < 0.65;
    return {
      ground_truth_recoverable: recoverable,
      ground_truth_best_action: 'ESCALATE_HUMAN',
      ground_truth_recovered: recoverable,
      recovered_amount: recoverable ? ctx.amount : 0,
      intervention_cost: 2000 // 20 INR
    };
  }

  // 3. Action & Recoverability Determination based on Category & Context
  let bestAction: AllowedAction;
  let baseRecoverabilityProb: number;

  switch (ctx.category) {
    case 'TEMPORARY_BANK_DEGRADATION':
      bestAction = ctx.paymentMethod === 'upi' ? 'OFFER_ALTERNATE_PAYMENT' : 'WAIT_AND_RETRY';
      baseRecoverabilityProb = 0.82;
      break;

    case 'CUSTOMER_AUTHENTICATION_ISSUE':
      if (!ctx.contactOptIn) {
        bestAction = 'OFFER_ALTERNATE_PAYMENT';
        baseRecoverabilityProb = 0.45;
      } else {
        bestAction = ctx.attemptNumber > 1 ? 'SEND_REMINDER' : 'SEND_RECOVERY_LINK';
        baseRecoverabilityProb = 0.72;
      }
      break;

    case 'INSUFFICIENT_FUNDS':
      bestAction = 'OFFER_ALTERNATE_PAYMENT';
      baseRecoverabilityProb = 0.55;
      break;

    case 'CHECKOUT_ABANDONMENT':
      if (!ctx.contactOptIn) {
        bestAction = 'STOP';
        baseRecoverabilityProb = 0.10;
      } else {
        bestAction = 'SEND_RECOVERY_LINK';
        baseRecoverabilityProb = 0.60;
      }
      break;

    case 'REPEATED_FAILURE':
      if (ctx.previousSuccessCount > 3 && ctx.isHighValue) {
        bestAction = 'ESCALATE_HUMAN';
        baseRecoverabilityProb = 0.40;
      } else {
        bestAction = 'STOP';
        baseRecoverabilityProb = 0.15;
      }
      break;

    case 'UNKNOWN_OR_AMBIGUOUS':
    default:
      bestAction = ctx.isHighValue ? 'ESCALATE_HUMAN' : 'STOP';
      baseRecoverabilityProb = ctx.isHighValue ? 0.35 : 0.20;
      break;
  }

  // Customer history adjustments
  if (ctx.isRepeatCustomer && ctx.previousSuccessCount > 2) {
    baseRecoverabilityProb += 0.10;
  }
  if (ctx.previousFailureCount > 1) {
    baseRecoverabilityProb -= 0.15;
  }

  // Clamp probability
  const finalProb = Math.max(0.05, Math.min(0.95, baseRecoverabilityProb));
  const recoverable = prng.nextFloat() < finalProb;
  const recovered = recoverable && bestAction !== 'STOP';

  // Cost model (in integer paise)
  let cost = 0;
  switch (bestAction) {
    case 'WAIT_AND_RETRY':
      cost = 100; // 1 INR
      break;
    case 'SEND_RECOVERY_LINK':
    case 'SEND_REMINDER':
      cost = 50; // 0.5 INR
      break;
    case 'OFFER_ALTERNATE_PAYMENT':
      cost = 200; // 2 INR
      break;
    case 'ESCALATE_HUMAN':
      cost = 2000; // 20 INR
      break;
    case 'STOP':
    default:
      cost = 0;
      break;
  }

  return {
    ground_truth_recoverable: recoverable,
    ground_truth_best_action: bestAction,
    ground_truth_recovered: recovered,
    recovered_amount: recovered ? ctx.amount : 0,
    intervention_cost: cost
  };
}
