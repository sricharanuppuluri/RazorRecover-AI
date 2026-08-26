import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { createApp } from '../../apps/api/src/app';
import { RazorpayClient, RazorpayServiceError } from '../../apps/api/src/services/razorpay/client';
import { setRazorpayClientInstance } from '../../apps/api/src/services/razorpay.service';

const app = createApp();

describe('Phase 2 — Razorpay Test Mode & Checkout Integration Boundary Tests', () => {

  beforeEach(() => {
    // Reset Razorpay client before each test
    setRazorpayClientInstance(null);
  });

  afterEach(() => {
    setRazorpayClientInstance(null);
  });

  it('1. Handles missing Razorpay configuration gracefully', () => {
    const unconfiguredClient = new RazorpayClient({ keyId: '', keySecret: '' });
    assert.strictEqual(unconfiguredClient.isConfigured(), false);
    assert.strictEqual(unconfiguredClient.getKeyId(), '');
  });

  it('2. Accepts valid order creation input (amount in paise integer)', async () => {
    const mockClient = new RazorpayClient({ keyId: 'rzp_test_mockKey', keySecret: 'mockSecret', useMock: true });
    setRazorpayClientInstance(mockClient);

    const res = await request(app)
      .post('/api/orders')
      .send({
        merchantId: 'mch_test_01',
        customerId: 'cust_01',
        amount: 750000,
        currency: 'INR'
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.status, 'success');
    assert.strictEqual(res.body.data.order.amount, 750000);
    assert.strictEqual(res.body.data.checkout.amount, 750000);
    assert.ok(res.body.data.order.razorpay_order_id);
    assert.ok(res.body.data.checkout.razorpayOrderId);
  });

  it('3. Rejects zero amount order creation', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        merchantId: 'mch_test_01',
        customerId: 'cust_01',
        amount: 0,
        currency: 'INR'
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'INVALID_INPUT');
  });

  it('4. Rejects decimal/floating-point amounts', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        merchantId: 'mch_test_01',
        customerId: 'cust_01',
        amount: 7500.50,
        currency: 'INR'
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'INVALID_INPUT');
  });

  it('5. Rejects negative amount order creation', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        merchantId: 'mch_test_01',
        customerId: 'cust_01',
        amount: -5000,
        currency: 'INR'
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'INVALID_INPUT');
  });

  it('6. Rejects order creation with missing merchantId', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        customerId: 'cust_01',
        amount: 750000,
        currency: 'INR'
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'INVALID_INPUT');
  });

  it('7. Rejects order creation with missing customerId', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        merchantId: 'mch_test_01',
        amount: 750000,
        currency: 'INR'
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'INVALID_INPUT');
  });

  it('8. Creates Razorpay order successfully with mock adapter', async () => {
    const mockClient = new RazorpayClient({ keyId: 'rzp_test_mockKey', keySecret: 'mockSecret', useMock: true });
    setRazorpayClientInstance(mockClient);

    const razorpayOrder = await mockClient.createOrder({
      amount: 150000,
      currency: 'INR',
      receipt: 'rcpt_test_01'
    });

    assert.strictEqual(razorpayOrder.amount, 150000);
    assert.strictEqual(razorpayOrder.status, 'created');
    assert.ok(razorpayOrder.id.startsWith('order_mock_'));
  });

  it('9. Handles Razorpay API failure gracefully', async () => {
    const failingClient = new RazorpayClient({ keyId: 'invalid', keySecret: 'invalid' });
    // Override createOrder to simulate API failure
    failingClient.createOrder = async () => {
      throw new RazorpayServiceError('Razorpay API Authentication Failed', 401, { reason: 'BAD_AUTH' });
    };
    setRazorpayClientInstance(failingClient);

    const res = await request(app)
      .post('/api/orders')
      .send({
        merchantId: 'mch_test_01',
        customerId: 'cust_01',
        amount: 750000,
        currency: 'INR'
      });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error.code, 'RAZORPAY_API_ERROR');
    assert.strictEqual(res.body.error.message, 'Razorpay API Authentication Failed');
  });

  it('10. Persists razorpay_order_id in order response', async () => {
    const mockClient = new RazorpayClient({ keyId: 'rzp_test_mockKey', keySecret: 'mockSecret', useMock: true });
    setRazorpayClientInstance(mockClient);

    const res = await request(app)
      .post('/api/orders')
      .send({
        merchantId: 'mch_test_01',
        customerId: 'cust_01',
        amount: 2500000,
        currency: 'INR'
      });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.data.order.razorpay_order_id);
    assert.strictEqual(res.body.data.order.razorpay_order_id, res.body.data.checkout.razorpayOrderId);
  });

  it('11. Verifies RAZORPAY_KEY_SECRET is NEVER returned in API responses', async () => {
    const mockClient = new RazorpayClient({ keyId: 'rzp_test_public123', keySecret: 'SUPER_SECRET_KEY_456', useMock: true });
    setRazorpayClientInstance(mockClient);

    const res = await request(app)
      .post('/api/orders')
      .send({
        merchantId: 'mch_test_01',
        customerId: 'cust_01',
        amount: 750000,
        currency: 'INR'
      });

    const responseStr = JSON.stringify(res.body);
    assert.strictEqual(responseStr.includes('SUPER_SECRET_KEY_456'), false);
    assert.strictEqual(res.body.data.checkout.keyId, 'rzp_test_public123');
  });

  it('12. Order status remains CREATED (unpaid) after order creation', async () => {
    const mockClient = new RazorpayClient({ keyId: 'rzp_test_mockKey', keySecret: 'mockSecret', useMock: true });
    setRazorpayClientInstance(mockClient);

    const res = await request(app)
      .post('/api/orders')
      .send({
        merchantId: 'mch_test_01',
        customerId: 'cust_01',
        amount: 750000,
        currency: 'INR'
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.order.status, 'CREATED');
  });
});
