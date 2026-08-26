import { AllowedAction, FailureCategory } from '@razorrecover/shared-types';

export interface SyntheticRecord {
  transaction_id: string;
  order_id: string;
  customer_id: string;
  timestamp: string;
  amount: number; // integer paise
  payment_method: 'card' | 'upi' | 'netbanking' | 'wallet';
  bank_provider: string;
  failure_category: FailureCategory;
  error_source: string;
  error_step: string;
  error_reason: string;
  previous_success_count: number;
  previous_failure_count: number;
  customer_value_segment: 'standard' | 'silver' | 'gold' | 'platinum';
  checkout_duration_seconds: number;
  attempt_number: number;
  time_since_first_attempt: number; // in seconds
  recent_method_failure_rate: number; // analytical probability float 0..1
  recent_bank_failure_rate: number; // analytical probability float 0..1
  is_repeat_customer: boolean;
  is_high_value: boolean;
  ground_truth_recoverable: boolean;
  ground_truth_best_action: AllowedAction;
  ground_truth_recovered: boolean;
  recovered_amount: number; // integer paise, <= amount, 0 if not recovered
  intervention_cost: number; // integer paise
  contact_opt_in: boolean;
}
