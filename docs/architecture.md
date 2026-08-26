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
Core Data Layer & Immutable Audit Trail
   │  • Payment, Order, Customer, WebhookEvent & AuditEvent Persistence
   │  • Audit Event Logging
   ▼
[Future Phases] Recovery Engine -> AI Decision Engine -> Policy Engine -> Action Executor
```

---

## Webhook Architecture (Phase 3 Detailed Flow)

```text
HTTP POST /api/webhooks/razorpay
  ├── 1. Express rawBody capture (req.rawBody)
  ├── 2. Signature verification (verifier.ts: HMAC-SHA256 sha256(rawBody, secret) vs x-razorpay-signature)
  │      └── Invalid → 400 Bad Request + Log audit event 'webhook_signature_rejected'
  ├── 3. Event ID check (x-razorpay-event-id)
  │      └── Missing → 400 Bad Request
  ├── 4. Idempotency Check (WebhookEventRepository.findByRazorpayEventId)
  │      └── Exists → 200 OK + { duplicate: true } (No duplicate processing)
  ├── 5. Persist WebhookEvent (status: 'RECEIVED')
  ├── 6. Dispatch to PaymentStateReconciler:
  │      ├── payment.failed     → Payment status FAILED (if not already CAPTURED/PAID)
  │      ├── payment.authorized → Payment status AUTHORIZED (if not already CAPTURED/PAID)
  │      ├── payment.captured   → Payment status CAPTURED, Order status PAID (Authoritative Success)
  │      ├── order.paid         → Order status PAID, Payment status CAPTURED
  │      └── unknown event      → Safely ignored (status: 'IGNORED')
  ├── 7. Audit Event Logging (logEvent with correlation_id)
  └── 8. Quick 200 OK Acknowledgement response
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

### 3. Audit Service & Event Persistence (Phase 3 Completed)
- **Role**: Records an immutable audit log (`audit_events` table) for every security decision, event arrival, deduplication, state transition, or out-of-order event.

### 4. Recovery Engine & State Machine (Phase 4+)
- **Role**: Tracks recovery workflows across standard lifecycle states (`NEW` → `DETECTED` → `DIAGNOSING` → `SCORED` → `AI_RECOMMENDED` → `POLICY_CHECK` → `ACTION_SENT` → `WAITING_FOR_OUTCOME` → `RECOVERED`/`STOPPED`/`HUMAN_REVIEW`).

### 5. AI Decision Engine & Deterministic Policy Engine (Phase 4+)
- **Role**: Diagnoses root causes, scores recovery probability, and evaluates deterministic policy guardrails before executing recovery actions.
