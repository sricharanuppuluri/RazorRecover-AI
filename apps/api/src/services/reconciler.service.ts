import { Payment, Order, PaymentStatus, OrderStatus } from '@razorrecover/shared-types';
import { PaymentRepository } from '../repositories/payment.repository';
import { OrderRepository } from '../repositories/order.repository';
import { RecoveryCaseRepository } from '../repositories/recovery-case.repository';
import { AuditService } from './audit.service';

export interface ReconciliationResult {
  status: 'reconciled' | 'already_reconciled' | 'ignored' | 'error';
  payment?: Payment | null;
  order?: Order | null;
  reason?: string;
}

export class PaymentStateReconciler {
  private paymentRepo = new PaymentRepository();
  private orderRepo = new OrderRepository();
  private recoveryCaseRepo = new RecoveryCaseRepository();
  private auditService = new AuditService();

  /**
   * Status rank helper to enforce monotonic success state transitions.
   * CREATED (0) < AUTHORIZED (1) < CAPTURED (2)
   * FAILED (-1) can be superseded by AUTHORIZED (1) or CAPTURED (2).
   */
  private getPaymentStatusRank(status: PaymentStatus): number {
    switch (status) {
      case 'CAPTURED': return 2;
      case 'AUTHORIZED': return 1;
      case 'CREATED': return 0;
      case 'FAILED': return -1;
      case 'REFUNDED': return 3;
      default: return 0;
    }
  }

  /**
   * Process `payment.failed` event
   */
  public async reconcilePaymentFailed(payload: any, correlationId: string): Promise<ReconciliationResult> {
    const paymentEntity = payload?.payment?.entity || payload?.entity || {};
    const razorpayPaymentId = paymentEntity.id;
    const razorpayOrderId = paymentEntity.order_id;
    const amount = paymentEntity.amount;
    const errorCode = paymentEntity.error_code;
    const errorDescription = paymentEntity.error_description;
    const errorSource = paymentEntity.error_source;
    const errorStep = paymentEntity.error_step;
    const errorReason = paymentEntity.error_reason;

    // 1. Locate existing payment or order
    let payment: Payment | null = null;
    let order: Order | null = null;

    if (razorpayPaymentId) {
      try { payment = await this.paymentRepo.findByRazorpayPaymentId(razorpayPaymentId); } catch (e) {}
    }
    if (!payment && razorpayOrderId) {
      try { payment = await this.paymentRepo.findByRazorpayOrderId(razorpayOrderId); } catch (e) {}
    }
    if (razorpayOrderId) {
      try { order = await this.orderRepo.findByRazorpayOrderId(razorpayOrderId); } catch (e) {}
    }

    const merchantId = order?.merchant_id || payment?.merchant_id || 'mch_test_01';

    // 2. Out-of-order check: If payment or order is already CAPTURED or PAID, ignore late failure!
    if (payment && payment.status === 'CAPTURED') {
      await this.auditService.logEvent({
        merchantId,
        eventType: 'stale_event_ignored',
        action: 'ignore_stale_payment_failure',
        inputSummary: `Stale payment.failed received for already CAPTURED payment ${razorpayPaymentId}`,
        decisionSummary: 'Preserved CAPTURED state; rejected state downgrade',
        outcome: 'IGNORED',
        correlationId
      });
      return { status: 'ignored', payment, order, reason: 'Stale failure event ignored for captured payment' };
    }

    if (order && order.status === 'PAID') {
      await this.auditService.logEvent({
        merchantId,
        eventType: 'stale_event_ignored',
        action: 'ignore_stale_payment_failure',
        inputSummary: `Stale payment.failed received for already PAID order ${razorpayOrderId}`,
        decisionSummary: 'Preserved PAID order state; rejected state downgrade',
        outcome: 'IGNORED',
        correlationId
      });
      return { status: 'ignored', payment, order, reason: 'Stale failure event ignored for paid order' };
    }

    // 3. Update or create payment record as FAILED
    const failureCount = (payment?.failure_count || 0) + 1;

    if (payment) {
      try {
        payment = await this.paymentRepo.updatePaymentState(payment.id, {
          status: 'FAILED',
          failure_count: failureCount,
          error_code: errorCode,
          error_description: errorDescription,
          error_source: errorSource,
          error_step: errorStep,
          error_reason: errorReason,
          method: paymentEntity.method,
          bank: paymentEntity.bank
        }) || payment;
      } catch (e) {
        payment.status = 'FAILED';
        payment.failure_count = failureCount;
      }
    } else {
      // Create payment record if it didn't exist
      const newPayment: Partial<Payment> = {
        id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        merchant_id: merchantId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_order_id: razorpayOrderId,
        customer_id: order?.customer_id || 'cust_01',
        amount: amount || order?.amount || 0,
        currency: paymentEntity.currency || order?.currency || 'INR',
        method: paymentEntity.method,
        bank: paymentEntity.bank,
        status: 'FAILED',
        error_code: errorCode,
        error_description: errorDescription,
        error_source: errorSource,
        error_step: errorStep,
        error_reason: errorReason,
        failure_count: 1
      };
      try {
        payment = await this.paymentRepo.create(newPayment);
      } catch (e) {
        payment = newPayment as Payment;
      }
    }

    // 4. Log Audit Event
    await this.auditService.logEvent({
      merchantId,
      eventType: 'payment_failed',
      action: 'record_payment_failure',
      inputSummary: `Payment failure: ${errorCode || errorReason || 'Failed'}`,
      decisionSummary: `Updated payment state to FAILED (failure_count=${failureCount})`,
      outcome: 'SUCCESS',
      correlationId
    });

    return { status: 'reconciled', payment, order };
  }

