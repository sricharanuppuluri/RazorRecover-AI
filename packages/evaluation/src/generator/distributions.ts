import { FailureCategory } from '@razorrecover/shared-types';

export interface CategoryDistribution {
  category: FailureCategory;
  weight: number;
}

export const FAILURE_CATEGORY_DISTRIBUTION = [
  { item: 'TEMPORARY_BANK_DEGRADATION' as const, weight: 0.24 },
  { item: 'CUSTOMER_AUTHENTICATION_ISSUE' as const, weight: 0.18 },
  { item: 'INSUFFICIENT_FUNDS' as const, weight: 0.18 },
  { item: 'REPEATED_FAILURE' as const, weight: 0.14 },
  { item: 'CHECKOUT_ABANDONMENT' as const, weight: 0.12 },
  { item: 'UNKNOWN_OR_AMBIGUOUS' as const, weight: 0.09 },
  { item: 'ALREADY_CAPTURED' as const, weight: 0.05 }
];

export const PAYMENT_METHOD_DISTRIBUTION = [
  { item: 'upi' as const, weight: 0.45 },
  { item: 'card' as const, weight: 0.30 },
  { item: 'netbanking' as const, weight: 0.15 },
  { item: 'wallet' as const, weight: 0.10 }
];

export const BANK_PROVIDERS = [
  { item: 'HDFC', weight: 0.25 },
  { item: 'ICICI', weight: 0.20 },
  { item: 'SBI', weight: 0.20 },
  { item: 'AXIS', weight: 0.15 },
  { item: 'KOTAK', weight: 0.10 },
  { item: 'OTHER', weight: 0.10 }
];

export const CUSTOMER_SEGMENTS = [
  { item: 'standard' as const, weight: 0.50 },
  { item: 'silver' as const, weight: 0.25 },
  { item: 'gold' as const, weight: 0.15 },
  { item: 'platinum' as const, weight: 0.10 }
];

export const ERROR_MAPPINGS: Record<FailureCategory, { source: string; step: string; reasons: string[] }> = {
  TEMPORARY_BANK_DEGRADATION: {
    source: 'gateway',
    step: 'authorization',
    reasons: ['bank_timeout', 'gateway_downtime', 'issuer_degraded']
  },
  CUSTOMER_AUTHENTICATION_ISSUE: {
    source: 'customer',
    step: 'authentication',
    reasons: ['otp_timeout', '3ds_failed', 'incorrect_pin']
  },
  INSUFFICIENT_FUNDS: {
    source: 'bank',
    step: 'authorization',
    reasons: ['insufficient_funds', 'credit_limit_exceeded']
  },
  REPEATED_FAILURE: {
    source: 'system',
    step: 'validation',
    reasons: ['max_retries_exceeded', 'consecutive_declines']
  },
  CHECKOUT_ABANDONMENT: {
    source: 'customer',
    step: 'checkout',
    reasons: ['window_closed', 'user_cancelled']
  },
  UNKNOWN_OR_AMBIGUOUS: {
    source: 'unknown',
    step: 'processing',
    reasons: ['unhandled_exception', 'ambiguous_response']
  },
  HIGH_VALUE_TRANSACTION: {
    source: 'system',
    step: 'authorization',
    reasons: ['high_value_flagged', 'manual_verification_required']
  },
  ALREADY_CAPTURED: {
    source: 'gateway',
    step: 'capture',
    reasons: ['payment_already_captured', 'duplicate_order']
  }
};
