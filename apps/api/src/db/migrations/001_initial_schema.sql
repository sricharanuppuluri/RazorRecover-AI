-- Migration 001: Initial Schema for RazorRecover AI
-- PostgreSQL DDL for Core Data Layer Entities

-- Create Custom Enum Types
CREATE TYPE currency_enum AS ENUM ('INR', 'USD', 'EUR');

CREATE TYPE order_status_enum AS ENUM ('CREATED', 'ATTEMPTED', 'PAID', 'ABANDONED', 'EXPIRED');

CREATE TYPE payment_status_enum AS ENUM ('CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED');

CREATE TYPE case_type_enum AS ENUM (
  'PAYMENT_FAILURE',
  'CHECKOUT_ABANDONMENT',
  'SUBSCRIPTION_FAILURE',
  'DEGRADATION'
);

CREATE TYPE case_status_enum AS ENUM (
  'NEW',
  'DETECTED',
  'DIAGNOSING',
  'SCORED',
  'AI_RECOMMENDED',
  'POLICY_CHECK',
  'HUMAN_REVIEW',
  'ACTION_PENDING',
  'ACTION_SENT',
  'WAITING_FOR_OUTCOME',
  'RECOVERED',
  'FAILED',
  'STOPPED'
);

CREATE TYPE allowed_action_enum AS ENUM (
  'WAIT_AND_RETRY',
  'OFFER_ALTERNATE_PAYMENT',
  'SEND_RECOVERY_LINK',
  'SEND_REMINDER',
  'ESCALATE_HUMAN',
  'STOP'
);

CREATE TYPE policy_decision_enum AS ENUM ('APPROVED', 'DENIED', 'HUMAN_REQUIRED');

CREATE TYPE actor_type_enum AS ENUM ('system', 'ai', 'merchant', 'customer');

CREATE TYPE processing_status_enum AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED', 'DUPLICATE', 'IGNORED');

