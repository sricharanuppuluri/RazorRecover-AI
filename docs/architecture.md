# RazorRecover AI — Architecture Specification

## Overview

RazorRecover AI is a merchant-facing AI revenue-recovery agent designed for Razorpay test-mode payment flows. It turns 'payment failed' into 'revenue recovered' while keeping every action explainable, bounded, observable, and reversible.

---

## High-Level End-to-End Pipeline

```text
Razorpay (Test Mode)
   │
   ▼
Webhook Gateway
   │  • Signature Verification (X-Razorpay-Signature)
   │  • Idempotent Deduplication (x-razorpay-event-id)
   │  • Fast HTTP ACK
   ▼
Event Processing Pipeline
   │  • State Reconciliation (Order/Payment state)
   │  • Revenue at Risk Calculation
   │  • Customer Context Lookup
   ▼
Recovery Engine Orchestrator
   │  • Failure Diagnosis & Taxonomy Mapping
   │  • Recovery Opportunity Scoring
   ▼
AI Decision Engine (LLM)
   │  • Cause Interpretation & Explanation
   │  • Strategy Recommendation (JSON Schema Validated)
   ▼
Policy Engine & Guardrails (Deterministic Authority)
   │  • Rule Violations Check (Retry limits, frequency caps)
   │  • High-Value Human Approval Check
   ▼
Action Executor
   │  • Bounded Intervention Execution (Alternate Payment / Link / Wait)
   ▼
Outcome Observer
   │  • Subsequent Payment Event Monitoring (payment.captured)
   ▼
Audit Trail & Analytics Service
   │  • Immutable Event Logging (Correlation ID tracking)
   │  • Failure Degradation Clustering & Metrics
   ▼
Merchant Dashboard
      • KPI Summary, Case Queue & Simulation Interface
```

---

## Component Breakdown

### 1. Webhook Gateway & Event Ingestion
- **Role**: Secure entry point for Razorpay payment webhooks (`payment.failed`, `payment.captured`, `payment.authorized`, `order.paid`).
- **Security**: Verifies HMAC-SHA256 signature using `RAZORPAY_WEBHOOK_SECRET` and raw request payload.
- **Reliability**: Guarantees fast acknowledgment (2xx) and deduplicates based on `x-razorpay-event-id`.

### 2. State & Context Storage
- **Role**: Maintains normalized models for `Merchant`, `Customer`, `Order`, `Payment`, `RecoveryCase`, and `AuditEvent`.
- **Database**: PostgreSQL with connection pooling via `DATABASE_URL`.

### 3. Recovery Engine & State Machine
- **Role**: Tracks recovery workflows across standard lifecycle states (`NEW` → `DETECTED` → `DIAGNOSING` → `SCORED` → `AI_RECOMMENDED` → `POLICY_CHECK` → `ACTION_SENT` → `WAITING_FOR_OUTCOME` → `RECOVERED`/`STOPPED`/`HUMAN_REVIEW`).

### 4. AI Decision Engine
- **Role**: Receives minimal, non-sensitive context to diagnose root causes and recommend recovery actions.
- **Output**: JSON payload matching strict schema (`diagnosis`, `recovery_probability`, `recommended_action`, `rationale`).

### 5. Deterministic Policy Engine
- **Role**: The final authorizing authority. Enforces monetary and operational guardrails (Max 2 retries, Max 2 notifications, 24h recovery window, human approval for high-value transactions).

### 6. Action Executor & Outcome Observer
- **Role**: Executes policy-approved actions and observes subsequent Razorpay events to close cases as `RECOVERED` or `STOPPED`.

---

## Phase 0 Foundation Status

In **Phase 0**, only the foundation components exist:
- Express API server setup with clean separation (`routes`, `controllers`, `services`, `middleware`, `config`).
- React landing shell with live backend health monitor.
- Centralized error handling and request logging.
- Safe PostgreSQL pool configuration setup.
- Strict environment variable and Git safety policies.
- Monorepo package workspace architecture.

Future pipeline components (webhooks, AI decision engine, policy rules, action executor, synthetic datasets) are strictly reserved for subsequent build phases.
