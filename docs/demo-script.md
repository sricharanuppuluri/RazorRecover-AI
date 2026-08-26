# RazorRecover AI — Demo Script & Verification Guide

## Phase 0 Demo & Verification Walkthrough

This document outlines the step-by-step verification process for Phase 0 (Project Foundation).

---

## Prerequisites
- Node.js (v18+ or v22+)
- npm (v9+)

---

## 1. Monorepo & Dependencies Setup

Run from workspace root:
```bash
npm install
```

---

## 2. Health Endpoint Verification (Backend)

Start the Express API server:
```bash
npm run dev:api
```

Expected output:
```text
===================================================
 RazorRecover AI - API Server Running
 Environment: development
 Port: 3000
 Health check: http://localhost:3000/health
===================================================
```

Test the health endpoint using `curl` or browser:
```bash
curl http://localhost:3000/health
```

Expected JSON response:
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

---

## 3. Frontend Landing Shell Verification

Start the React Vite web app:
```bash
npm run dev:web
```

Expected output:
```text
  VITE v5.1.6  ready in 300 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open `http://localhost:5173` in a web browser.

Verify that:
1. Title **"RazorRecover AI"** and tagline **"AI-powered revenue recovery for merchants"** are clearly rendered.
2. Modern, rich dark-mode design with glassmorphism effects is visible.
3. Backend API Health card polls `http://localhost:3000/health` and shows `STATUS: OK` with service `razorrecover-api`.
4. Development Roadmap Status displays Phase 0 as active and completed.

---

## 4. Run Build & Type Check Verification

Verify full monorepo TypeScript compilation:
```bash
npm run build
```

Verify integration health test:
```bash
npm run test --workspace=apps/api
```
