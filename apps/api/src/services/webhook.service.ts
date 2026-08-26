import { WebhookEvent } from '@razorrecover/shared-types';
import { WebhookEventRepository } from '../repositories/webhook-event.repository';
import { verifyRazorpayWebhookSignature } from './webhook/verifier';
import { PaymentStateReconciler, ReconciliationResult } from './reconciler.service';
import { AuditService } from './audit.service';

export interface WebhookProcessingResponse {
  success: boolean;
  statusCode: number;
  message?: string;
  error?: string;
  duplicate?: boolean;
  eventId?: string;
  reconciliationResult?: ReconciliationResult;
}

export class WebhookService {
  private webhookRepo = new WebhookEventRepository();
  private reconciler = new PaymentStateReconciler();
  private auditService = new AuditService();

  public async processWebhook(
    rawBody: Buffer | string | undefined,
    signatureHeader: string | undefined,
    eventIdHeader: string | undefined,
    parsedBody: any,
    secretOverride?: string,
    correlationHeader?: string
  ): Promise<WebhookProcessingResponse> {
    const correlationId = correlationHeader || eventIdHeader || `corr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // 1. Signature Verification
    const verification = verifyRazorpayWebhookSignature(rawBody, signatureHeader, secretOverride);

    if (!verification.isValid) {
      await this.auditService.logEvent({
        merchantId: 'system',
        eventType: 'webhook_signature_rejected',
        action: 'reject_invalid_webhook_signature',
        inputSummary: `Signature verification failed: ${verification.errorMessage}`,
        decisionSummary: 'Rejected HTTP request before trusting payload or mutating state',
        outcome: 'REJECTED',
        correlationId
      });

      return {
        success: false,
        statusCode: 400,
        error: verification.errorMessage || 'Invalid signature'
      };
    }

    // 2. Validate event ID header
    const razorpayEventId = eventIdHeader || parsedBody?.event_id;
    if (!razorpayEventId) {
      await this.auditService.logEvent({
        merchantId: 'system',
        eventType: 'webhook_missing_event_id',
        action: 'reject_missing_event_id',
        inputSummary: 'x-razorpay-event-id header missing',
        decisionSummary: 'Rejected request due to missing idempotency event ID',
        outcome: 'REJECTED',
        correlationId
      });

      return {
        success: false,
        statusCode: 400,
        error: 'Missing x-razorpay-event-id header'
      };
    }

    // 3. Check for Duplicate Event ID (Idempotency)
    let existingEvent: WebhookEvent | null = null;
    try {
      existingEvent = await this.webhookRepo.findByRazorpayEventId(razorpayEventId);
    } catch (err: any) {
      console.warn('[WebhookService] DB event lookup fallback:', err.message);
    }

    if (existingEvent) {
      await this.auditService.logEvent({
        merchantId: 'system',
        eventType: 'duplicate_webhook_detected',
        action: 'skip_duplicate_event_processing',
        inputSummary: `Duplicate webhook received: ${razorpayEventId}`,
        decisionSummary: 'Deduplicated event ID; returning safe acknowledgement without duplicate processing',
        outcome: 'DUPLICATE_ACKNOWLEDGED',
        correlationId
      });

      return {
        success: true,
        statusCode: 200,
        message: 'Duplicate event already processed',
        duplicate: true,
        eventId: razorpayEventId
      };
    }

    const eventType = parsedBody?.event || 'unknown';

    // 4. Persist WebhookEvent record
    let webhookRecord: WebhookEvent | null = null;
    const eventRecordData: Partial<WebhookEvent> = {
      id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      razorpay_event_id: razorpayEventId,
      event_type: eventType,
      signature_valid: true,
      raw_body_hash: verification.rawBodyHash,
      processing_status: 'RECEIVED'
    };

    try {
      webhookRecord = await this.webhookRepo.create(eventRecordData);
    } catch (err: any) {
      console.warn('[WebhookService] Event insert fallback:', err.message);
      webhookRecord = eventRecordData as WebhookEvent;
    }

    await this.auditService.logEvent({
      merchantId: 'system',
      eventType: 'webhook_received',
      action: 'persist_webhook_event',
      inputSummary: `Received valid webhook event ${eventType} (ID: ${razorpayEventId})`,
      decisionSummary: 'Persisted WebhookEvent record',
      outcome: 'RECEIVED',
      correlationId
    });

    // 5. Reconcile Payment/Order State based on supported event types
    let reconciliationResult: ReconciliationResult;

    try {
      switch (eventType) {
        case 'payment.failed':
          reconciliationResult = await this.reconciler.reconcilePaymentFailed(parsedBody?.payload || parsedBody, correlationId);
          break;
        case 'payment.authorized':
          reconciliationResult = await this.reconciler.reconcilePaymentAuthorized(parsedBody?.payload || parsedBody, correlationId);
          break;
        case 'payment.captured':
          reconciliationResult = await this.reconciler.reconcilePaymentCaptured(parsedBody?.payload || parsedBody, correlationId);
          break;
        case 'order.paid':
          reconciliationResult = await this.reconciler.reconcileOrderPaid(parsedBody?.payload || parsedBody, correlationId);
          break;
        default:
          // Unknown or unsupported event type safely ignored
          try {
            if (webhookRecord?.id) {
              await this.webhookRepo.updateProcessingStatus(webhookRecord.id, 'IGNORED', `Unsupported event type: ${eventType}`);
            }
          } catch (e) {}

          await this.auditService.logEvent({
            merchantId: 'system',
            eventType: 'unknown_event_received',
            action: 'ignore_unsupported_event',
            inputSummary: `Received event type ${eventType}`,
            decisionSummary: 'Safely ignored unknown/unsupported event',
            outcome: 'IGNORED',
            correlationId
          });

          return {
            success: true,
            statusCode: 200,
            message: `Event type '${eventType}' received and safely ignored`,
            eventId: razorpayEventId
          };
      }

      // Update WebhookEvent processing status to PROCESSED
      try {
        if (webhookRecord?.id) {
          await this.webhookRepo.updateProcessingStatus(webhookRecord.id, 'PROCESSED');
        }
      } catch (e) {}

      return {
        success: true,
        statusCode: 200,
        message: 'Webhook processed successfully',
        eventId: razorpayEventId,
        reconciliationResult
      };
    } catch (procErr: any) {
      try {
        if (webhookRecord?.id) {
          await this.webhookRepo.updateProcessingStatus(webhookRecord.id, 'FAILED', procErr.message);
        }
      } catch (e) {}

      console.error('[WebhookService] Processing error:', procErr.message);

      return {
        success: false,
        statusCode: 500,
        error: `Internal webhook processing error: ${procErr.message}`,
        eventId: razorpayEventId
      };
    }
  }
}
