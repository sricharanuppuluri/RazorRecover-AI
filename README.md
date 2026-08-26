# RazorRecover AI — Merchant Revenue Recovery System

## 1. Project Name
**RazorRecover AI** (Razorpay AI Buildathon — Track 03: AI Revenue Recovery)

## 2. Description
RazorRecover AI is an AI-powered revenue-recovery platform designed for merchants using Razorpay test-mode payment flows. It detects revenue at risk from payment failures, payment degradation, and checkout abandonment, diagnoses root causes using an AI decision engine, scores recovery probability, and evaluates policy-bounded interventions while maintaining an immutable audit trail and strict financial guardrails.

## 3. Current Phase
**Phase 5 — AI Decision Engine + Policy Guardrails (Completed)**

> [!IMPORTANT]
> Phase 5 implements the AI Decision Engine and deterministic Policy Guardrail Engine:
> - **Provider Abstraction & Schema Validation**: Decoupled LLM integration with `validateAIDecisionOutput` treating LLM responses as untrusted input.
> - **Prompt Injection Defense & Context Hashing**: Deterministic SHA-256 context hashing (`hashContext`) and strict prompt structure excluding secrets, API keys, and credentials.
> - **LLM Fallback**: Automatic safe fallback to `ESCALATE` (confidence 0.0) upon provider timeout, rate limit, or invalid response format.
> - **Deterministic Policy Engine**: Final authority enforcing financial rules (`ALLOW`/`DENY`/`ESCALATE`), retry limits, notification limits, customer opt-in, and high-value transaction human review.
> - **Execution Boundary**: Financial action execution remains strictly disabled in Phase 5 to ensure decision safety and compliance.

## 4. Architecture Overview
```text
Razorpay (Test Mode) → Webhook Gateway (HMAC Signature Verification) 
         ↓
Event ID Deduplication & Persistence (WebhookEvent Table)
         ↓
Payment State Reconciler (Monotonic Out-of-Order Safe Transitions)
         ↓
Failure Taxonomy & Recovery Risk Engine (Integer Basis-Point Calculations)
         ↓
AI Decision Engine (Schema-Validated Structured Output & LLM Fallback)
         ↓
Deterministic Policy Engine (Final Authority: ALLOW / DENY / ESCALATE)
         ↓
Trusted Internal State & Immutable Audit Trail (AuditEvent Table)
```

## 5. Technology Stack
- **Frontend**: React 18, Vite, Tailwind CSS, TypeScript, Lucide Icons
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL (Driver: `pg` Pool)
- **Policy Engine**: Package workspace (`@razorrecover/policy-engine`)
- **Monorepo**: npm workspaces
- **Testing & Quality**: TypeScript, Node test runner

## 6. Project Structure
```text
razorrecover/
├── apps/
│   ├── web/                     # React + Tailwind CSS landing & app shell
│   └── api/                     # Express + TypeScript API server
├── packages/
│   ├── shared-types/            # Shared TypeScript data types & interfaces
│   ├── policy-engine/           # Deterministic policy guardrails & versioned rules
│   ├── recovery-engine/         # Recovery orchestrator & state machine
│   └── evaluation/              # Synthetic evaluation & metrics runner
├── tests/
│   ├── unit/                    # Unit tests (Phase 4 & Phase 5 engine tests)
│   └── integration/             # Health, API, Webhook & AI-Policy pipeline integration tests
├── docs/
│   ├── architecture.md          # Architecture specification & data flow
│   ├── threat-model.md          # Security principles & threat matrix
│   └── demo-script.md          # Step-by-step verification guide
├── .env.example                 # Environment template with placeholders
├── .gitignore                    # Secrets & build outputs ignore rules
├── package.json                 # Monorepo workspace configuration
└── README.md                    # Project documentation
```

## 7. Webhook Gateway & Security (`POST /api/webhooks/razorpay`)

### Security Features
1. **Raw Body Verification**: Express JSON parsing is configured to preserve the exact raw request body buffer (`req.rawBody`). Signature calculation uses `crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)`.
2. **Timing-Safe Comparison**: Signatures are compared using `crypto.timingSafeEqual` to prevent timing attacks.
3. **Idempotency**: Webhook deliveries are deduplicated using the `x-razorpay-event-id` header against the `webhook_events` table. Duplicate events return a safe HTTP 200 without double-processing.
4. **Out-of-Order Resilience**: Monotonic state transition rules ensure that late/stale failure events do not downgrade an already `CAPTURED` payment or `PAID` order.

## 8. AI Decision & Policy Engine (`POST /api/recovery-cases/:id/ai-decision`)

### Features & Security
1. **Decoupled Architecture**: AI recommendations are treated as advisory and evaluated by the deterministic Policy Engine.
2. **Schema Validation**: Validates LLM recommendations against `AIDecisionOutputSchema`.
3. **Deterministic Policy Rules**:
   - `PAYMENT_ALREADY_CAPTURED`: DENY action if payment is captured or order is paid.
   - `ZERO_AMOUNT_AT_RISK`: DENY action if zero money is at risk.
   - `CASE_EXPIRED`: DENY action if case expiration timestamp has passed.
   - `RETRY_LIMIT_EXCEEDED`: ESCALATE if retry count >= 3.
   - `NOTIFICATION_LIMIT_EXCEEDED`: ESCALATE if notification count >= 2.
   - `CUSTOMER_CONTACT_NOT_ALLOWED`: DENY notification if customer `contact_opt_in` is false.
   - `HIGH_VALUE_REQUIRES_REVIEW`: ESCALATE if amount >= high-value threshold.
   - `LOW_AI_CONFIDENCE`: ESCALATE if AI confidence < 0.60.
4. **Safe Fallback**: Automatically defaults to `ESCALATE` with `confidence: 0.0` if LLM provider throws an exception or returns invalid schema.

## 9. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Configure environment variables:
```env
RAZORPAY_WEBHOOK_SECRET=your_test_webhook_secret_here
LLM_API_KEY=your_gemini_api_key_here
LLM_MODEL=gemini-2.5-flash
```

## 10. Running Tests & Application
```bash
# Run all unit and integration tests (85 passing tests)
npm test

# Build all packages and applications
npm run build

# Run application
npm run dev
```

## 11. Endpoints
- **Health**: `GET http://localhost:3000/health`
- **Public Config**: `GET http://localhost:3000/api/config/razorpay`
- **Webhook Endpoint**: `POST http://localhost:3000/api/webhooks/razorpay`
- **AI Decision Pipeline Endpoint**: `POST http://localhost:3000/api/recovery-cases/:id/ai-decision`