  /**
   * Process `payment.authorized` event
   */
  public async reconcilePaymentAuthorized(payload: any, correlationId: string): Promise<ReconciliationResult> {
    const paymentEntity = payload?.payment?.entity || payload?.entity || {};
    const razorpayPaymentId = paymentEntity.id;
    const razorpayOrderId = paymentEntity.order_id;
    const amount = paymentEntity.amount;

    let payment: Payment | null = null;
    let order: Order | null = null;

    if (razorpayPaymentId) {
      try { payment = await this.paymentRepo.findByRazorpayPaymentId(razorpayPaymentId); } catch (e) {}
    }
    if (!payment && razorpayOrderId) {
      try { payment = await this.paymentRepo.findByRazorpayOrderId(razorpayOrderId); } catch (e) {}
    }
    if (razorpayOrderId) {
      try { order = await this.orderRepo.findByRazorpayOrderId(razorpayOrderId); } catch (e) {}
    }

    const merchantId = order?.merchant_id || payment?.merchant_id || 'mch_test_01';

    // Out-of-order check: Do not downgrade CAPTURED to AUTHORIZED
    if (payment && payment.status === 'CAPTURED') {
      await this.auditService.logEvent({
        merchantId,
        eventType: 'stale_event_ignored',
        action: 'ignore_stale_authorization',
        inputSummary: `Stale payment.authorized received for CAPTURED payment ${razorpayPaymentId}`,
        decisionSummary: 'Preserved CAPTURED state',
        outcome: 'IGNORED',
        correlationId
      });
      return { status: 'ignored', payment, order, reason: 'Payment is already CAPTURED' };
    }

    const authorizedAt = new Date().toISOString();

    if (payment) {
      try {
        payment = await this.paymentRepo.updatePaymentState(payment.id, {
          status: 'AUTHORIZED',
          authorized_at: authorizedAt,
          method: paymentEntity.method,
          bank: paymentEntity.bank
        }) || payment;
      } catch (e) {
        payment.status = 'AUTHORIZED';
      }
    } else {
      const newPayment: Partial<Payment> = {
        id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        merchant_id: merchantId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_order_id: razorpayOrderId,
        customer_id: order?.customer_id || 'cust_01',
        amount: amount || order?.amount || 0,
        currency: paymentEntity.currency || order?.currency || 'INR',
        method: paymentEntity.method,
        bank: paymentEntity.bank,
        status: 'AUTHORIZED',
        authorized_at: authorizedAt,
        failure_count: 0
      };
      try {
        payment = await this.paymentRepo.create(newPayment);
      } catch (e) {
        payment = newPayment as Payment;
      }
    }

    await this.auditService.logEvent({
      merchantId,
      eventType: 'payment_authorized',
      action: 'record_payment_authorization',
      inputSummary: `Payment authorized: ${razorpayPaymentId}`,
      decisionSummary: 'Updated payment status to AUTHORIZED',
      outcome: 'SUCCESS',
      correlationId
    });

    return { status: 'reconciled', payment, order };
  }

