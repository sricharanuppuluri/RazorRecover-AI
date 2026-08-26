# RazorRecover AI — Merchant Revenue Recovery System

## 1. Project Name
**RazorRecover AI** (Razorpay AI Buildathon — Track 03: AI Revenue Recovery)

## 2. Description
RazorRecover AI is an AI-powered revenue-recovery platform designed for merchants using Razorpay test-mode payment flows. It detects revenue at risk from payment failures, payment degradation, and checkout abandonment, diagnoses root causes using an AI decision engine, scores recovery probability, and executes policy-bounded interventions while maintaining an immutable audit trail and strict financial guardrails.

## 3. Current Phase
**Phase 0 — Project Foundation (Completed)**

> [!IMPORTANT]
> Phase 0 establishes only the project repository foundation, Express API backend, React frontend landing shell, environment configuration, database setup, and architecture/threat model documentation. Phase 0 does **NOT** yet contain the Razorpay webhook handler, AI agent, recovery engine, policy rules, or synthetic evaluation dataset.

## 4. Architecture Overview
```text
Razorpay (Test Mode) → Webhook Gateway → Event Processing → Recovery Engine
   ↓
AI Decision Engine (LLM) → Policy Engine (Deterministic Rules) → Action Executor
   ↓
Outcome Observer → Audit Trail & Analytics → Merchant Dashboard
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
│   ├── policy-engine/           # Deterministic policy guardrails (Phase 1+)
│   ├── recovery-engine/         # Recovery orchestrator & state machine (Phase 1+)
│   └── evaluation/              # Synthetic evaluation & metrics runner (Phase 3+)
├── services/
│   ├── razorpay/                # Razorpay API client service
│   ├── webhooks/                # Webhook receiver & signature verifier
│   ├── ai/                      # LLM decision engine
│   ├── notifications/           # Customer outreach service
│   └── analytics/               # Revenue loss & failure clustering
├── data/
│   ├── synthetic/               # Synthetic 5,000+ transaction dataset
│   └── evaluation/              # Held-out evaluation sets
├── tests/
│   ├── unit/                    # Unit tests
│   ├── integration/             # Health & API integration tests
│   └── e2e/                     # End-to-end demo tests
├── docs/
│   ├── architecture.md          # Architecture specification & data flow
│   ├── threat-model.md          # Security principles & threat matrix
│   └── demo-script.md          # Step-by-step verification guide
├── .env.example                 # Environment template with placeholders
├── .gitignore                    # Secrets & build outputs ignore rules
├── package.json                 # Monorepo workspace configuration
└── README.md                    # Project documentation
```

## 7. Prerequisites
- **Node.js**: `v18.0.0` or higher (Tested on `v22.20.0`)
- **npm**: `v9.0.0` or higher (Tested on `v10.9.3`)

## 8. Environment Setup
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Configure environment variables in `.env` (No real secrets required for Phase 0).

## 9. How to Run Frontend
To start the React landing shell:
```bash
npm run dev:web
```
Access in browser: `http://localhost:5173`

## 10. How to Run Backend
To start the Express API server:
```bash
npm run dev:api
```
Access API server: `http://localhost:3000`

To start both frontend and backend concurrently:
```bash
npm run dev
```

## 11. Health Endpoint
The backend exposes a health check endpoint at:
`GET http://localhost:3000/health`

**Sample JSON Response:**
```json
{
  "status": "ok",
  "service": "razorrecover-api",
  "timestamp": "2026-08-26T10:00:00.000Z",
  "version": "0.1.0-phase0",
  "environment": "development",
  "database": "disconnected"
}
```

## 12. Current Limitations
- Phase 0 is foundation-only. No live webhook ingestion or Razorpay API calls occur yet.
- PostgreSQL database pool is configured via `DATABASE_URL`, but schema tables and migrations will be introduced in Phase 1.
- AI decision engine returns stubbed status until Phase 2.

## 13. Future Phases
- **Phase 1**: Core State & Razorpay Integration (Database schema, Webhook ingestion, HMAC verification, Order/Payment state machine).
- **Phase 2**: AI Recovery & Deterministic Policy Engine (LLM prompt contract, failure diagnosis, policy guardrails, action executor).
- **Phase 3**: Merchant Dashboard & Synthetic Benchmark (Full UI dashboard, 5,000+ batch evaluation dataset, baseline comparison).
