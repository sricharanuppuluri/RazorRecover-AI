import { DiagnosisResult, FailureCategory, ReasonCode } from '@razorrecover/shared-types';

export interface DiagnosisInputContext {
  paymentStatus?: string;
  orderStatus?: string;
  capturedAmount?: number;
  orderAmount?: number;
  errorCode?: string;
  errorDescription?: string;
  errorSource?: string;
  errorStep?: string;
  errorReason?: string;
  method?: string;
  bank?: string;
  failureCount?: number;
  previousSuccessCount?: number;
  recentBankFailureRate?: number; // 0.0 to 1.0
  recentMethodFailureRate?: number; // 0.0 to 1.0
  amountAtRisk?: number;
  isHighValue?: boolean;
  isCheckoutAbandoned?: boolean;
}

export class DiagnosisService {
  /**
   * Deterministically diagnoses payment failures based on evidence signals and precedence rules.
   * Note: Confidence is a rule-based deterministic heuristic, not a machine-learning probability.
   */
  public diagnose(context: DiagnosisInputContext): DiagnosisResult {
    const {
      paymentStatus,
      orderStatus,
      capturedAmount = 0,
      orderAmount = 0,
      errorCode = '',
      errorDescription = '',
      errorReason = '',
      failureCount = 0,
      recentBankFailureRate = 0,
      recentMethodFailureRate = 0,
      isCheckoutAbandoned = false
    } = context;

    const normalizedErrorCode = errorCode.toUpperCase();
    const normalizedDescription = errorDescription.toUpperCase();
    const normalizedReason = errorReason.toUpperCase();
    const combinedErrorText = `${normalizedErrorCode} ${normalizedDescription} ${normalizedReason}`;

    // Precedence Rule 1: ALREADY_CAPTURED
    if (
      paymentStatus === 'CAPTURED' ||
      orderStatus === 'PAID' ||
      (orderAmount > 0 && capturedAmount >= orderAmount)
    ) {
      return {
        category: 'ALREADY_CAPTURED',
        explanation: 'Payment is already captured or order is paid. Revenue at risk is zero.',
        confidence: 1.0,
        reasonCodes: ['ALREADY_CAPTURED']
      };
    }

    // Precedence Rule 2: REPEATED_FAILURE
    if (failureCount >= 3 || normalizedErrorCode.includes('REPEATED')) {
      return {
        category: 'REPEATED_FAILURE',
        explanation: `Multiple repeated payment failures detected (${failureCount}+ attempts failed).`,
        confidence: 0.90,
        reasonCodes: ['REPEATED_FAILURES']
      };
    }

    // Precedence Rule 3: INSUFFICIENT_FUNDS
    const insufficientFundsKeywords = [
      'INSUFFICIENT_BALANCE',
      'INSUFFICIENT_FUNDS',
      'LOW_BALANCE',
      'LIMIT_EXCEEDED',
      'EXCEEDS_LIMIT',
      'NOT_ENOUGH_BALANCE'
    ];

    if (insufficientFundsKeywords.some((kw) => combinedErrorText.includes(kw))) {
      return {
        category: 'INSUFFICIENT_FUNDS',
        explanation: 'Payment failed due to explicit insufficient account balance or transaction limit signal.',
        confidence: 0.95,
        reasonCodes: ['INSUFFICIENT_FUNDS_SIGNAL']
      };
    }

    // Precedence Rule 4: CUSTOMER_AUTHENTICATION_ISSUE
    const authKeywords = [
      'BAD_REQUEST_PAYMENT_TIMED_OUT',
      'OTP_FAILED',
      'AUTHENTICATION_FAILED',
      '3DS_FAILED',
      'DECLINED_BY_BANK',
      'CANCELLED_BY_USER',
      'USER_CANCELLED',
      'TIMED_OUT',
      'EXPIRED_CARD',
      'INVALID_OTP',
      'OTP_EXPIRED',
      'BAD_REQUEST_PAYMENT_DECLINED_BY_BANK'
    ];

    if (authKeywords.some((kw) => combinedErrorText.includes(kw))) {
      return {
        category: 'CUSTOMER_AUTHENTICATION_ISSUE',
        explanation: 'Payment failed during 3DS OTP verification or customer authentication timed out/declined.',
        confidence: 0.90,
        reasonCodes: ['AUTHENTICATION_FAILURE']
      };
    }

    // Precedence Rule 5: TEMPORARY_BANK_DEGRADATION
    const degradationKeywords = [
      'GATEWAY_ERROR',
      'BANK_OFFLINE',
      'SERVER_ERROR',
      'GATEWAY_TIMEOUT',
      'ISSUER_DOWN',
      'SYSTEM_ERROR',
      'TECHNICAL_ERROR'
    ];

    const hasBankSpike = recentBankFailureRate >= 0.25;
    const hasMethodSpike = recentMethodFailureRate >= 0.30;
    const hasGatewayErrorText = degradationKeywords.some((kw) => combinedErrorText.includes(kw));

    if (hasBankSpike || hasMethodSpike || hasGatewayErrorText) {
      const reasonCodes: ReasonCode[] = [];
      if (hasBankSpike) reasonCodes.push('RECENT_BANK_FAILURE_SPIKE');
      if (hasMethodSpike) reasonCodes.push('RECENT_METHOD_FAILURE_SPIKE');
      if (reasonCodes.length === 0) reasonCodes.push('RECENT_BANK_FAILURE_SPIKE');

      return {
        category: 'TEMPORARY_BANK_DEGRADATION',
        explanation: 'System or issuer bank degradation detected via elevated failure rates or gateway error response.',
        confidence: 0.85,
        reasonCodes
      };
    }

    // Precedence Rule 6: CHECKOUT_ABANDONMENT
    if (isCheckoutAbandoned) {
      return {
        category: 'CHECKOUT_ABANDONMENT',
        explanation: 'Customer initiated checkout session but abandoned before completing payment.',
        confidence: 0.85,
        reasonCodes: ['CHECKOUT_TIMEOUT']
      };
    }

    // Precedence Rule 7: UNKNOWN_OR_AMBIGUOUS (Default when evidence is weak)
    return {
      category: 'UNKNOWN_OR_AMBIGUOUS',
      explanation: 'Insufficient structured evidence to assign a definitive failure category.',
      confidence: 0.30,
      reasonCodes: ['INSUFFICIENT_EVIDENCE']
    };
  }
}