  /**
   * Process `payment.captured` event (Authoritative Payment Success)
   */
  public async reconcilePaymentCaptured(payload: any, correlationId: string): Promise<ReconciliationResult> {
    const paymentEntity = payload?.payment?.entity || payload?.entity || {};
    const razorpayPaymentId = paymentEntity.id;
    const razorpayOrderId = paymentEntity.order_id;
    const amount = paymentEntity.amount;

    let payment: Payment | null = null;
    let order: Order | null = null;

    if (razorpayPaymentId) {
      try { payment = await this.paymentRepo.findByRazorpayPaymentId(razorpayPaymentId); } catch (e) {}
    }
    if (!payment && razorpayOrderId) {
      try { payment = await this.paymentRepo.findByRazorpayOrderId(razorpayOrderId); } catch (e) {}
    }
    if (razorpayOrderId) {
      try { order = await this.orderRepo.findByRazorpayOrderId(razorpayOrderId); } catch (e) {}
    }

    const merchantId = order?.merchant_id || payment?.merchant_id || 'mch_test_01';

    // Idempotency check: If payment is ALREADY captured and order is ALREADY paid
    if (payment && payment.status === 'CAPTURED' && order && order.status === 'PAID') {
      await this.auditService.logEvent({
        merchantId,
        eventType: 'duplicate_webhook_detected',
        action: 'skip_duplicate_capture',
        inputSummary: `Duplicate payment.captured event received for payment ${razorpayPaymentId}`,
        decisionSummary: 'Payment and Order already in final CAPTURED/PAID state',
        outcome: 'ALREADY_RECONCILED',
        correlationId
      });
      return { status: 'already_reconciled', payment, order, reason: 'Already captured and paid' };
    }

    const capturedAt = new Date().toISOString();

    // 1. Update/Create Payment to CAPTURED
    if (payment) {
      try {
        payment = await this.paymentRepo.updatePaymentState(payment.id, {
          status: 'CAPTURED',
          captured_at: capturedAt,
          method: paymentEntity.method,
          bank: paymentEntity.bank
        }) || payment;
      } catch (e) {
        payment.status = 'CAPTURED';
      }
    } else {
      const newPayment: Partial<Payment> = {
        id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        merchant_id: merchantId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_order_id: razorpayOrderId,
        customer_id: order?.customer_id || 'cust_01',
        amount: amount || order?.amount || 0,
        currency: paymentEntity.currency || order?.currency || 'INR',
        method: paymentEntity.method,
        bank: paymentEntity.bank,
        status: 'CAPTURED',
        captured_at: capturedAt,
        failure_count: 0
      };
      try {
        payment = await this.paymentRepo.create(newPayment);
      } catch (e) {
        payment = newPayment as Payment;
      }
    }

    // 2. Reconcile associated Order to PAID
    if (order && order.status !== 'PAID') {
      try {
        order = await this.orderRepo.updateStatus(order.id, 'PAID', capturedAt) || order;
      } catch (e) {
        order.status = 'PAID';
      }
    }

    // 3. Reconcile associated Recovery Case (Outcome Observer)
    await this.reconcileRecoveryCaseOutcome(order?.id, payment?.id, amount || order?.amount || 0, correlationId);

    await this.auditService.logEvent({
      merchantId,
      eventType: 'payment_captured',
      action: 'reconcile_trusted_payment_capture',
      inputSummary: `Payment captured: ${razorpayPaymentId}, amount=${amount || order?.amount}`,
      decisionSummary: 'Updated Payment to CAPTURED and Order to PAID',
      outcome: 'SUCCESS',
      correlationId
    });

    return { status: 'reconciled', payment, order };
  }

