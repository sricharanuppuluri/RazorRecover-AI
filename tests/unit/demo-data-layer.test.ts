import test from 'node:test';
import assert from 'node:assert/strict';
import { DemoDataService } from '../../apps/api/src/services/demo-data.service';
import { RecoveryCaseRepository } from '../../apps/api/src/repositories/recovery-case.repository';
import { CustomerRepository } from '../../apps/api/src/repositories/customer.repository';
import { AuditEventRepository } from '../../apps/api/src/repositories/audit-event.repository';
import { MerchantRepository } from '../../apps/api/src/repositories/merchant.repository';

test('Demo Data Layer - Deterministic Seeding and Counts', async () => {
  const counts = await DemoDataService.seedAll(true);

  assert.equal(counts.merchantsCount, 4);
  assert.equal(counts.customersCount, 15);
  assert.ok(counts.casesCount >= 20, 'Should seed at least 20 recovery cases');
  assert.ok(counts.auditEventsCount >= 50, 'Should seed comprehensive audit trail');
});

test('Demo Data Layer - Tenant Isolation Across Merchants', async () => {
  await DemoDataService.seedAll(true);
  const caseRepo = new RecoveryCaseRepository();

  const { cases: casesM1 } = await caseRepo.findAll({ merchantId: 'mch_test_01', limit: 100 });
  const { cases: casesM2 } = await caseRepo.findAll({ merchantId: 'merchant_demo_001', limit: 100 });

  assert.ok(casesM1.length > 0, 'Merchant 1 should have recovery cases');
  assert.ok(casesM2.length > 0, 'Merchant 2 should have recovery cases');

  for (const c of casesM1) {
    assert.equal(c.merchant_id, 'mch_test_01', 'All cases for M1 must strictly belong to M1');
  }

  for (const c of casesM2) {
    assert.equal(c.merchant_id, 'merchant_demo_001', 'All cases for M2 must strictly belong to M2');
  }
});

test('Demo Data Layer - No Real PII in Synthetic Customers', async () => {
  await DemoDataService.seedAll(true);
  const customerRepo = new CustomerRepository();

  const cust1 = await customerRepo.findById('cust_demo_001');
  assert.ok(cust1, 'Synthetic customer should exist');

  // Verify email and phone are hashed / non-PII
  assert.ok(cust1.email_hash?.startsWith('hash_'), 'Email must be hashed');
  assert.ok(cust1.email_hash?.endsWith('@example.com'), 'Email hash domain must be example.com');
  assert.ok(cust1.phone_hash?.startsWith('hash_'), 'Phone must be hashed');
});

test('Demo Data Layer - Integer Paise Monetary Amounts', async () => {
  await DemoDataService.seedAll(true);
  const caseRepo = new RecoveryCaseRepository();
  const { cases } = await caseRepo.findAll({ limit: 100 });

  for (const c of cases) {
    assert.ok(Number.isInteger(c.amount_at_risk), `Amount at risk ${c.amount_at_risk} must be an integer (paise)`);
    assert.ok(c.amount_at_risk >= 10000, 'All demo amounts should be in integer paise >= 10000 (₹100)');
    if (c.recovered_amount) {
      assert.ok(Number.isInteger(c.recovered_amount), `Recovered amount ${c.recovered_amount} must be integer paise`);
    }
  }
});

test('Demo Data Layer - Recovery State Machine & Payment Evidence Semantics', async () => {
  await DemoDataService.seedAll(true);
  const caseRepo = new RecoveryCaseRepository();
  const { cases } = await caseRepo.findAll({ limit: 100 });

  const recoveredCases = cases.filter(c => c.status === 'RECOVERED');
  assert.ok(recoveredCases.length >= 5, 'Should have multiple recovered cases');

  for (const c of recoveredCases) {
    assert.ok(c.recovered_amount && c.recovered_amount > 0, 'RECOVERED case must have a valid recovered_amount');
    assert.equal(c.close_reason, 'PAYMENT_CAPTURED', 'RECOVERED case close_reason must strictly be PAYMENT_CAPTURED');
  }

  const stoppedCases = cases.filter(c => c.status === 'STOPPED');
  assert.ok(stoppedCases.length >= 3, 'Should have stopped cases due to policy rules');
  for (const c of stoppedCases) {
    assert.ok(c.close_reason, 'STOPPED case must have a valid close_reason');
  }
});

test('Demo Data Layer - Human Review Queue Population', async () => {
  await DemoDataService.seedAll(true);
  const caseRepo = new RecoveryCaseRepository();
  const { cases } = await caseRepo.findAll({ limit: 100 });

  const humanReviewCases = cases.filter(c => c.status === 'HUMAN_REVIEW');
  assert.ok(humanReviewCases.length >= 5, 'Should have at least 5 cases in human review queue');

  const highValueHr = humanReviewCases.find(c => c.amount_at_risk >= 10000000);
  assert.ok(highValueHr, 'Human review queue should contain high-value cases');

  const lowConfidenceHr = humanReviewCases.find(c => (c.diagnosis_confidence || 1) < 0.70);
  assert.ok(lowConfidenceHr, 'Human review queue should contain low confidence AI cases');
});

test('Demo Data Layer - No Secrets or Sensitive Credentials in Seeded Data', async () => {
  await DemoDataService.seedAll(true);
  const auditRepo = new AuditEventRepository();
  const { events } = await auditRepo.findAll({ limit: 200 });

  const secretKeywords = ['rzp_live_', 'rzp_test_', 'secret_', 'password', 'bearer ', 'sk_live_'];

  for (const ev of events) {
    const serialized = JSON.stringify(ev).toLowerCase();
    for (const kw of secretKeywords) {
      assert.ok(!serialized.includes(kw), `Audit event ${ev.id} must not contain secret keyword: ${kw}`);
    }
  }
});
