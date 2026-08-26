# RazorRecover AI — Architecture Specification

## Overview

RazorRecover AI is a merchant-facing AI revenue-recovery agent designed for Razorpay test-mode payment flows. It turns 'payment failed' into 'revenue recovered' while keeping every action explainable, bounded, observable, and reversible.

---

## High-Level End-to-End Pipeline

```text
Razorpay (Test Mode)
   │
   ▼
Webhook Gateway (Phase 3 Completed)
   │  • Raw Request Body HMAC Signature Verification (X-Razorpay-Signature)
   │  • Idempotent Event ID Deduplication (x-razorpay-event-id header)
   │  • Fast HTTP Response Acknowledgement
   ▼
Event Ingestion & Persistence
   │  • Raw Body Hash & WebhookEvent Record Storage
   │  • Correlation ID Tracking (x-correlation-id)
   ▼
Payment State Reconciler (Phase 3 Completed)
   │  • Monotonic Payment & Order State Machine
   │  • Out-of-Order Delivery Guard (Protects CAPTURED / PAID states from stale failure downgrade)
   │  • Idempotent State Transitions
   ▼
Failure Taxonomy & Recovery Scoring (Phase 4 Completed)
   │  • Deterministic Root-Cause Diagnosis
   │  • Basis-Point (0-10,000) Integer Math for expectedRecoveryValue & priorityScore
   │  • High-Value Threshold Detection
   ▼
AI Decision Engine (Phase 5 Completed)
   │  • Generates diagnosis, recoveryProbability, recommendedAction, rationale, confidence
   │  • Strict JSON Schema Validation (Treats LLM output as UNTRUSTED input)
   │  • Deterministic SHA-256 Context Hashing & Prompt Injection Defense
   │  • LLM Provider Fallback (Defaults to ESCALATE with confidence 0.0 on error/timeout)
   ▼
Deterministic Policy Guardrails (Phase 5 Completed)
   │  • Final authority (ALLOW / DENY / ESCALATE)
   │  • Enforces financial safety, retry/notification limits, contact opt-in, high-value review
   │  • Versioned Policy Rules ('policy-v1')
   ▼
Immutable Audit Trail
   │  • AI_DECISION_GENERATED, AI_DECISION_FALLBACK_TRIGGERED, POLICY_EVALUATION_COMPLETED
   ▼
[Phase 6+] Action Execution Engine
```

---

## Component Breakdown

### 1. Webhook Gateway & Event Ingestion (Phase 3 Completed)
- **Role**: Secure entry point for Razorpay payment webhooks (`payment.failed`, `payment.captured`, `payment.authorized`, `order.paid`).
- **Security**: Verifies HMAC-SHA256 signature using `RAZORPAY_WEBHOOK_SECRET` and raw request payload (`req.rawBody`) via timing-safe comparison (`crypto.timingSafeEqual`).
- **Reliability**: Guarantees fast acknowledgment (2xx) and deduplicates based on `x-razorpay-event-id`.

### 2. Payment State Reconciler (Phase 3 Completed)
- **Role**: Reconciles payment and order state upon receiving verified webhooks.
- **Out-of-Order Safety**: Enforces monotonic state transition rules. If a late `payment.failed` event arrives after a transaction has reached `CAPTURED` or `PAID`, the failure is ignored to preserve financial state integrity.

### 3. Failure Taxonomy & Recovery Risk Engine (Phase 4 Completed)
- **Role**: Categorizes failed payments (e.g. `TEMPORARY_BANK_DEGRADATION`, `CUSTOMER_AUTHENTICATION_ISSUE`, `INSUFFICIENT_FUNDS`, `REPEATED_FAILURE`, `CHECKOUT_ABANDONMENT`).
- **Scoring**: Calculates `expectedRecoveryValue` using integer-safe basis-point arithmetic and `priorityScore` (0-100).

### 4. AI Decision Engine (Phase 5 Completed)
- **Role**: Advisory decision-support system model that generates structured recommendations (`RETRY`, `NOTIFY`, `ESCALATE`, `NO_ACTION`).
- **Schema & Security**: Validated strictly via `validateAIDecisionOutput`. Excludes API keys, secrets, and raw credentials from prompt text and context hashes (`hashContext`). Fallbacks safely to `ESCALATE` if LLM fails or times out.

### 5. Deterministic Policy Guardrail Engine (Phase 5 Completed)
- **Role**: Final deterministic gatekeeper serving as absolute authority over AI recommendations.
- **Rules**:
  - Rejects paid/captured or zero amount transactions (`PAYMENT_ALREADY_CAPTURED`, `ZERO_AMOUNT_AT_RISK`).
  - Enforces retry limits (max 3) and notification limits (max 2).
  - Enforces customer contact opt-in (`CUSTOMER_CONTACT_NOT_ALLOWED`).
  - Escalates high-value transactions (`HIGH_VALUE_REQUIRES_REVIEW`) or low AI confidence (< 0.60).
  - Versioned under `policy-v1`.
