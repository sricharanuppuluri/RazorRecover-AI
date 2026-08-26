import crypto from 'crypto';
import { env } from '../../config/env';

export interface VerificationResult {
  isValid: boolean;
  rawBodyHash: string;
  errorMessage?: string;
}

export function verifyRazorpayWebhookSignature(
  rawBody: Buffer | string | undefined,
  signatureHeader: string | undefined,
  secretOverride?: string
): VerificationResult {
  const webhookSecret = secretOverride !== undefined ? secretOverride : env.RAZORPAY_WEBHOOK_SECRET;

  if (!rawBody || (typeof rawBody === 'string' && rawBody.trim() === '')) {
    return {
      isValid: false,
      rawBodyHash: '',
      errorMessage: 'Missing raw request body'
    };
  }

  const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf-8');
  const rawBodyHash = crypto.createHash('sha256').update(bodyBuffer).digest('hex');

  if (!signatureHeader || signatureHeader.trim() === '') {
    return {
      isValid: false,
      rawBodyHash,
      errorMessage: 'Missing x-razorpay-signature header'
    };
  }

  if (!webhookSecret || webhookSecret.trim() === '') {
    // If webhook secret is not configured in dev/test, fallback check or fail
    return {
      isValid: false,
      rawBodyHash,
      errorMessage: 'RAZORPAY_WEBHOOK_SECRET is not configured'
    };
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(bodyBuffer)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
    const actualBuffer = Buffer.from(signatureHeader.trim(), 'utf-8');

    if (expectedBuffer.length !== actualBuffer.length) {
      return {
        isValid: false,
        rawBodyHash,
        errorMessage: 'Signature length mismatch'
      };
    }

    const isValid = crypto.timingSafeEqual(expectedBuffer, actualBuffer);

    return {
      isValid,
      rawBodyHash,
      errorMessage: isValid ? undefined : 'Signature verification failed'
    };
  } catch (err: any) {
    return {
      isValid: false,
      rawBodyHash,
      errorMessage: `Signature computation error: ${err.message}`
    };
  }
}
