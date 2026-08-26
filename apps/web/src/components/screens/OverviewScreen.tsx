import React from 'react';
import { formatINR, formatINRCompact, formatPercent } from '../../utils/money';
import {
  IndianRupee,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Ban,
  ArrowRight,
  Sparkles,
  BarChart2
} from 'lucide-react';

interface OverviewScreenProps {
  summary: any;
  onNavigateTo: (screen: any) => void;
}

export const OverviewScreen: React.FC<OverviewScreenProps> = ({ summary, onNavigateTo }) => {
  if (!summary) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        Loading Overview Dashboard...
      </div>
    );
  }

  const kpis = summary.kpis || {};
  const counts = summary.counts || {};
  const funnel = summary.funnel || [];
  const dailyTrend = summary.dailyTrend || [];

  return (
    <div className="p-6 space-y-6">
      {/* Banner */}
      <div className="glass-card rounded-2xl p-6 bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border border-sky-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-xs uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Autonomous Recovery Dashboard</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
            Real-Time Revenue Recovery Overview
          </h2>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">
            RazorRecover AI continuously diagnoses payment failures, enforces zero-trust policy guardrails, and executes bounded recovery actions.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigateTo('demo-simulator')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-cyan-500/25 flex items-center space-x-2"
          >
            <span>Run Demo Simulator</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Revenue at Risk */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Revenue at Risk</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-100 font-mono">
              {formatINR(kpis.revenueAtRisk)}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
              <span>Failed transaction volume</span>
              <span className="text-rose-400 font-medium">{counts.totalCases || 0} Cases</span>
            </div>
          </div>
        </div>

        {/* Potentially Recoverable */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Potentially Recoverable</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-100 font-mono">
              {formatINR(kpis.potentiallyRecoverable)}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
              <span>Recoverability Yield</span>
              <span className="text-amber-400 font-medium">{formatPercent(kpis.recoveryYield)}</span>
            </div>
          </div>
        </div>

        {/* Recovered Revenue */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 border border-slate-800 bg-emerald-950/20">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Recovered Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-emerald-400 font-mono">
              {formatINR(kpis.recoveredRevenue)}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
              <span>Captured settlements</span>
              <span className="text-emerald-400 font-medium">{counts.recoveredCases || 0} Cases</span>
            </div>
          </div>
        </div>

        {/* Recovery Rate % */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 border border-slate-800 bg-sky-950/20">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Recovery Rate</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-cyan-400 font-mono">
              {formatPercent(kpis.recoveryRate)}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
              <span>Intervention Success</span>
              <span className="text-cyan-300 font-medium">{formatPercent(counts.interventionSuccessRate)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="glass-card rounded-xl p-4 border border-slate-800 text-center">
          <div className="text-xs text-slate-400 font-medium">Active Cases</div>
          <div className="text-xl font-bold text-slate-100 mt-1 font-mono">{counts.activeCases || 0}</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-slate-800 text-center">
          <div className="text-xs text-slate-400 font-medium">Recovered</div>
          <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">{counts.recoveredCases || 0}</div>
        </div>
        <div
          onClick={() => onNavigateTo('human-review')}
          className="glass-card rounded-xl p-4 border border-amber-500/30 bg-amber-500/5 text-center cursor-pointer hover:border-amber-500/60 transition-all"
        >
          <div className="text-xs text-amber-300 font-semibold flex items-center justify-center space-x-1">
            <span>Human Review</span>
            <AlertTriangle className="w-3 h-3 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-300 mt-1 font-mono">{counts.humanReviewCases || 0}</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-slate-800 text-center">
          <div className="text-xs text-slate-400 font-medium">Stopped Cases</div>
          <div className="text-xl font-bold text-rose-400 mt-1 font-mono">{counts.stoppedCases || 0}</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-slate-800 text-center">
          <div className="text-xs text-slate-400 font-medium">Success Rate</div>
          <div className="text-xl font-bold text-cyan-400 mt-1 font-mono">{formatPercent(counts.interventionSuccessRate)}</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-emerald-500/20 bg-emerald-950/10 text-center">
          <div className="text-xs text-emerald-400 font-semibold flex items-center justify-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Safety Violations</span>
          </div>
          <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">0</div>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Revenue Trend SVG Chart */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-200 text-base flex items-center space-x-2">
                <BarChart2 className="w-5 h-5 text-cyan-400" />
                <span>Daily Recovery Trend</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Revenue At Risk vs Recovered Revenue over the last 7 days</p>
            </div>
            <div className="flex items-center space-x-4 text-xs font-medium">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500/80"></span>
                <span className="text-slate-400">At Risk</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-cyan-400"></span>
                <span className="text-slate-400">Recovered</span>
              </div>
            </div>
          </div>

          {/* Simple Clean Bar / Trend Graph */}
          <div className="h-56 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-slate-800">
            {dailyTrend.map((d: any, idx: number) => {
              const maxVal = Math.max(...dailyTrend.map((x: any) => x.revenueAtRisk || 1));
              const atRiskHeight = Math.max(10, Math.min(100, (d.revenueAtRisk / maxVal) * 100));
              const recoveredHeight = Math.max(5, Math.min(100, (d.recoveredRevenue / maxVal) * 100));

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-12 bg-slate-900 border border-slate-700 text-[10px] text-slate-200 p-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                    <div>At Risk: {formatINRCompact(d.revenueAtRisk)}</div>
                    <div className="text-cyan-400 font-bold">Recovered: {formatINRCompact(d.recoveredRevenue)}</div>
                  </div>

                  <div className="w-full flex items-end justify-center gap-1 h-44">
                    <div
                      style={{ height: `${atRiskHeight}%` }}
                      className="w-1/2 bg-gradient-to-t from-rose-600/40 to-rose-500/80 rounded-t-md transition-all group-hover:brightness-125"
                    ></div>
                    <div
                      style={{ height: `${recoveredHeight}%` }}
                      className="w-1/2 bg-gradient-to-t from-cyan-600 to-sky-400 rounded-t-md transition-all group-hover:brightness-125 shadow-lg shadow-cyan-500/20"
                    ></div>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-2 truncate w-full text-center">
                    {d.date.substring(5)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Funnel & Outcome breakdown */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
          <div>
            <h3 className="font-bold text-slate-200 text-base mb-1">Recovery Conversion Funnel</h3>
            <p className="text-xs text-slate-400 mb-4">Stage-by-stage recovery case conversion</p>
            <div className="space-y-2.5">
              {funnel.map((step: any, idx: number) => {
                const maxCount = funnel[0]?.count || 1;
                const pct = Math.max(8, Math.min(100, (step.count / maxCount) * 100));
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-slate-300">
                      <span>{step.step}</span>
                      <span className="font-mono text-cyan-400 font-bold">{step.count}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full transition-all"
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Quick Navigation</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onNavigateTo('recovery-queue')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold text-left transition-all"
              >
                📋 View Queue
              </button>
              <button
                onClick={() => onNavigateTo('revenue-leaks')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold text-left transition-all"
              >
                💧 Revenue Leaks
              </button>
              <button
                onClick={() => onNavigateTo('evaluation')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold text-left transition-all"
              >
                📈 Benchmark
              </button>
              <button
                onClick={() => onNavigateTo('audit-trail')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold text-left transition-all"
              >
                📜 Audit Logs
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
