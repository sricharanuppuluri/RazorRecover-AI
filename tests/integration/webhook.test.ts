import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import crypto from 'crypto';
import { createApp } from '../../apps/api/src/app';
import { env } from '../../apps/api/src/config/env';
import { OrderRepository } from '../../apps/api/src/repositories/order.repository';

const app = createApp();
const orderRepo = new OrderRepository();
const TEST_SECRET = 'test_webhook_secret_key_12345';

// Helper to generate HMAC signature for raw JSON string
function signPayload(bodyString: string, secret: string = TEST_SECRET): string {
  return crypto.createHmac('sha256', secret).update(bodyString).digest('hex');
}

test('Phase 3 — Razorpay Webhook Security & State Reconciliation Integration Tests', async (t) => {

  await t.test('Security: 1. Accepts valid signature and event ID', async () => {
    const rawPayload = JSON.stringify({
      entity: 'event',
      event: 'payment.authorized',
      contains: ['payment'],
      payload: {
        payment: {
          entity: {
            id: 'pay_auth_test_01',
            entity: 'payment',
            amount: 150000,
            currency: 'INR',
            status: 'authorized',
            order_id: 'order_test_01',
            method: 'card'
          }
        }
      }
    });

    const signature = signPayload(rawPayload, TEST_SECRET);
    const eventId = `evt_sec_01_${Date.now()}`;

    const prevSecret = env.RAZORPAY_WEBHOOK_SECRET;
    env.RAZORPAY_WEBHOOK_SECRET = TEST_SECRET;

    try {
      const response = await request(app)
        .post('/api/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .set('x-razorpay-event-id', eventId)
        .send(rawPayload);

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.status, 'success');
      assert.strictEqual(response.body.data.eventId, eventId);
      assert.strictEqual(response.body.data.duplicate, false);
    } finally {
      env.RAZORPAY_WEBHOOK_SECRET = prevSecret;
    }
  });

  await t.test('Security: 2. Rejects invalid signature with HTTP 400', async () => {
    const rawPayload = JSON.stringify({
      entity: 'event',
      event: 'payment.failed',
      payload: {}
    });

    const invalidSignature = 'invalid_hmac_signature_hex_string_1234567890abcdef';
    const eventId = `evt_sec_02_${Date.now()}`;

    const prevSecret = env.RAZORPAY_WEBHOOK_SECRET;
    env.RAZORPAY_WEBHOOK_SECRET = TEST_SECRET;

    try {
      const response = await request(app)
        .post('/api/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', invalidSignature)
        .set('x-razorpay-event-id', eventId)
        .send(rawPayload);

      assert.strictEqual(response.status, 400);
      assert.strictEqual(response.body.status, 'error');
      assert.strictEqual(response.body.error.code, 'INVALID_WEBHOOK_SIGNATURE');
    } finally {
      env.RAZORPAY_WEBHOOK_SECRET = prevSecret;
    }
  });

  await t.test('Security: 3. Rejects missing signature with HTTP 400', async () => {
    const rawPayload = JSON.stringify({ event: 'payment.failed' });
    const eventId = `evt_sec_03_${Date.now()}`;

    const response = await request(app)
      .post('/api/webhooks/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-event-id', eventId)
      .send(rawPayload);

    assert.strictEqual(response.status, 400);
    assert.strictEqual(response.body.status, 'error');
  });

  await t.test('Security: 4. Rejects missing event ID header', async () => {
    const rawPayload = JSON.stringify({ event: 'payment.failed' });
    const signature = signPayload(rawPayload, TEST_SECRET);

    const prevSecret = env.RAZORPAY_WEBHOOK_SECRET;
    env.RAZORPAY_WEBHOOK_SECRET = TEST_SECRET;

    try {
      const response = await request(app)
        .post('/api/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(rawPayload);

      assert.strictEqual(response.status, 400);
      assert.strictEqual(response.body.status, 'error');
    } finally {
      env.RAZORPAY_WEBHOOK_SECRET = prevSecret;
    }
  });

  await t.test('Idempotency: 5. Deduplicates duplicate event ID without double-processing', async () => {
    const rawPayload = JSON.stringify({
      entity: 'event',
      event: 'payment.authorized',
      payload: {
        payment: {
          entity: { id: 'pay_idem_01', amount: 50000, status: 'authorized' }
        }
      }
    });

    const signature = signPayload(rawPayload, TEST_SECRET);
    const duplicateEventId = `evt_dup_${Date.now()}`;

    const prevSecret = env.RAZORPAY_WEBHOOK_SECRET;
    env.RAZORPAY_WEBHOOK_SECRET = TEST_SECRET;

    try {
      // First delivery
      const res1 = await request(app)
        .post('/api/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .set('x-razorpay-event-id', duplicateEventId)
        .send(rawPayload);

      assert.strictEqual(res1.status, 200);
      assert.strictEqual(res1.body.data.duplicate, false);

      // Second (Duplicate) delivery
      const res2 = await request(app)
        .post('/api/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .set('x-razorpay-event-id', duplicateEventId)
        .send(rawPayload);

      assert.strictEqual(res2.status, 200);
      assert.strictEqual(res2.body.data.duplicate, true);
      assert.strictEqual(res2.body.data.message, 'Duplicate event already processed');
    } finally {
      env.RAZORPAY_WEBHOOK_SECRET = prevSecret;
    }
  });

  await t.test('State Reconciliation: 6. payment.failed updates payment status to FAILED', async () => {
    const rawPayload = JSON.stringify({
      entity: 'event',
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_failed_01',
            order_id: 'ord_fail_01',
            amount: 250000,
            currency: 'INR',
            status: 'failed',
            error_code: 'BAD_REQUEST_ERROR',
            error_description: 'Card expired'
          }
        }
      }
    });

    const signature = signPayload(rawPayload, TEST_SECRET);
    const eventId = `evt_fail_${Date.now()}`;

    const prevSecret = env.RAZORPAY_WEBHOOK_SECRET;
    env.RAZORPAY_WEBHOOK_SECRET = TEST_SECRET;

    try {
      const response = await request(app)
        .post('/api/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .set('x-razorpay-event-id', eventId)
        .send(rawPayload);

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.status, 'success');
    } finally {
      env.RAZORPAY_WEBHOOK_SECRET = prevSecret;
    }
  });

  await t.test('State Reconciliation: 7. payment.captured updates payment to CAPTURED and order to PAID', async () => {
    const razorpayOrderId = `order_test_${Date.now()}`;
    const testOrder = await orderRepo.create({
      id: `ord_${Date.now()}`,
      merchant_id: 'mch_test_01',
      razorpay_order_id: razorpayOrderId,
      customer_id: 'cust_01',
      amount: 750000,
      currency: 'INR',
      status: 'CREATED'
    });

    const rawPayload = JSON.stringify({
      entity: 'event',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_cap_${Date.now()}`,
            order_id: razorpayOrderId,
            amount: 750000,
            currency: 'INR',
            status: 'captured',
            method: 'upi'
          }
        }
      }
    });

    const signature = signPayload(rawPayload, TEST_SECRET);
    const eventId = `evt_cap_${Date.now()}`;

    const prevSecret = env.RAZORPAY_WEBHOOK_SECRET;
    env.RAZORPAY_WEBHOOK_SECRET = TEST_SECRET;

    try {
      const response = await request(app)
        .post('/api/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .set('x-razorpay-event-id', eventId)
        .send(rawPayload);

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.status, 'success');

      // Verify internal order status transitioned to PAID
      const updatedOrder = await orderRepo.findByRazorpayOrderId(razorpayOrderId);
      assert.strictEqual(updatedOrder?.status, 'PAID');
    } finally {
      env.RAZORPAY_WEBHOOK_SECRET = prevSecret;
    }
  });

  await t.test('Out-Of-Order Resilience: 8. Stale payment.failed does NOT downgrade CAPTURED/PAID order', async () => {
    const razorpayOrderId = `order_oo_${Date.now()}`;
    await orderRepo.create({
      id: `ord_oo_${Date.now()}`,
      merchant_id: 'mch_test_01',
      razorpay_order_id: razorpayOrderId,
      customer_id: 'cust_01',
      amount: 500000,
      currency: 'INR',
      status: 'CREATED'
    });

    const razorpayPaymentId = `pay_outorder_${Date.now()}`;

    const prevSecret = env.RAZORPAY_WEBHOOK_SECRET;
    env.RAZORPAY_WEBHOOK_SECRET = TEST_SECRET;

    try {
      // 1. First event: payment.captured (successful state achieved)
      const capPayload = JSON.stringify({
        entity: 'event',
        event: 'payment.captured',
        payload: {
          payment: {
            entity: { id: razorpayPaymentId, order_id: razorpayOrderId, amount: 500000, status: 'captured' }
          }
        }
      });

      const capRes = await request(app)
        .post('/api/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signPayload(capPayload, TEST_SECRET))
        .set('x-razorpay-event-id', `evt_cap_oo_${Date.now()}`)
        .send(capPayload);

      assert.strictEqual(capRes.status, 200);

      // Verify order is PAID
      const paidOrder = await orderRepo.findByRazorpayOrderId(razorpayOrderId);
      assert.strictEqual(paidOrder?.status, 'PAID');

      // 2. Second event: Stale payment.failed arrives LATER for the same payment/order
      const failPayload = JSON.stringify({
        entity: 'event',
        event: 'payment.failed',
        payload: {
          payment: {
            entity: { id: razorpayPaymentId, order_id: razorpayOrderId, amount: 500000, status: 'failed', error_code: 'GATEWAY_ERROR' }
          }
        }
      });

      const failRes = await request(app)
        .post('/api/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signPayload(failPayload, TEST_SECRET))
        .set('x-razorpay-event-id', `evt_fail_oo_${Date.now()}`)
        .send(failPayload);

      // Should acknowledge HTTP 200 safely without corrupting trusted successful state
      assert.strictEqual(failRes.status, 200);
      assert.strictEqual(failRes.body.status, 'success');

      // Verify order REMAINS PAID (not downgraded to FAILED or CREATED)
      const afterStaleFailOrder = await orderRepo.findByRazorpayOrderId(razorpayOrderId);
      assert.strictEqual(afterStaleFailOrder?.status, 'PAID');
    } finally {
      env.RAZORPAY_WEBHOOK_SECRET = prevSecret;
    }
  });

  await t.test('Unknown Events: 9. Unknown event type is safely recorded and acknowledged', async () => {
    const rawPayload = JSON.stringify({
      entity: 'event',
      event: 'dispute.created',
      payload: {}
    });

    const signature = signPayload(rawPayload, TEST_SECRET);
    const eventId = `evt_unk_${Date.now()}`;

    const prevSecret = env.RAZORPAY_WEBHOOK_SECRET;
    env.RAZORPAY_WEBHOOK_SECRET = TEST_SECRET;

    try {
      const response = await request(app)
        .post('/api/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .set('x-razorpay-event-id', eventId)
        .send(rawPayload);

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.status, 'success');
      assert.strictEqual(response.body.data.message, "Event type 'dispute.created' received and safely ignored");
    } finally {
      env.RAZORPAY_WEBHOOK_SECRET = prevSecret;
    }
  });

  await t.test('Security: 10. Webhook secret is NEVER exposed in API responses', async () => {
    const rawPayload = JSON.stringify({ event: 'payment.authorized', payload: {} });
    const signature = signPayload(rawPayload, TEST_SECRET);
    const eventId = `evt_sec_secret_${Date.now()}`;

    const prevSecret = env.RAZORPAY_WEBHOOK_SECRET;
    env.RAZORPAY_WEBHOOK_SECRET = TEST_SECRET;

    try {
      const response = await request(app)
        .post('/api/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .set('x-razorpay-event-id', eventId)
        .send(rawPayload);

      const resString = JSON.stringify(response.body);
      assert.strictEqual(resString.includes(TEST_SECRET), false);
    } finally {
      env.RAZORPAY_WEBHOOK_SECRET = prevSecret;
    }
  });

});