-- 1. Merchants Table
CREATE TABLE merchants (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  currency currency_enum NOT NULL DEFAULT 'INR',
  test_mode BOOLEAN NOT NULL DEFAULT true,
  policy_profile_id VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Customers Table
CREATE TABLE customers (
  id VARCHAR(64) PRIMARY KEY,
  merchant_id VARCHAR(64) NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
  external_customer_id VARCHAR(128) NOT NULL,
  email_hash VARCHAR(128),
  phone_hash VARCHAR(128),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  successful_payment_count INT NOT NULL DEFAULT 0 CHECK (successful_payment_count >= 0),
  failed_payment_count INT NOT NULL DEFAULT 0 CHECK (failed_payment_count >= 0),
  total_success_value BIGINT NOT NULL DEFAULT 0 CHECK (total_success_value >= 0), -- Amount in paise
  total_failed_value BIGINT NOT NULL DEFAULT 0 CHECK (total_failed_value >= 0), -- Amount in paise
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  contact_opt_in BOOLEAN NOT NULL DEFAULT true,
  risk_flags TEXT[] NOT NULL DEFAULT '{}',
  CONSTRAINT uq_merchant_external_customer UNIQUE (merchant_id, external_customer_id)
);

-- 3. Orders Table
CREATE TABLE orders (
  id VARCHAR(64) PRIMARY KEY,
  merchant_id VARCHAR(64) NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
  razorpay_order_id VARCHAR(128) UNIQUE,
  customer_id VARCHAR(64) NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  amount BIGINT NOT NULL CHECK (amount >= 0), -- Amount in paise
  currency currency_enum NOT NULL DEFAULT 'INR',
  status order_status_enum NOT NULL DEFAULT 'CREATED',
  product_category VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checkout_started_at TIMESTAMPTZ,
  checkout_abandoned_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);

-- 4. Payments Table
CREATE TABLE payments (
  id VARCHAR(64) PRIMARY KEY,
  merchant_id VARCHAR(64) NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
  razorpay_payment_id VARCHAR(128) UNIQUE,
  razorpay_order_id VARCHAR(128),
  customer_id VARCHAR(64) NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  amount BIGINT NOT NULL CHECK (amount >= 0), -- Amount in paise
  currency currency_enum NOT NULL DEFAULT 'INR',
  method VARCHAR(64),
  bank VARCHAR(64),
  status payment_status_enum NOT NULL DEFAULT 'CREATED',
  error_code VARCHAR(64),
  error_description TEXT,
  error_source VARCHAR(64),
  error_step VARCHAR(64),
  error_reason VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  authorized_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ,
  failure_count INT NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  recovery_case_id VARCHAR(64)
);

-- 5. Recovery Cases Table
CREATE TABLE recovery_cases (
  id VARCHAR(64) PRIMARY KEY,
  merchant_id VARCHAR(64) NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  payment_id VARCHAR(64) REFERENCES payments(id) ON DELETE SET NULL,
  case_type case_type_enum NOT NULL,
  amount_at_risk BIGINT NOT NULL CHECK (amount_at_risk >= 0), -- Amount in paise
  recoverability_score DOUBLE PRECISION CHECK (recoverability_score >= 0.0 AND recoverability_score <= 1.0),
  expected_recovery_value BIGINT CHECK (expected_recovery_value >= 0), -- Amount in paise
  diagnosis TEXT,
  diagnosis_confidence DOUBLE PRECISION CHECK (diagnosis_confidence >= 0.0 AND diagnosis_confidence <= 1.0),
  recommended_action allowed_action_enum,
  action_confidence DOUBLE PRECISION CHECK (action_confidence >= 0.0 AND action_confidence <= 1.0),
  policy_decision policy_decision_enum,
  status case_status_enum NOT NULL DEFAULT 'NEW',
  retry_count INT NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  notification_count INT NOT NULL DEFAULT 0 CHECK (notification_count >= 0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  recovered_amount BIGINT DEFAULT 0 CHECK (recovered_amount >= 0), -- Amount in paise
  closed_at TIMESTAMPTZ,
  close_reason TEXT
);

-- Add foreign key constraint for payment's recovery_case_id after recovery_cases table creation
ALTER TABLE payments ADD CONSTRAINT fk_payment_recovery_case FOREIGN KEY (recovery_case_id) REFERENCES recovery_cases(id) ON DELETE SET NULL;

-- 6. AI Decisions Table
CREATE TABLE ai_decisions (
  id VARCHAR(64) PRIMARY KEY,
  recovery_case_id VARCHAR(64) NOT NULL REFERENCES recovery_cases(id) ON DELETE CASCADE,
  model VARCHAR(128) NOT NULL,
  prompt_version VARCHAR(64) NOT NULL,
  input_context_hash VARCHAR(128) NOT NULL,
  diagnosis TEXT NOT NULL,
  recovery_probability DOUBLE PRECISION NOT NULL CHECK (recovery_probability >= 0.0 AND recovery_probability <= 1.0),
  recommended_action allowed_action_enum NOT NULL,
  rationale TEXT NOT NULL,
  confidence DOUBLE PRECISION NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Policy Decisions Table
CREATE TABLE policy_decisions (
  id VARCHAR(64) PRIMARY KEY,
  recovery_case_id VARCHAR(64) NOT NULL REFERENCES recovery_cases(id) ON DELETE CASCADE,
  action allowed_action_enum NOT NULL,
  allowed BOOLEAN NOT NULL,
  reasons TEXT[] NOT NULL DEFAULT '{}',
  violated_rules TEXT[] NOT NULL DEFAULT '{}',
  requires_human BOOLEAN NOT NULL DEFAULT false,
  policy_version VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Audit Events Table
CREATE TABLE audit_events (
  id VARCHAR(64) PRIMARY KEY,
  merchant_id VARCHAR(64) NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
  recovery_case_id VARCHAR(64) REFERENCES recovery_cases(id) ON DELETE SET NULL,
  event_type VARCHAR(128) NOT NULL,
  actor_type actor_type_enum NOT NULL,
  actor_id VARCHAR(128),
  action VARCHAR(128) NOT NULL,
  input_summary TEXT,
  decision_summary TEXT,
  policy_result VARCHAR(128),
  outcome VARCHAR(128),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  correlation_id VARCHAR(128) NOT NULL
);

-- 9. Webhook Events Table
CREATE TABLE webhook_events (
  id VARCHAR(64) PRIMARY KEY,
  razorpay_event_id VARCHAR(128) NOT NULL UNIQUE,
  event_type VARCHAR(128) NOT NULL,
  signature_valid BOOLEAN NOT NULL,
  raw_body_hash VARCHAR(128) NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processing_status processing_status_enum NOT NULL DEFAULT 'RECEIVED',
  retry_count INT NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  error_message TEXT
);

-- Indexes for performance and lookup requirements
CREATE INDEX idx_customers_merchant_id ON customers(merchant_id);
CREATE INDEX idx_orders_merchant_id ON orders(merchant_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_razorpay_order_id ON orders(razorpay_order_id);

CREATE INDEX idx_payments_merchant_id ON payments(merchant_id);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_razorpay_order_id ON payments(razorpay_order_id);
CREATE INDEX idx_payments_razorpay_payment_id ON payments(razorpay_payment_id);

CREATE INDEX idx_recovery_cases_merchant_status ON recovery_cases(merchant_id, status);
CREATE INDEX idx_recovery_cases_order_id ON recovery_cases(order_id);
CREATE INDEX idx_recovery_cases_payment_id ON recovery_cases(payment_id);

CREATE INDEX idx_audit_events_recovery_case_id ON audit_events(recovery_case_id);
CREATE INDEX idx_audit_events_timestamp ON audit_events(timestamp);

CREATE INDEX idx_webhook_events_razorpay_event_id ON webhook_events(razorpay_event_id);