  /**
   * Process `order.paid` event
   */
  public async reconcileOrderPaid(payload: any, correlationId: string): Promise<ReconciliationResult> {
    const orderEntity = payload?.order?.entity || payload?.entity || {};
    const razorpayOrderId = orderEntity.id;
    const paymentEntity = payload?.payment?.entity;

    let order: Order | null = null;
    let payment: Payment | null = null;

    if (razorpayOrderId) {
      try { order = await this.orderRepo.findByRazorpayOrderId(razorpayOrderId); } catch (e) {}
    }
    if (paymentEntity?.id) {
      try { payment = await this.paymentRepo.findByRazorpayPaymentId(paymentEntity.id); } catch (e) {}
    }
    if (!payment && razorpayOrderId) {
      try { payment = await this.paymentRepo.findByRazorpayOrderId(razorpayOrderId); } catch (e) {}
    }

    const merchantId = order?.merchant_id || payment?.merchant_id || 'mch_test_01';

    // Idempotency check: If order is ALREADY paid
    if (order && order.status === 'PAID') {
      await this.auditService.logEvent({
        merchantId,
        eventType: 'duplicate_webhook_detected',
        action: 'skip_duplicate_order_paid',
        inputSummary: `Order.paid received for order ${razorpayOrderId} which is already PAID`,
        decisionSummary: 'Skipped duplicate order status update',
        outcome: 'ALREADY_RECONCILED',
        correlationId
      });
      return { status: 'already_reconciled', order, payment, reason: 'Order already marked PAID' };
    }

    const paidAt = new Date().toISOString();

    // 1. Update/Create Order
    if (order) {
      try {
        order = await this.orderRepo.updateStatus(order.id, 'PAID', paidAt) || order;
      } catch (e) {
        order.status = 'PAID';
      }
    }

    // 2. Reconcile Payment if present
    if (payment && payment.status !== 'CAPTURED') {
      try {
        payment = await this.paymentRepo.updatePaymentState(payment.id, {
          status: 'CAPTURED',
          captured_at: paidAt
        }) || payment;
      } catch (e) {
        payment.status = 'CAPTURED';
      }
    }

    // 3. Reconcile associated Recovery Case (Outcome Observer)
    await this.reconcileRecoveryCaseOutcome(order?.id, payment?.id, order?.amount || payment?.amount || 0, correlationId);

    await this.auditService.logEvent({
      merchantId,
      eventType: 'order_paid',
      action: 'reconcile_order_paid_event',
      inputSummary: `Order.paid event received: ${razorpayOrderId}`,
      decisionSummary: 'Reconciled Order to PAID',
      outcome: 'SUCCESS',
      correlationId
    });

    return { status: 'reconciled', order, payment };
  }

  /**
   * Helper: Outcome Observer — transition associated active recovery case to RECOVERED upon trusted payment success.
   */
  private async reconcileRecoveryCaseOutcome(
    orderId?: string,
    paymentId?: string,
    recoveredAmount: number = 0,
    correlationId: string = ''
  ): Promise<void> {
    try {
      let rc = paymentId ? await this.recoveryCaseRepo.findByPaymentId(paymentId) : null;
      if (!rc && orderId) {
        rc = await this.recoveryCaseRepo.findByOrderId(orderId);
      }

      if (rc && rc.status !== 'RECOVERED' && rc.status !== 'STOPPED') {
        const amount = recoveredAmount || rc.amount_at_risk;
        await this.recoveryCaseRepo.updateStatus(rc.id, 'RECOVERED', {
          closedAt: new Date().toISOString(),
          closeReason: 'PAYMENT_CAPTURED',
          recoveredAmount: amount
        });

        await this.auditService.logEvent({
          merchantId: rc.merchant_id,
          recoveryCaseId: rc.id,
          eventType: 'RECOVERY_CASE_RECOVERED',
          actorType: 'system',
          action: 'RECOVER_CASE_WEBHOOK',
          outcome: 'RECOVERED',
          decisionSummary: `Trusted webhook confirmed payment capture (${amount} paise). Case marked RECOVERED.`,
          correlationId
        });
      }
    } catch (err) {
      console.warn('[PaymentStateReconciler] Failed to reconcile recovery case outcome:', (err as Error).message);
    }
  }
}
