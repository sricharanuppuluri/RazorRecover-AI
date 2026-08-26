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
  high_value_threshold?: number; // In paise (default: 10000000 = ₹1,00,000)
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
  | 'RETRY'
  | 'NOTIFY'
  | 'ESCALATE'
  | 'NO_ACTION'
  | 'WAIT_AND_RETRY'
  | 'OFFER_ALTERNATE_PAYMENT'
  | 'SEND_RECOVERY_LINK'
  | 'SEND_REMINDER'
  | 'ESCALATE_HUMAN'
  | 'STOP';

export interface PolicyProfile {
  id: string;
  merchant_id: string;
  max_retry_attempts: number;
  max_notifications: number;
  high_value_threshold: number; // In paise
  min_recovery_probability: number; // [0, 1]
  min_ai_confidence: number; // [0, 1]
  recovery_window_hours: number;
  created_at: string;
  updated_at: string;
}

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
  priority_score?: number;
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

export type RecoveryActionStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';

export interface RecoveryAction {
  id: string;
  recovery_case_id: string;
  merchant_id: string;
  action_type: AllowedAction;
  status: RecoveryActionStatus;
  correlation_id: string;
  idempotency_key: string;
  attempt_number: number;
  requested_at: string;
  started_at?: string;
  completed_at?: string;
  expires_at?: string;
  result_summary?: string;
  error_code?: string;
  error_message?: string;
  simulation?: boolean;
}

export interface RecoveryLink {
  id: string;
  recovery_case_id: string;
  merchant_id: string;
  order_id: string;
  token_hash: string;
  token_raw?: string;
  expires_at: string;
  used_at?: string;
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

// Phase 4 Failure Taxonomy & Recovery Risk Types
export type FailureCategory =
  | 'TEMPORARY_BANK_DEGRADATION'
  | 'CUSTOMER_AUTHENTICATION_ISSUE'
  | 'INSUFFICIENT_FUNDS'
  | 'REPEATED_FAILURE'
  | 'CHECKOUT_ABANDONMENT'
  | 'HIGH_VALUE_TRANSACTION'
  | 'UNKNOWN_OR_AMBIGUOUS'
  | 'ALREADY_CAPTURED';

export type ReasonCode =
  | 'ALREADY_CAPTURED'
  | 'REPEATED_FAILURES'
  | 'AUTHENTICATION_FAILURE'
  | 'INSUFFICIENT_FUNDS_SIGNAL'
  | 'RECENT_BANK_FAILURE_SPIKE'
  | 'RECENT_METHOD_FAILURE_SPIKE'
  | 'HIGH_VALUE_TRANSACTION'
  | 'CHECKOUT_TIMEOUT'
  | 'INSUFFICIENT_EVIDENCE';

export interface DiagnosisResult {
  category: FailureCategory;
  explanation: string;
  confidence: number; // Deterministic rule confidence [0, 1]
  reasonCodes: ReasonCode[];
}

export interface RecoveryAnalysisResult {
  paymentId?: string;
  orderId?: string;
  merchantId: string;
  amountAtRisk: number; // In paise
  diagnosis: DiagnosisResult;
  recoveryProbability: number; // Deterministic baseline [0, 1]
  expectedRecoveryValue: number; // In paise
  priorityScore: number;
  highValue: boolean;
  recoveryCaseId?: string;
  eligibleForRecovery: boolean;
}

// Phase 5 AI Decision & Policy Engine Types
export interface AIInputContext {
  merchant: {
    id: string;
    currency: Currency;
    policyProfileId: string;
    highValueThreshold: number;
  };
  customer: {
    successfulPaymentCount: number;
    failedPaymentCount: number;
    contactOptIn: boolean;
    totalSuccessValue: number;
  };
  order: {
    id: string;
    amount: number;
    currency: Currency;
    status: OrderStatus;
    productCategory?: string;
    createdAt: string;
  };
  payment?: {
    id: string;
    method?: string;
    bank?: string;
    status: PaymentStatus;
    errorCode?: string;
    errorDescription?: string;
    errorSource?: string;
    errorStep?: string;
    errorReason?: string;
    failureCount: number;
  };
  analysis: RecoveryAnalysisResult;
}

export interface AIDecisionOutput {
  diagnosis: string;
  recoveryProbability: number; // [0.0, 1.0]
  recommendedAction: AllowedAction;
  rationale: string;
  confidence: number; // [0.0, 1.0]
}

export interface PolicyEvaluationResult {
  action: AllowedAction;
  allowed: boolean;
  reasons: string[];
  violatedRules: string[];
  requiresHuman: boolean;
  policyVersion: string;
}

export interface AIDecisionPipelineResult {
  recoveryCaseId: string;
  deterministicAnalysis: RecoveryAnalysisResult;
  aiDecision: AIDecisionOutput & {
    id: string;
    model: string;
    promptVersion: string;
    inputContextHash: string;
    createdAt: string;
  };
  policyDecision: PolicyEvaluationResult & {
    id: string;
    createdAt: string;
  };
}

