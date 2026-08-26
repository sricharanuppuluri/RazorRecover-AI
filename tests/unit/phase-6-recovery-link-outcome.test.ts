import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { RecoveryLinkRepository } from '../../apps/api/src/repositories/recovery-link.repository';
import { PaymentStateReconciler } from '../../apps/api/src/services/reconciler.service';
import { RecoveryCaseRepository } from '../../apps/api/src/repositories/recovery-case.repository';
import { OrderRepository } from '../../apps/api/src/repositories/order.repository';
import { PaymentRepository } from '../../apps/api/src/repositories/payment.repository';
import { CustomerRepository } from '../../apps/api/src/repositories/customer.repository';

describe('Phase 6: Recovery Link & Outcome Observer Tests', () => {
  let linkRepo: RecoveryLinkRepository;
  let caseRepo: RecoveryCaseRepository;
  let orderRepo: OrderRepository;
  let paymentRepo: PaymentRepository;
  let customerRepo: CustomerRepository;
  let reconciler: PaymentStateReconciler;

  beforeEach(() => {
    linkRepo = new RecoveryLinkRepository();
    caseRepo = new RecoveryCaseRepository();
    orderRepo = new OrderRepository();
    paymentRepo = new PaymentRepository();
    customerRepo = new CustomerRepository();
    reconciler = new PaymentStateReconciler();

    linkRepo.clearInMemoryStore();
  });

  it('1. Secure token generation, SHA-256 hashing & expiry validation', async () => {
    const { link, rawToken } = await linkRepo.createRecoveryLink({
      recoveryCaseId: 'rc_link_01',
      merchantId: 'mch_01',
      orderId: 'ord_01',
      expiryHours: 24
    });

    assert.ok(rawToken);
    assert.strictEqual(rawToken.length, 64); // 32 random bytes in hex = 64 chars
    assert.notStrictEqual(rawToken, link.token_hash); // Raw token is NOT equal to SHA-256 hash

    const found = await linkRepo.findByToken(rawToken);
    assert.ok(found);
    assert.strictEqual(found?.recovery_case_id, 'rc_link_01');
    assert.strictEqual(found?.merchant_id, 'mch_01');
  });

  it('2. Invalid or expired token resolution fails securely', async () => {
    const foundInvalid = await linkRepo.findByToken('invalid_token_string_123');
    assert.strictEqual(foundInvalid, null);
  });

  it('3. Outcome Observer: Trusted payment.captured webhook automatically marks active case RECOVERED', async () => {
    const cust = await customerRepo.create({
      id: 'cust_outcome_01',
      merchant_id: 'mch_01',
      external_customer_id: 'ext_cust_outcome_01'
    });

    const ord = await orderRepo.create({
      id: 'ord_outcome_01',
      merchant_id: 'mch_01',
      razorpay_order_id: 'order_rzp_outcome_01',
      customer_id: cust.id,
      amount: 1500000,
      currency: 'INR',
      status: 'ATTEMPTED'
    });

    const pay = await paymentRepo.create({
      id: 'pay_outcome_01',
      merchant_id: 'mch_01',
      customer_id: cust.id,
      razorpay_payment_id: 'pay_rzp_outcome_01',
      razorpay_order_id: ord.razorpay_order_id,
      amount: ord.amount,
      status: 'FAILED'
    });

    const rc = await caseRepo.create({
      id: 'rc_outcome_01',
      merchant_id: 'mch_01',
      order_id: ord.id,
      payment_id: pay.id,
      case_type: 'PAYMENT_FAILURE',
      amount_at_risk: ord.amount,
      status: 'WAITING_FOR_OUTCOME'
    });

    // Simulate incoming trusted payment.captured webhook payload
    const webhookPayload = {
      event: 'payment.captured',
      payment: {
        entity: {
          id: 'pay_rzp_outcome_01',
          order_id: 'order_rzp_outcome_01',
          amount: 1500000,
          currency: 'INR',
          status: 'captured',
          method: 'upi'
        }
      }
    };

    const res = await reconciler.reconcilePaymentCaptured(webhookPayload, 'corr_outcome_test');
    assert.strictEqual(res.status, 'reconciled');
    assert.strictEqual(res.payment?.status, 'CAPTURED');
    assert.strictEqual(res.order?.status, 'PAID');

    // Verify recovery case state transition to RECOVERED
    const updatedCase = await caseRepo.findById(rc.id);
    assert.strictEqual(updatedCase?.status, 'RECOVERED');
    assert.strictEqual(updatedCase?.recovered_amount, 1500000);
    assert.strictEqual(updatedCase?.close_reason, 'PAYMENT_CAPTURED');
  });
});
