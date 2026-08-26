import React from 'react';
import { Navbar } from './components/Navbar';
import { HealthBadge } from './components/HealthBadge';
import { PhaseBanner } from './components/PhaseBanner';
import { CheckoutDemo } from './components/CheckoutDemo';
import { Shield, Sparkles, AlertCircle, ArrowRight, Lock, Database, FileCode, CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-slate-950">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Hero Section */}
        <section className="relative rounded-3xl p-8 sm:p-12 overflow-hidden glass-card border border-slate-800/80 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Razorpay AI Buildathon — Track 03: AI Revenue Recovery</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
              RazorRecover <span className="gradient-text">AI</span>
            </h1>

            <p className="text-xl sm:text-2xl font-medium text-slate-300">
              "AI-powered revenue recovery for merchants"
            </p>

            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Detects revenue at risk, diagnoses payment failure root causes, scores recovery potential, 
              and executes policy-bounded interventions to maximize recovered merchant revenue.
            </p>

            <div className="pt-2 flex flex-wrap gap-4">
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span>Deterministic Guardrails</span>
              </div>
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium">
                <Lock className="w-4 h-4 text-blue-400" />
                <span>Server-side Secret Safety</span>
              </div>
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Audit Logged Decisions</span>
              </div>
            </div>
          </div>
        </section>

        {/* Phase 2 Razorpay Test Mode Checkout Demo */}
        <section>
          <CheckoutDemo />
        </section>

        {/* Phase Status & Health Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <HealthBadge />

          <div className="glass-card glass-card-hover rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <FileCode className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100 text-base">Phase 2 Scope Complete</h3>
                  <p className="text-xs text-slate-400">Current Phase Checklist</p>
                </div>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Razorpay Test Mode Order Creation (<code className="bg-slate-900 px-1 py-0.5 rounded text-cyan-300 font-mono">POST /api/orders</code>)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Internal Order persistence with <code className="bg-slate-900 px-1 py-0.5 rounded text-cyan-300 font-mono">razorpay_order_id</code></span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Integer smallest currency units (paise) money safety enforcement</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Official Razorpay Checkout Modal integration</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Server-side Secret Key safety (<code className="bg-slate-900 px-1 py-0.5 rounded text-cyan-300 font-mono">RAZORPAY_KEY_SECRET</code> unexposed)</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>Ready for Phase 3 Webhooks & Verification</span>
              <span className="flex items-center text-cyan-400 font-medium">
                Phase 2 Verified <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </span>
            </div>
          </div>
        </section>

        {/* Phase Roadmap Overview */}
        <PhaseBanner />

        {/* Boundaries Notice */}
        <section className="bg-slate-900/40 border border-slate-800/90 rounded-2xl p-6">
          <div className="flex items-start space-x-4">
            <div className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-800/50 text-amber-400 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-200 text-sm">Phase 2 Boundaries Notice</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Creating a Razorpay order or completing a checkout modal in the browser is <strong>not</strong> payment success. Razorpay secret credentials remain 100% server-side. Trusted payment state, webhook signature verification, and revenue recovery processing are strictly part of <strong>Phase 3</strong>.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800/80 py-6 bg-slate-950/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            RazorRecover AI &copy; 2026 — Track 03: AI Revenue Recovery
          </div>
          <div className="flex items-center space-x-4 font-mono text-[11px]">
            <span>Express + React + Tailwind</span>
            <span>•</span>
            <span>TypeScript Monorepo</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
