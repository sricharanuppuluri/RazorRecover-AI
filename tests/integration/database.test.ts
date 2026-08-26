import { describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { createApp } from '../../apps/api/src/app';

const app = createApp();

describe('Phase 1 - Database Layer & Endpoint Validation Tests', () => {

  it('Health endpoint (Phase 0 compatibility) returns HTTP 200', async () => {
    const res = await request(app).get('/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.strictEqual(res.body.service, 'razorrecover-api');
  });

  describe('Input Validation: Merchant Endpoint', () => {
    it('rejects merchant creation with missing id', async () => {
      const res = await request(app).post('/api/merchants').send({ name: 'Acme' });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, 'INVALID_INPUT');
    });

    it('rejects merchant creation with invalid currency', async () => {
      const res = await request(app).post('/api/merchants').send({ id: 'mch_1', name: 'Acme', currency: 'INVALID' });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, 'INVALID_INPUT');
    });
  });

  describe('Input Validation: Customer Endpoint', () => {
    it('rejects customer creation with missing external_customer_id', async () => {
      const res = await request(app).post('/api/customers').send({ id: 'cust_1', merchant_id: 'mch_1' });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, 'INVALID_INPUT');
    });

    it('rejects negative total_success_value', async () => {
      const res = await request(app).post('/api/customers').send({
        id: 'cust_1',
        merchant_id: 'mch_1',
        external_customer_id: 'ext_1',
        total_success_value: -500
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, 'INVALID_INPUT');
    });
  });

  describe('Input Validation: Order Endpoint (Money Safety)', () => {
    it('rejects order with negative amount', async () => {
      const res = await request(app).post('/api/orders').send({
        id: 'ord_1',
        merchant_id: 'mch_1',
        customer_id: 'cust_1',
        amount: -1000
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, 'INVALID_INPUT');
    });

    it('rejects floating-point non-integer amounts', async () => {
      const res = await request(app).post('/api/orders').send({
        id: 'ord_1',
        merchant_id: 'mch_1',
        customer_id: 'cust_1',
        amount: 75.50
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, 'INVALID_INPUT');
    });

    it('rejects invalid order status', async () => {
      const res = await request(app).post('/api/orders').send({
        id: 'ord_1',
        merchant_id: 'mch_1',
        customer_id: 'cust_1',
        amount: 750000,
        status: 'INVALID_STATUS'
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, 'INVALID_INPUT');
    });
  });

  describe('Input Validation: Payment Endpoint', () => {
    it('rejects payment with negative amount', async () => {
      const res = await request(app).post('/api/payments').send({
        id: 'pay_1',
        merchant_id: 'mch_1',
        customer_id: 'cust_1',
        amount: -5000
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, 'INVALID_INPUT');
    });

    it('rejects payment with invalid status', async () => {
      const res = await request(app).post('/api/payments').send({
        id: 'pay_1',
        merchant_id: 'mch_1',
        customer_id: 'cust_1',
        amount: 500000,
        status: 'PENDING_FOO'
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, 'INVALID_INPUT');
    });
  });

  describe('Input Validation: Recovery Case Endpoint', () => {
    it('rejects recovery case with negative amount_at_risk', async () => {
      const res = await request(app).post('/api/recovery-cases').send({
        id: 'rc_1',
        merchant_id: 'mch_1',
        order_id: 'ord_1',
        case_type: 'PAYMENT_FAILURE',
        amount_at_risk: -100
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, 'INVALID_INPUT');
    });

    it('rejects recovery case with invalid case_type', async () => {
      const res = await request(app).post('/api/recovery-cases').send({
        id: 'rc_1',
        merchant_id: 'mch_1',
        order_id: 'ord_1',
        case_type: 'INVALID_CASE_TYPE',
        amount_at_risk: 750000
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, 'INVALID_INPUT');
    });
  });
});
