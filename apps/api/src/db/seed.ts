import { getDbPool } from '../config/database';

export async function seedDatabase(): Promise<void> {
  console.log('[Seeder] Starting deterministic development seeding...');
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Clean existing seed data (Idempotent seed)
    await client.query('DELETE FROM audit_events');
    await client.query('DELETE FROM policy_decisions');
    await client.query('DELETE FROM ai_decisions');
    await client.query('UPDATE payments SET recovery_case_id = NULL');
    await client.query('DELETE FROM recovery_cases');
    await client.query('DELETE FROM payments');
    await client.query('DELETE FROM orders');
    await client.query('DELETE FROM customers');
    await client.query('DELETE FROM merchants');

    // 2. Insert 1 Merchant
    const merchantId = 'mch_test_01';
    await client.query(`
      INSERT INTO merchants (id, name, currency, test_mode, policy_profile_id)
      VALUES ($1, $2, $3, $4, $5)
    `, [merchantId, 'Acme Retail Store (Test)', 'INR', true, 'policy_std_01']);

    // 3. Insert 2 Customers (email/phone hashed, non-PII)
    const customer1Id = 'cust_01';
    const customer2Id = 'cust_02';

    await client.query(`
      INSERT INTO customers (
        id, merchant_id, external_customer_id, email_hash, phone_hash,
        successful_payment_count, failed_payment_count, total_success_value, total_failed_value,
        contact_opt_in, risk_flags
      ) VALUES
      ($1, $2, 'ext_cust_1001', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', '88d4266ec4e4733d596489a2e379c6d3d927c3c5ed9d', 3, 1, 1500000, 750000, true, ARRAY['REPEAT_CUSTOMER']),
      ($3, $2, 'ext_cust_1002', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', '1f8257001416733633630f9a941e17d52674e2d3128b', 1, 0, 450000, 0, true, ARRAY[]::text[])
    `, [customer1Id, merchantId, customer2Id]);

    // 4. Insert 2 Orders
    const order1Id = 'ord_1001';
    const order2Id = 'ord_1002';
    const razorpayOrderId1 = 'order_N76dSFGk8sL2qA';
    const razorpayOrderId2 = 'order_N76eTHHl9tM3rB';

    await client.query(`
      INSERT INTO orders (
        id, merchant_id, razorpay_order_id, customer_id, amount, currency, status, product_category
      ) VALUES
      ($1, $3, $4, $5, 750000, 'INR', 'ATTEMPTED', 'Electronics'),
      ($2, $3, $6, $7, 450000, 'INR', 'PAID', 'Apparel')
    `, [order1Id, order2Id, merchantId, razorpayOrderId1, customer1Id, razorpayOrderId2, customer2Id]);

    // 5. Insert 3 Payments (2 failed for order 1, 1 captured for order 2)
    const payment1Id = 'pay_2001';
    const payment2Id = 'pay_2002';
    const payment3Id = 'pay_2003';
    const razorpayPaymentId1 = 'pay_N76gUIIm0uN4sC';
    const razorpayPaymentId2 = 'pay_N76hVJJn1vO5tD';
    const razorpayPaymentId3 = 'pay_N76iWKKo2wP6uE';

    await client.query(`
      INSERT INTO payments (
        id, merchant_id, razorpay_payment_id, razorpay_order_id, customer_id, amount, currency,
        method, bank, status, error_code, error_description, error_source, error_step, error_reason, failure_count
      ) VALUES
      ($1, $4, $5, $6, $7, 750000, 'INR', 'upi', 'HDFC', 'FAILED', 'BAD_REQUEST_ERROR', 'Bank technical error', 'issuer', 'payment_authorization', 'payment_degraded', 1),
      ($2, $4, $8, $6, $7, 750000, 'INR', 'card', 'ICICI', 'FAILED', 'BAD_REQUEST_ERROR', 'Authentication failed', 'customer', 'payment_authentication', 'auth_failed', 2),
      ($3, $4, $9, $10, $11, 450000, 'INR', 'upi', 'SBI', 'CAPTURED', NULL, NULL, NULL, NULL, NULL, 0)
    `, [
      payment1Id, payment2Id, payment3Id,
      merchantId, razorpayPaymentId1, razorpayOrderId1, customer1Id,
      razorpayPaymentId2, razorpayPaymentId3, razorpayOrderId2, customer2Id
    ]);

    // 6. Insert 1 Recovery Case for Order 1
    const caseId = 'rc_case_3001';
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await client.query(`
      INSERT INTO recovery_cases (
        id, merchant_id, order_id, payment_id, case_type, amount_at_risk, recoverability_score,
        expected_recovery_value, diagnosis, diagnosis_confidence, recommended_action, action_confidence,
        policy_decision, status, retry_count, notification_count, expires_at
      ) VALUES (
        $1, $2, $3, $4, 'PAYMENT_FAILURE', 750000, 0.85, 637500,
        'Temporary bank degradation detected on HDFC UPI rail', 0.91, 'OFFER_ALTERNATE_PAYMENT', 0.88,
        'APPROVED', 'ACTION_PENDING', 1, 0, $5
      )
    `, [caseId, merchantId, order1Id, payment2Id, expiresAt]);

    // Link payment 2 to recovery case
    await client.query('UPDATE payments SET recovery_case_id = $1 WHERE id = $2', [caseId, payment2Id]);

    // 7. Insert 1 AI Decision
    const aiDecisionId = 'aid_4001';
    await client.query(`
      INSERT INTO ai_decisions (
        id, recovery_case_id, model, prompt_version, input_context_hash, diagnosis,
        recovery_probability, recommended_action, rationale, confidence
      ) VALUES (
        $1, $2, 'gemini-2.5-flash', 'v1.0.0', 'hash_ctx_8f9a2b',
        'Temporary bank degradation detected on HDFC UPI rail',
        0.85, 'OFFER_ALTERNATE_PAYMENT',
        'Customer attempted payment twice across different rails. HDFC rail shows 15% spike in failures.',
        0.88
      )
    `, [aiDecisionId, caseId]);

    // 8. Insert 1 Policy Decision
    const policyDecisionId = 'pdec_5001';
    await client.query(`
      INSERT INTO policy_decisions (
        id, recovery_case_id, action, allowed, reasons, violated_rules, requires_human, policy_version
      ) VALUES (
        $1, $2, 'OFFER_ALTERNATE_PAYMENT', true,
        ARRAY['Within retry limit (1/2)', 'Amount ₹7,500 below high-value human threshold'],
        ARRAY[]::text[], false, 'v1.0.0'
      )
    `, [policyDecisionId, caseId]);

    // 9. Insert 3 Audit Events
    await client.query(`
      INSERT INTO audit_events (
        id, merchant_id, recovery_case_id, event_type, actor_type, actor_id, action,
        input_summary, decision_summary, policy_result, outcome, correlation_id
      ) VALUES
      ('aud_6001', $1, $2, 'RECOVERY_CASE_CREATED', 'system', 'system_event_bus', 'CASE_INITIALIZED', 'Payment failed event ingested', 'Created recovery case for ₹7,500', 'N/A', 'SUCCESS', 'corr_882910'),
      ('aud_6002', $1, $2, 'AI_DECISION_GENERATED', 'ai', 'gemini-2.5-flash', 'RECOMMEND_ACTION', 'Order amount ₹7,500, error: bank_degraded', 'Recommended OFFER_ALTERNATE_PAYMENT with 85% probability', 'N/A', 'SUCCESS', 'corr_882910'),
      ('aud_6003', $1, $2, 'POLICY_EVALUATED', 'system', 'policy_engine_v1', 'EVALUATE_RULES', 'Action: OFFER_ALTERNATE_PAYMENT', 'Approved action under RULE-003 and RULE-006', 'APPROVED', 'SUCCESS', 'corr_882910')
    `, [merchantId, caseId]);

    await client.query('COMMIT');
    console.log('[Seeder] Development seed completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Seeder Error] Failed to seed database:', err);
    throw err;
  } finally {
    client.release();
  }
}

// CLI runner
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
