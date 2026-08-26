-- Migration 002: Phase 6 Recovery Actions & Recovery Links Tables

CREATE TABLE IF NOT EXISTS recovery_actions (
  id VARCHAR(64) PRIMARY KEY,
  recovery_case_id VARCHAR(64) NOT NULL REFERENCES recovery_cases(id) ON DELETE CASCADE,
  merchant_id VARCHAR(64) NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
  action_type allowed_action_enum NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  correlation_id VARCHAR(128) NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  attempt_number INT NOT NULL DEFAULT 1 CHECK (attempt_number >= 1),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  result_summary TEXT,
  error_code VARCHAR(64),
  error_message TEXT,
  simulation BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS recovery_links (
  id VARCHAR(64) PRIMARY KEY,
  recovery_case_id VARCHAR(64) NOT NULL REFERENCES recovery_cases(id) ON DELETE CASCADE,
  merchant_id VARCHAR(64) NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recovery_actions_case_id ON recovery_actions(recovery_case_id);
CREATE INDEX IF NOT EXISTS idx_recovery_actions_merchant_id ON recovery_actions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_recovery_actions_idempotency ON recovery_actions(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_recovery_links_token_hash ON recovery_links(token_hash);
CREATE INDEX IF NOT EXISTS idx_recovery_links_case_id ON recovery_links(recovery_case_id);
