# RazorRecover AI — Threat Model & Security Specification

## Security Principles & Mandates

RazorRecover AI is designed with strict security controls separating AI decision support from deterministic financial authority.

---

## Core Security Mandates

### 1. Server-Side Secret Management
- **Rule**: `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `LLM_API_KEY`, and `DATABASE_URL` must remain strictly server-side.
- **Enforcement**: Secrets are loaded via `dotenv` in the Express backend (`apps/api`) and never exposed to the frontend bundle or client APIs.

### 2. Webhook Integrity & Signature Verification
- **Rule**: Incoming webhooks from Razorpay must be verified using HMAC-SHA256 signature verification (`X-Razorpay-Signature`) over the unparsed raw request body.
- **Protection**: Prevents forgery, unauthorized payment state injection, and replay attacks.

### 3. Separation of AI Recommendation & Financial Authority
- **Rule**: The LLM acts purely as a decision-support component. It has **ZERO** direct authority over money movement or system actions.
- **Enforcement**: All LLM recommendations must pass through a deterministic Policy Engine before any action execution.

### 4. Zero Secrets Sent to LLM Context
- **Rule**: Prompt context provided to the LLM must never include API keys, credentials, database passwords, or customer payment card details.
- **Protection**: Prevents prompt injection or model leakage of sensitive merchant/customer tokens.

### 5. Deterministic Policy Guardrails
- **Rule**: Financial guardrails (max retries, max notifications, high-value transaction thresholds) are hardcoded in code/config and cannot be altered by AI output.

### 6. PII Minimization
- **Rule**: Customer email and phone identifiers are tokenized or hashed (`email_hash`, `phone_hash`) before storage or processing.

### 7. Git & Version Control Safety
- **Rule**: Secrets must never be committed to Git repositories.
- **Enforcement**: `.gitignore` strictly excludes `.env` and `.env.*` files. `.env.example` contains placeholders only.

---

## Threat Matrix & Mitigation Controls

| Threat Vector | Severity | Impact | Mitigation Strategy |
| --- | --- | --- | --- |
| Webhook Forgery | High | Unauthorized state updates | HMAC-SHA256 signature check using raw body |
| Secrets Exposure | Critical | Key compromise | Server-side env isolation + `.gitignore` enforcement |
| Prompt Injection | High | Malicious action recommendation | Schema validation + Deterministic Policy Engine override |
| Duplicate Event Processing | Medium | Double messaging / retry spam | Event deduplication by `x-razorpay-event-id` |
| Unauthorized Financial Action | High | Financial loss / policy breach | Hardcoded stopping rules and human approval for high values |

---

## Phase 0 Security Verification Status

- Server-side environment isolation configured in `apps/api/src/config/env.ts`.
- Git protection established with `.gitignore` and sanitized `.env.example`.
- Frontend environment contains zero sensitive API keys or credentials.
