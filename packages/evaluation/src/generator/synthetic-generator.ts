import { SeededPRNG } from './seeded-prng';
import { SyntheticRecord } from './synthetic-record.interface';
import {
  FAILURE_CATEGORY_DISTRIBUTION,
  PAYMENT_METHOD_DISTRIBUTION,
  BANK_PROVIDERS,
  CUSTOMER_SEGMENTS,
  ERROR_MAPPINGS
} from './distributions';
import { generateGroundTruth } from './ground-truth';

export interface GeneratorOptions {
  count?: number;
  seed?: number;
}

export function generateSyntheticDataset(options?: GeneratorOptions): SyntheticRecord[] {
  const count = options?.count || 10000;
  const seed = options?.seed !== undefined ? options.seed : 42;
  const prng = new SeededPRNG(seed);

  const records: SyntheticRecord[] = [];
  const baseTimestamp = new Date('2026-08-01T00:00:00Z').getTime();

  for (let i = 0; i < count; i++) {
    const idNum = (i + 1).toString().padStart(6, '0');
    const transaction_id = `txn_eval_${idNum}`;
    const order_id = `ord_eval_${idNum}`;
    const customer_id = `cust_eval_${(prng.nextInt(1, Math.max(10, Math.floor(count * 0.4)))).toString().padStart(5, '0')}`;

    // Timestamp spanning 30 days
    const timeOffsetMs = prng.nextInt(0, 30 * 24 * 3600 * 1000);
    const timestamp = new Date(baseTimestamp + timeOffsetMs).toISOString();

    // Category
    const failure_category = prng.weightedChoice(FAILURE_CATEGORY_DISTRIBUTION);

    // Payment Method & Bank
    const payment_method = prng.weightedChoice(PAYMENT_METHOD_DISTRIBUTION);
    const bank_provider = prng.weightedChoice(BANK_PROVIDERS);

    // Error details
    const errorMap = ERROR_MAPPINGS[failure_category];
    const error_source = errorMap.source;
    const error_step = errorMap.step;
    const error_reason = prng.choice(errorMap.reasons);

    // Customer history & Segment
    const customer_value_segment = prng.weightedChoice(CUSTOMER_SEGMENTS);
    const is_repeat_customer = prng.nextFloat() < 0.45;
    const previous_success_count = is_repeat_customer ? prng.nextInt(1, 15) : 0;
    const previous_failure_count = failure_category === 'REPEATED_FAILURE'
      ? prng.nextInt(3, 6)
      : prng.nextInt(0, 2);

    // Amount & High-value check (Paise: 100 INR to 50,000 INR)
    // High-value threshold: >= 1,500,000 paise (15,000 INR)
    let amount: number;
    if (prng.nextFloat() < 0.08) {
      // High value transaction
      amount = prng.nextInt(1500000, 5000000);
    } else {
      // Standard transaction
      amount = prng.nextInt(10000, 1499900);
    }
    const is_high_value = amount >= 1500000;

    // Attempts & duration
    const attempt_number = failure_category === 'REPEATED_FAILURE' ? prng.nextInt(3, 5) : prng.nextInt(1, 2);
    const checkout_duration_seconds = prng.nextInt(15, 600);
    const time_since_first_attempt = (attempt_number - 1) * prng.nextInt(60, 3600);

    // Failure rates (analytical floats)
    const recent_method_failure_rate = parseFloat((prng.nextFloat() * 0.25).toFixed(4));
    const recent_bank_failure_rate = failure_category === 'TEMPORARY_BANK_DEGRADATION'
      ? parseFloat((0.40 + prng.nextFloat() * 0.45).toFixed(4))
      : parseFloat((prng.nextFloat() * 0.15).toFixed(4));

    // Contact opt-in (~85% true)
    const contact_opt_in = prng.nextFloat() < 0.85;

    // Ground truth calculation
    const groundTruth = generateGroundTruth(prng, {
      category: failure_category,
      amount,
      isHighValue: is_high_value,
      isRepeatCustomer: is_repeat_customer,
      previousSuccessCount: previous_success_count,
      previousFailureCount: previous_failure_count,
      attemptNumber: attempt_number,
      timeSinceFirstAttempt: time_since_first_attempt,
      contactOptIn: contact_opt_in,
      bankProvider: bank_provider,
      paymentMethod: payment_method
    });

    records.push({
      transaction_id,
      order_id,
      customer_id,
      timestamp,
      amount,
      payment_method,
      bank_provider,
      failure_category,
      error_source,
      error_step,
      error_reason,
      previous_success_count,
      previous_failure_count,
      customer_value_segment,
      checkout_duration_seconds,
      attempt_number,
      time_since_first_attempt,
      recent_method_failure_rate,
      recent_bank_failure_rate,
      is_repeat_customer,
      is_high_value,
      ground_truth_recoverable: groundTruth.ground_truth_recoverable,
      ground_truth_best_action: groundTruth.ground_truth_best_action,
      ground_truth_recovered: groundTruth.ground_truth_recovered,
      recovered_amount: groundTruth.recovered_amount,
      intervention_cost: groundTruth.intervention_cost,
      contact_opt_in
    });
  }

  return records;
}
