/**
 * RazorRecover AI - Shared Core Types
 * Single source of truth interfaces aligned with Project Specification
 */

export interface HealthResponse {
  status: 'ok' | 'error';
  service: string;
  timestamp: string;
  version: string;
  environment: string;
  database: 'connected' | 'disconnected' | 'unconfigured';
}

export type Currency = 'INR' | 'USD' | 'EUR';

export interface Merchant {
  id: string;
  name: string;
  currency: Currency;
  test_mode: boolean;
  policy_profile_id: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  merchant_id: string;
  external_customer_id: string;
  email_hash?: string;
  phone_hash?: string;
  first_seen_at: string;
  successful_payment_count: number;
  failed_payment_count: number;
  total_success_value: number; // In smallest currency units (paise)
  total_failed_value: number; // In smallest currency units (paise)
  last_success_at?: string;
  last_failure_at?: string;
  contact_opt_in: boolean;
  risk_flags: string[];
}

export type OrderStatus = 'CREATED' | 'ATTEMPTED' | 'PAID' | 'ABANDONED' | 'EXPIRED';

export interface Order {
  id: string;
  merchant_id: string;
  razorpay_order_id: string;
  customer_id: string;
  amount: number; // In paise
  currency: Currency;
  status: OrderStatus;
  product_category?: string;
  created_at: string;
  checkout_started_at?: string;
  checkout_abandoned_at?: string;
  paid_at?: string;
}

export type PaymentStatus = 'CREATED' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'REFUNDED';

export interface Payment {
  id: string;
  merchant_id: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  customer_id: string;
  amount: number; // In paise
  currency: Currency;
  method?: string;
  bank?: string;
  status: PaymentStatus;
  error_code?: string;
  error_description?: string;
  error_source?: string;
  error_step?: string;
  error_reason?: string;
  created_at: string;
  authorized_at?: string;
  captured_at?: string;
  failure_count: number;
  recovery_case_id?: string;
}

export type CaseStatus =
  | 'NEW'
  | 'DETECTED'
  | 'DIAGNOSING'
  | 'SCORED'
  | 'AI_RECOMMENDED'
  | 'POLICY_CHECK'
  | 'HUMAN_REVIEW'
  | 'ACTION_PENDING'
  | 'ACTION_SENT'
  | 'WAITING_FOR_OUTCOME'
  | 'RECOVERED'
  | 'FAILED'
  | 'STOPPED';

export type AllowedAction =
  | 'WAIT_AND_RETRY'
  | 'OFFER_ALTERNATE_PAYMENT'
  | 'SEND_RECOVERY_LINK'
  | 'SEND_REMINDER'
  | 'ESCALATE_HUMAN'
  | 'STOP';

export interface RecoveryCase {
  id: string;
  merchant_id: string;
  order_id: string;
  payment_id?: string;
  case_type: 'PAYMENT_FAILURE' | 'CHECKOUT_ABANDONMENT' | 'SUBSCRIPTION_FAILURE' | 'DEGRADATION';
  amount_at_risk: number; // In paise
  recoverability_score?: number; // [0, 1]
  expected_recovery_value?: number; // In paise
  diagnosis?: string;
  diagnosis_confidence?: number;
  recommended_action?: AllowedAction;
  action_confidence?: number;
  policy_decision?: 'APPROVED' | 'DENIED' | 'HUMAN_REQUIRED';
  status: CaseStatus;
  retry_count: number;
  notification_count: number;
  started_at: string;
  expires_at: string;
  recovered_amount?: number;
  closed_at?: string;
  close_reason?: string;
}

export interface AIDecision {
  id: string;
  recovery_case_id: string;
  model: string;
  prompt_version: string;
  input_context_hash: string;
  diagnosis: string;
  recovery_probability: number;
  recommended_action: AllowedAction;
  rationale: string;
  confidence: number;
  created_at: string;
}

export interface PolicyDecision {
  id: string;
  recovery_case_id: string;
  action: AllowedAction;
  allowed: boolean;
  reasons: string[];
  violated_rules: string[];
  requires_human: boolean;
  policy_version: string;
  created_at: string;
}

export type ActorType = 'system' | 'ai' | 'merchant' | 'customer';

export interface AuditEvent {
  id: string;
  merchant_id: string;
  recovery_case_id: string;
  event_type: string;
  actor_type: ActorType;
  actor_id?: string;
  action: string;
  input_summary?: string;
  decision_summary?: string;
  policy_result?: string;
  outcome?: string;
  timestamp: string;
  correlation_id: string;
}

export interface WebhookEvent {
  id: string;
  razorpay_event_id: string;
  event_type: string;
  signature_valid: boolean;
  raw_body_hash: string;
  received_at: string;
  processed_at?: string;
  processing_status: 'RECEIVED' | 'PROCESSED' | 'FAILED' | 'DUPLICATE' | 'IGNORED';
  retry_count: number;
  error_message?: string;
}

export interface CreateRazorpayOrderInput {
  amount: number; // in smallest currency units (paise)
  currency?: Currency;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResponse {
  id: string;
  entity: 'order';
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt?: string;
  status: 'created' | 'attempted' | 'paid';
  attempts: number;
  notes?: Record<string, string>;
  created_at: number;
}

