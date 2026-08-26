import { AIDecisionOutput, AllowedAction } from '@razorrecover/shared-types';

export const ALLOWED_ACTIONS: AllowedAction[] = [
  'RETRY',
  'NOTIFY',
  'ESCALATE',
  'NO_ACTION',
  'WAIT_AND_RETRY',
  'OFFER_ALTERNATE_PAYMENT',
  'SEND_RECOVERY_LINK',
  'SEND_REMINDER',
  'ESCALATE_HUMAN',
  'STOP'
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  output?: AIDecisionOutput;
}

export function validateAIDecisionOutput(rawOutput: any): ValidationResult {
  const errors: string[] = [];

  if (!rawOutput || typeof rawOutput !== 'object') {
    return { valid: false, errors: ['Output is not a valid JSON object'] };
  }

  // 1. Validate diagnosis
  if (typeof rawOutput.diagnosis !== 'string' || !rawOutput.diagnosis.trim()) {
    errors.push('Field "diagnosis" must be a non-empty string');
  }

  // 2. Validate recoveryProbability
  const prob = Number(rawOutput.recoveryProbability);
  if (isNaN(prob) || prob < 0.0 || prob > 1.0) {
    errors.push(`Field "recoveryProbability" must be a number between 0.0 and 1.0. Got: ${rawOutput.recoveryProbability}`);
  }

  // 3. Validate recommendedAction
  const action = rawOutput.recommendedAction;
  if (!ALLOWED_ACTIONS.includes(action)) {
    errors.push(`Field "recommendedAction" must be one of [${ALLOWED_ACTIONS.join(', ')}]. Got: ${action}`);
  }

  // 4. Validate rationale
  if (typeof rawOutput.rationale !== 'string' || !rawOutput.rationale.trim()) {
    errors.push('Field "rationale" must be a non-empty string');
  } else if (rawOutput.rationale.length > 500) {
    errors.push(`Field "rationale" exceeds maximum length of 500 characters (${rawOutput.rationale.length} chars)`);
  }

  // 5. Validate confidence
  const conf = Number(rawOutput.confidence);
  if (isNaN(conf) || conf < 0.0 || conf > 1.0) {
    errors.push(`Field "confidence" must be a number between 0.0 and 1.0. Got: ${rawOutput.confidence}`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    output: {
      diagnosis: String(rawOutput.diagnosis).trim(),
      recoveryProbability: Math.round(prob * 10000) / 10000,
      recommendedAction: action as AllowedAction,
      rationale: String(rawOutput.rationale).trim(),
      confidence: Math.round(conf * 10000) / 10000
    }
  };
}
