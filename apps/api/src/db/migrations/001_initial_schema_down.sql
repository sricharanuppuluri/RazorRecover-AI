-- Migration 001 Rollback: Drop all tables, constraints, and enums

DROP TABLE IF EXISTS webhook_events CASCADE;
DROP TABLE IF EXISTS audit_events CASCADE;
DROP TABLE IF EXISTS policy_decisions CASCADE;
DROP TABLE IF EXISTS ai_decisions CASCADE;
ALTER TABLE IF EXISTS payments DROP CONSTRAINT IF EXISTS fk_payment_recovery_case;
DROP TABLE IF EXISTS recovery_cases CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS merchants CASCADE;

DROP TYPE IF EXISTS processing_status_enum CASCADE;
DROP TYPE IF EXISTS actor_type_enum CASCADE;
DROP TYPE IF EXISTS policy_decision_enum CASCADE;
DROP TYPE IF EXISTS allowed_action_enum CASCADE;
DROP TYPE IF EXISTS case_status_enum CASCADE;
DROP TYPE IF EXISTS case_type_enum CASCADE;
DROP TYPE IF EXISTS payment_status_enum CASCADE;
DROP TYPE IF EXISTS order_status_enum CASCADE;
DROP TYPE IF EXISTS currency_enum CASCADE;
