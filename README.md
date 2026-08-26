# RazorRecover AI — Merchant Revenue Recovery System

## 1. Project Name
**RazorRecover AI** (Razorpay AI Buildathon — Track 03: AI Revenue Recovery)

## 2. Description
RazorRecover AI is an AI-powered revenue-recovery platform designed for merchants using Razorpay test-mode payment flows. It detects revenue at risk from payment failures, payment degradation, and checkout abandonment, diagnoses root causes using an AI decision engine, scores recovery probability, and executes policy-bounded interventions while maintaining an immutable audit trail and strict financial guardrails.

## 3. Current Phase
**Phase 3 — Secure Razorpay Webhooks + Trusted Payment State (Completed)**

> [!IMPORTANT]
> Phase 3 implements an authoritative, server-side Razorpay webhook gateway (`POST /api/webhooks/razorpay`), raw request body HMAC-SHA256 signature verification, `x-razorpay-event-id` event deduplication, WebhookEvent persistence, Audit logging, and monotonic state reconciliation (`payment.failed`, `payment.authorized`, `payment.captured`, `order.paid`).
>
> **Note**: Phase 3 focuses strictly on webhook security and trusted payment state. AI recovery logic, recovery scoring, and policy actions are scheduled for Phase 4+.

## 4. Architecture Overview
```text
Razorpay (Test Mode) → Webhook Gateway (HMAC Signature Verification) 
         ↓
Event ID Deduplication & Persistence (WebhookEvent Table)
         ↓
Payment State Reconciler (Monotonic Out-of-Order Safe Transitions)
         ↓
Trusted Internal State & Audit Trail (Payment, Order, AuditEvent Tables)
```

## 5. Technology Stack
- **Frontend**: React 18, Vite, Tailwind CSS, TypeScript, Lucide Icons
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL (Driver: `pg` Pool)
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
│   ├── policy-engine/           # Deterministic policy guardrails
│   ├── recovery-engine/         # Recovery orchestrator & state machine
│   └── evaluation/              # Synthetic evaluation & metrics runner
├── services/
│   ├── razorpay/                # Razorpay API client service
│   ├── webhooks/                # Webhook receiver & signature verifier
│   ├── ai/                      # LLM decision engine (Phase 4+)
│   ├── notifications/           # Customer outreach service (Phase 4+)
│   └── analytics/               # Revenue loss & failure clustering
├── data/
│   ├── synthetic/               # Synthetic transaction dataset
│   └── evaluation/              # Held-out evaluation sets
├── tests/
│   ├── unit/                    # Unit tests
│   └── integration/             # Health, API & Webhook integration tests
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

### Supported Events
- `payment.failed`: Updates internal payment state to `FAILED`, records failure details and error codes, increments failure count, logs audit trail.
- `payment.authorized`: Updates payment status to `AUTHORIZED`.
- `payment.captured`: Server-side authoritative signal updating payment to `CAPTURED` and order to `PAID`.
- `order.paid`: Reconciles order to `PAID` and associated payment to `CAPTURED`.

## 8. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Configure `RAZORPAY_WEBHOOK_SECRET`:
```env
RAZORPAY_WEBHOOK_SECRET=your_test_webhook_secret_here
```

## 9. Local Webhook Setup & Testing

### Running Tests
To run all automated security and state reconciliation tests:
```bash
npm test
```

### Manual Testing with Razorpay Test Mode / Local Tunnel
1. Expose your local server (`http://localhost:3000`) using HTTPS via ngrok/localtunnel:
   ```bash
   npx localtunnel --port 3000
   ```
2. Set the Webhook URL in your Razorpay Dashboard under **Settings → Webhooks**:
   `https://<your-subdomain>.loca.lt/api/webhooks/razorpay`
3. Enter your Webhook Secret and select events: `payment.failed`, `payment.authorized`, `payment.captured`, `order.paid`.
4. Trigger test mode payments in the Checkout demo (`http://localhost:5173`).

## 10. Running the Application
```bash
# Run both frontend and backend
npm run dev
```

## 11. Health & Config Endpoints
- **Health**: `GET http://localhost:3000/health`
- **Public Config**: `GET http://localhost:3000/api/config/razorpay`
- **Webhook Endpoint**: `POST http://localhost:3000/api/webhooks/razorpay`
