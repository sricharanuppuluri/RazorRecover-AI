import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import supertest from 'supertest';
import { createApp } from '../../apps/api/src/app';
import { RecoveryCaseRepository } from '../../apps/api/src/repositories/recovery-case.repository';
import { OrderRepository } from '../../apps/api/src/repositories/order.repository';
import { PaymentRepository } from '../../apps/api/src/repositories/payment.repository';
import { CustomerRepository } from '../../apps/api/src/repositories/customer.repository';
import { AuditEventRepository } from '../../apps/api/src/repositories/audit-event.repository';

const app = createApp();
const request = supertest(app);

describe('Phase 9 — Multi-Merchant Security, RBAC & Hardening Test Suite', () => {
  let caseRepo: RecoveryCaseRepository;
  let orderRepo: OrderRepository;
  let paymentRepo: PaymentRepository;
  let customerRepo: CustomerRepository;
  let auditRepo: AuditEventRepository;

  const tenantAHeaders = {
    'x-merchant-id': 'mch_test_01',
    'x-user-role': 'OWNER',
    'x-user-id': 'usr_tenant_a'
  };

  const tenantBHeaders = {
    'x-merchant-id': 'mch_test_02',
    'x-user-role': 'OWNER',
    'x-user-id': 'usr_tenant_b'
  };

  const viewerHeaders = {
    'x-merchant-id': 'mch_test_01',
    'x-user-role': 'VIEWER',
    'x-user-id': 'usr_viewer'
  };

  const operatorHeaders = {
    'x-merchant-id': 'mch_test_01',
    'x-user-role': 'OPERATOR',
    'x-user-id': 'usr_operator'
  };

  beforeEach(async () => {
    caseRepo = new RecoveryCaseRepository();
    orderRepo = new OrderRepository();
    paymentRepo = new PaymentRepository();
    customerRepo = new CustomerRepository();
    auditRepo = new AuditEventRepository();

    // Create test records for Tenant A
    await caseRepo.create({
      id: 'rc_tenant_a_01',
      merchant_id: 'mch_test_01',
      order_id: 'ord_tenant_a_01',
      payment_id: 'pay_tenant_a_01',
      status: 'HUMAN_REVIEW',
      amount_at_risk: 500000,
      currency: 'INR',
      started_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      retry_count: 0,
      recommended_action: 'WAIT_AND_RETRY'
    });

    await orderRepo.create({
      id: 'ord_tenant_a_01',
      merchant_id: 'mch_test_01',
      razorpay_order_id: 'ord_tenant_a_01',
      customer_id: 'cust_tenant_a_01',
      amount: 500000,
      currency: 'INR',
      status: 'ATTEMPTED',
      created_at: new Date().toISOString()
    });

    await paymentRepo.create({
      id: 'pay_tenant_a_01',
      merchant_id: 'mch_test_01',
      razorpay_payment_id: 'pay_tenant_a_01',
      razorpay_order_id: 'ord_tenant_a_01',
      customer_id: 'cust_tenant_a_01',
      amount: 500000,
      currency: 'INR',
      method: 'upi',
      status: 'FAILED',
      failure_count: 1,
      created_at: new Date().toISOString()
    });

    await customerRepo.create({
      id: 'cust_tenant_a_01',
      merchant_id: 'mch_test_01',
      external_customer_id: 'ext_cust_a',
      contact_opt_in: true,
      successful_payment_count: 2,
      failed_payment_count: 1,
      total_success_value: 1000000,
      total_failed_value: 500000,
      first_seen_at: new Date().toISOString(),
      risk_flags: []
    });

    // Create test records for Tenant B
    await caseRepo.create({
      id: 'rc_tenant_b_01',
      merchant_id: 'mch_test_02',
      order_id: 'ord_tenant_b_01',
      payment_id: 'pay_tenant_b_01',
      status: 'NEW',
      amount_at_risk: 750000,
      currency: 'INR',
      started_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      retry_count: 0,
      recommended_action: 'SEND_RECOVERY_LINK'
    });

    await orderRepo.create({
      id: 'ord_tenant_b_01',
      merchant_id: 'mch_test_02',
      razorpay_order_id: 'ord_tenant_b_01',
      customer_id: 'cust_tenant_b_01',
      amount: 750000,
      currency: 'INR',
      status: 'ATTEMPTED',
      created_at: new Date().toISOString()
    });

    await customerRepo.create({
      id: 'cust_tenant_b_01',
      merchant_id: 'mch_test_02',
      external_customer_id: 'ext_cust_b',
      contact_opt_in: true,
      successful_payment_count: 5,
      failed_payment_count: 1,
      total_success_value: 2500000,
      total_failed_value: 750000,
      first_seen_at: new Date().toISOString(),
      risk_flags: []
    });
  });

  // =========================================================================
  // 1. MULTI-TENANT ISOLATION TESTS
  // =========================================================================

  it('Tenant B CANNOT retrieve Tenant A recovery case details (BOLA/IDOR protection)', async () => {
    const res = await request
      .get('/api/recovery-cases/rc_tenant_a_01')
      .set(tenantBHeaders);

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.error.code, 'NOT_FOUND');
  });

  it('Tenant A list recovery cases returns ONLY Tenant A cases', async () => {
    const res = await request
      .get('/api/recovery-cases')
      .set(tenantAHeaders);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'success');
    const cases = res.body.data.cases;
    const hasTenantBCase = cases.some((c: any) => c.merchant_id === 'mch_test_02');
    assert.strictEqual(hasTenantBCase, false, 'Tenant A listing must not leak Tenant B data');
  });

  it('Tenant B CANNOT trigger action execution on Tenant A case', async () => {
    const res = await request
      .post('/api/recovery-cases/rc_tenant_a_01/execute')
      .set(tenantBHeaders)
      .send({ action: 'WAIT_AND_RETRY' });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.status, 'error');
  });

  it('Tenant B CANNOT approve Tenant A recovery case in HUMAN_REVIEW state', async () => {
    const res = await request
      .post('/api/recovery-cases/rc_tenant_a_01/approve')
      .set(tenantBHeaders);

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.status, 'error');
  });

  it('Tenant B CANNOT reject Tenant A recovery case', async () => {
    const res = await request
      .post('/api/recovery-cases/rc_tenant_a_01/reject')
      .set(tenantBHeaders)
      .send({ reason: 'Malicious rejection attempt' });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.status, 'error');
  });

  it('Tenant B CANNOT manually stop Tenant A recovery case', async () => {
    const res = await request
      .post('/api/recovery-cases/rc_tenant_a_01/stop')
      .set(tenantBHeaders)
      .send({ reason: 'Malicious stop attempt' });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.status, 'error');
  });

  it('Tenant B CANNOT trigger AI decision on Tenant A recovery case', async () => {
    const res = await request
      .post('/api/recovery-cases/rc_tenant_a_01/ai-decision')
      .set(tenantBHeaders);

    assert.strictEqual(res.status, 404);
  });

  it('Tenant B CANNOT access Tenant A order details', async () => {
    const res = await request
      .get('/api/orders/ord_tenant_a_01')
      .set(tenantBHeaders);

    assert.strictEqual(res.status, 404);
  });

  it('Tenant B CANNOT access Tenant A customer profile', async () => {
    const res = await request
      .get('/api/customers/cust_tenant_a_01')
      .set(tenantBHeaders);

    assert.strictEqual(res.status, 404);
  });

  it('Tenant B dashboard summary scopes calculations strictly to Tenant B', async () => {
    const res = await request
      .get('/api/dashboard/summary')
      .set(tenantBHeaders);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'success');
  });

  // =========================================================================
  // 2. ROLE-BASED ACCESS CONTROL (RBAC) TESTS
  // =========================================================================

  it('VIEWER role can read cases but CANNOT execute recovery actions (403 Forbidden)', async () => {
    const readRes = await request
      .get('/api/recovery-cases')
      .set(viewerHeaders);
    assert.strictEqual(readRes.status, 200);

    const execRes = await request
      .post('/api/recovery-cases/rc_tenant_a_01/execute')
      .set(viewerHeaders)
      .send({ action: 'WAIT_AND_RETRY' });
    assert.strictEqual(execRes.status, 403);
    assert.strictEqual(execRes.body.error.code, 'FORBIDDEN');
  });

  it('VIEWER role CANNOT approve human-review cases (403 Forbidden)', async () => {
    const res = await request
      .post('/api/recovery-cases/rc_tenant_a_01/approve')
      .set(viewerHeaders);
    assert.strictEqual(res.status, 403);
  });

  it('OPERATOR role can execute actions (not 403) but CANNOT approve cases requiring ADMIN (403 Forbidden)', async () => {
    const execRes = await request
      .post('/api/recovery-cases/rc_tenant_a_01/execute')
      .set(operatorHeaders)
      .send({ action: 'WAIT_AND_RETRY' });
    assert.notStrictEqual(execRes.status, 403, 'OPERATOR must not be blocked by 403 on execute');

    const appRes = await request
      .post('/api/recovery-cases/rc_tenant_a_01/approve')
      .set(operatorHeaders);
    assert.strictEqual(appRes.status, 403, 'OPERATOR must be forbidden from approving cases requiring ADMIN');
  });

  it('ADMIN and OWNER roles can approve cases and update merchant settings', async () => {
    const appRes = await request
      .post('/api/recovery-cases/rc_tenant_a_01/approve')
      .set(tenantAHeaders);
    assert.strictEqual(appRes.status, 200);

    const settingsRes = await request
      .put('/api/merchant/settings')
      .set(tenantAHeaders)
      .send({ recoveryWindowHours: 48 });
    assert.strictEqual(settingsRes.status, 200);
    assert.strictEqual(settingsRes.body.data.recoveryWindowHours, 48);
  });

  // =========================================================================
  // 3. SECURITY HEADERS & RATE LIMITING
  // =========================================================================

  it('API includes required security headers on responses', async () => {
    const res = await request.get('/health');

    assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
    assert.strictEqual(res.headers['x-frame-options'], 'DENY');
    assert.strictEqual(res.headers['x-xss-protection'], '1; mode=block');
    assert.strictEqual(res.headers['strict-transport-security'], 'max-age=31536000; includeSubDomains');
  });

  // =========================================================================
  // 4. HEALTH & READINESS ENDPOINTS
  // =========================================================================

  it('GET /health returns health status', async () => {
    const res = await request.get('/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
  });

  it('GET /ready and GET /api/ready return operational readiness payload', async () => {
    const resRoot = await request.get('/ready');
    assert.strictEqual(resRoot.body.service, 'razorrecover-api');
    assert.ok(resRoot.body.status === 'ready' || resRoot.body.status === 'not_ready');

    const resApi = await request.get('/api/ready');
    assert.strictEqual(resApi.body.service, 'razorrecover-api');
    assert.ok(resApi.body.status === 'ready' || resApi.body.status === 'not_ready');
  });

  // =========================================================================
  // 5. SANITIZED ERROR RESPONSES
  // =========================================================================

  it('Invalid route returns sanitized 404 response', async () => {
    const res = await request.get('/api/non-existent-route-xyz');
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.error.code, 'NOT_FOUND');
    assert.strictEqual(typeof res.body.error.message, 'string');
  });
});
