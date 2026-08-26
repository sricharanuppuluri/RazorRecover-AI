import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateSyntheticDataset } from '../../packages/evaluation/src/generator/synthetic-generator';
import { splitDataset } from '../../packages/evaluation/src/split/dataset-split';

test('Phase 7 Synthetic Generator - Generate 5,000+ Records Deterministically', () => {
  const records1 = generateSyntheticDataset({ count: 5000, seed: 42 });
  const records2 = generateSyntheticDataset({ count: 5000, seed: 42 });

  assert.equal(records1.length, 5000);
  assert.equal(records2.length, 5000);
  assert.deepEqual(records1, records2, 'Seeded dataset generation must be 100% deterministic');
});

test('Phase 7 Synthetic Generator - Schema Completeness & Constraint Validation', () => {
  const records = generateSyntheticDataset({ count: 1000, seed: 123 });
  const seenTxnIds = new Set<string>();

  for (const record of records) {
    // Required fields check
    assert.ok(record.transaction_id, 'transaction_id must be non-empty');
    assert.ok(record.order_id, 'order_id must be non-empty');
    assert.ok(record.customer_id, 'customer_id must be non-empty');
    assert.ok(record.timestamp, 'timestamp must be non-empty');

    // Uniqueness
    assert.ok(!seenTxnIds.has(record.transaction_id), `Duplicate transaction_id: ${record.transaction_id}`);
    seenTxnIds.add(record.transaction_id);

    // Monetary bounds (Paise)
    assert.ok(record.amount > 0, 'amount must be positive');
    assert.ok(record.recovered_amount >= 0, 'recovered_amount cannot be negative');
    assert.ok(record.recovered_amount <= record.amount, 'recovered_amount cannot exceed amount');

    if (!record.ground_truth_recovered) {
      assert.equal(record.recovered_amount, 0, 'recovered_amount must be 0 if not recovered');
    }

    // Enum validations
    assert.ok(['card', 'upi', 'netbanking', 'wallet'].includes(record.payment_method));
    assert.ok(['standard', 'silver', 'gold', 'platinum'].includes(record.customer_value_segment));
    assert.ok([
      'TEMPORARY_BANK_DEGRADATION',
      'CUSTOMER_AUTHENTICATION_ISSUE',
      'INSUFFICIENT_FUNDS',
      'REPEATED_FAILURE',
      'CHECKOUT_ABANDONMENT',
      'UNKNOWN_OR_AMBIGUOUS',
      'ALREADY_CAPTURED'
    ].includes(record.failure_category));
    assert.ok([
      'WAIT_AND_RETRY',
      'OFFER_ALTERNATE_PAYMENT',
      'SEND_RECOVERY_LINK',
      'SEND_REMINDER',
      'ESCALATE_HUMAN',
      'STOP'
    ].includes(record.ground_truth_best_action));

    // Secret safety
    const str = JSON.stringify(record);
    assert.ok(!str.includes('RAZORPAY_KEY_SECRET'));
    assert.ok(!str.includes('cvv'));
  }
});

test('Phase 7 Synthetic Generator - Class & Property Distributions', () => {
  const records = generateSyntheticDataset({ count: 5000, seed: 999 });

  const categoryCounts: Record<string, number> = {};
  let optInCount = 0;
  let highValueCount = 0;

  for (const r of records) {
    categoryCounts[r.failure_category] = (categoryCounts[r.failure_category] || 0) + 1;
    if (r.contact_opt_in) optInCount++;
    if (r.is_high_value) highValueCount++;
  }

  // Check TEMPORARY_BANK_DEGRADATION (~24%)
  const bankDegradationRatio = categoryCounts['TEMPORARY_BANK_DEGRADATION'] / 5000;
  assert.ok(bankDegradationRatio >= 0.20 && bankDegradationRatio <= 0.28, `Bank degradation ratio ${bankDegradationRatio} out of expected range`);

  // Check Opt-in (~85%)
  const optInRatio = optInCount / 5000;
  assert.ok(optInRatio >= 0.80 && optInRatio <= 0.90, `Opt-in ratio ${optInRatio} out of expected range`);

  // Check High value (~5-12%)
  const highValueRatio = highValueCount / 5000;
  assert.ok(highValueRatio >= 0.05 && highValueRatio <= 0.12, `High value ratio ${highValueRatio} out of expected range`);
});

test('Phase 7 Dataset Splitter - 70/15/15 Split with Zero ID Overlap', () => {
  const records = generateSyntheticDataset({ count: 1000, seed: 777 });
  const split = splitDataset(records);

  assert.equal(split.dev.length, 700);
  assert.equal(split.val.length, 150);
  assert.equal(split.test.length, 150);

  const devIds = new Set(split.dev.map(r => r.transaction_id));
  const valIds = new Set(split.val.map(r => r.transaction_id));
  const testIds = new Set(split.test.map(r => r.transaction_id));

  for (const id of valIds) {
    assert.ok(!devIds.has(id), `Val ID ${id} overlaps with Dev`);
  }
  for (const id of testIds) {
    assert.ok(!devIds.has(id), `Test ID ${id} overlaps with Dev`);
    assert.ok(!valIds.has(id), `Test ID ${id} overlaps with Val`);
  }
});
