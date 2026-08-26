# RazorRecover AI — Threat Model & Security Specification

## Security Principles & Mandates

RazorRecover AI is designed with strict security controls separating AI decision support from deterministic financial authority.

---

## Core Security Mandates

### 1. Server-Side Secret Management
- **Rule**: `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `LLM_API_KEY`, and `DATABASE_URL` must remain strictly server-side.
- **Enforcement**: Secrets are loaded via `dotenv` in the Express backend (`apps/api`) and never exposed to the frontend bundle or client APIs. `RAZORPAY_WEBHOOK_SECRET` and `LLM_API_KEY` are never returned in API responses or written to logs.

### 2. Webhook Integrity & Signature Verification (Phase 3 Implemented)
- **Rule**: Incoming webhooks from Razorpay must be verified using HMAC-SHA256 signature verification (`x-razorpay-signature`) over the unparsed raw request body buffer (`req.rawBody`).
- **Protection**: Prevents forgery, unauthorized payment state injection, and payload modification attacks. Uses timing-safe string comparison (`crypto.timingSafeEqual`) to eliminate timing side-channel attacks.

### 3. Webhook Idempotency & Replay Attack Defense (Phase 3 Implemented)
- **Rule**: Every incoming webhook is deduplicated using the `x-razorpay-event-id` header against unique constraints in the `webhook_events` database table.
- **Protection**: Duplicate event deliveries are acknowledged safely (HTTP 200) without double-processing, double-counting revenue, or creating duplicate state transitions.

### 4. Monotonic Financial State Transitions (Phase 3 Implemented)
- **Rule**: The payment reconciler enforces monotonic state progress (`CREATED` < `AUTHORIZED` < `CAPTURED`).
- **Protection**: Out-of-order webhook delivery (e.g. `payment.failed` arriving after `payment.captured`) cannot downgrade a trusted successful payment or paid order back to a failed state.

### 5. AI Output Untrusted Handling & Schema Validation (Phase 5 Implemented)
- **Rule**: LLM outputs are treated as untrusted input.
- **Enforcement**: Parsed and validated strictly against `AIDecisionOutputSchema`. Any invalid JSON, missing fields, or out-of-bound numerical values trigger an automatic fallback to `ESCALATE` with `confidence: 0.0`.

### 6. Prompt Injection Defense & Secret Stripping (Phase 5 Implemented)
- **Rule**: Prompts strictly structure inputs under context blocks and instruct model to treat user text (e.g., error description, product category) as raw data, NEVER system instructions.
- **Enforcement**: All secrets, DB credentials, webhook keys, and raw credit card numbers are stripped prior to constructing prompt payloads and SHA-256 context hashes.

### 7. Deterministic Policy Override (Phase 5 Implemented)
- **Rule**: The LLM acts purely as a decision-support component with **ZERO** direct authority over money movement or system actions.
- **Enforcement**: All LLM recommendations must pass through the deterministic Policy Engine before any action execution. High-value transactions, limit breaches, or low confidence always escalate to human review.

### 8. PII Minimization & Git Safety
- **Rule**: Customer email and phone identifiers are tokenized or hashed (`email_hash`, `phone_hash`) before storage or processing. `.gitignore` strictly excludes `.env` and `.env.*` files.

---

## Threat Matrix & Mitigation Controls

| Threat Vector | Severity | Impact | Mitigation Strategy | Phase Status |
| --- | --- | --- | --- | --- |
| Webhook Forgery / Tampering | High | Unauthorized state updates | HMAC-SHA256 signature check using `req.rawBody` + timing-safe comparison | **Phase 3 Implemented** |
| Webhook Replay / Duplicate Delivery | Medium | Double state transitions / double counting | Deduplication by `x-razorpay-event-id` in `webhook_events` table | **Phase 3 Implemented** |
| Out-Of-Order Event Delivery | Medium | Financial state corruption | Monotonic status transition rules & success preservation | **Phase 3 Implemented** |
| Secrets Exposure | Critical | Key compromise | Server-side env isolation + `.gitignore` enforcement | **Phase 0+ Implemented** |
| Prompt Injection | High | Malicious action recommendation | Schema validation + Context hashing + Policy Engine override | **Phase 5 Implemented** |
| Malformed / Hallucinated AI Output | High | Unsafe system state | Strict Zod/Schema validator + Safe Fallback to `ESCALATE` | **Phase 5 Implemented** |
| Unauthorized Financial Action | High | Financial loss / policy breach | Deterministic Policy Engine (final authority) + Human escalation for high value | **Phase 5 Implemented** |
