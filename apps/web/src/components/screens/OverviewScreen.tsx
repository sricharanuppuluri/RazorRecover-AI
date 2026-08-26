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
      <div className="p-8 text-center text-[#697386]">
        <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-4"></div>
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
      <div className="glass-card rounded-2xl p-6 bg-gradient-to-r from-white via-brand-50/40 to-white border border-[#E6E8EC] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center space-x-2 text-brand-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-brand-500" />
            <span>Autonomous Recovery Dashboard</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#1A1F36] tracking-tight">
            Real-Time Revenue Recovery Overview
          </h2>
          <p className="text-[#697386] text-sm mt-1 max-w-2xl">
            RazorRecover AI continuously diagnoses payment failures, enforces zero-trust policy guardrails, and executes bounded recovery actions.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigateTo('demo-simulator')}
            className="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm transition-all shadow-md shadow-brand-500/20 flex items-center space-x-2"
          >
            <span>Run Demo Simulator</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Revenue at Risk */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 border border-[#E6E8EC] bg-white">
          <div className="flex items-center justify-between text-[#697386] text-xs font-bold uppercase tracking-wider">
            <span>Revenue at Risk</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-[#1A1F36] font-mono">
              {formatINR(kpis.revenueAtRisk)}
            </div>
            <div className="text-xs text-[#697386] mt-1 flex items-center justify-between">
              <span>Failed transaction volume</span>
              <span className="text-rose-600 font-bold">{counts.totalCases || 0} Cases</span>
            </div>
          </div>
        </div>

        {/* Potentially Recoverable */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 border border-[#E6E8EC] bg-white">
          <div className="flex items-center justify-between text-[#697386] text-xs font-bold uppercase tracking-wider">
            <span>Potentially Recoverable</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-[#1A1F36] font-mono">
              {formatINR(kpis.potentiallyRecoverable)}
            </div>
            <div className="text-xs text-[#697386] mt-1 flex items-center justify-between">
              <span>Recoverability Yield</span>
              <span className="text-amber-600 font-bold">{formatPercent(kpis.recoveryYield)}</span>
            </div>
          </div>
        </div>

        {/* Recovered Revenue */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 border border-emerald-100 bg-emerald-50/30">
          <div className="flex items-center justify-between text-[#697386] text-xs font-bold uppercase tracking-wider">
            <span>Recovered Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-emerald-700 font-mono">
              {formatINR(kpis.recoveredRevenue)}
            </div>
            <div className="text-xs text-[#697386] mt-1 flex items-center justify-between">
              <span>Captured settlements</span>
              <span className="text-emerald-700 font-bold">{counts.recoveredCases || 0} Cases</span>
            </div>
          </div>
        </div>

        {/* Recovery Rate % */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 border border-brand-200 bg-brand-50/40">
          <div className="flex items-center justify-between text-[#697386] text-xs font-bold uppercase tracking-wider">
            <span>Recovery Rate</span>
            <div className="p-2 rounded-xl bg-brand-100 text-brand-600 border border-brand-200">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-brand-600 font-mono">
              {formatPercent(kpis.recoveryRate)}
            </div>
            <div className="text-xs text-[#697386] mt-1 flex items-center justify-between">
              <span>Intervention Success</span>
              <span className="text-brand-600 font-bold">{formatPercent(counts.interventionSuccessRate)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="glass-card rounded-xl p-4 border border-[#E6E8EC] bg-white text-center">
          <div className="text-xs text-[#697386] font-medium">Active Cases</div>
          <div className="text-xl font-extrabold text-[#1A1F36] mt-1 font-mono">{counts.activeCases || 0}</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-[#E6E8EC] bg-white text-center">
          <div className="text-xs text-[#697386] font-medium">Recovered</div>
          <div className="text-xl font-extrabold text-emerald-600 mt-1 font-mono">{counts.recoveredCases || 0}</div>
        </div>
        <div
          onClick={() => onNavigateTo('human-review')}
          className="glass-card rounded-xl p-4 border border-amber-200 bg-amber-50/50 text-center cursor-pointer hover:border-amber-300 transition-all"
        >
          <div className="text-xs text-amber-700 font-bold flex items-center justify-center space-x-1">
            <span>Human Review</span>
            <AlertTriangle className="w-3 h-3 text-amber-600" />
          </div>
          <div className="text-xl font-extrabold text-amber-700 mt-1 font-mono">{counts.humanReviewCases || 0}</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-[#E6E8EC] bg-white text-center">
          <div className="text-xs text-[#697386] font-medium">Stopped Cases</div>
          <div className="text-xl font-extrabold text-rose-600 mt-1 font-mono">{counts.stoppedCases || 0}</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-[#E6E8EC] bg-white text-center">
          <div className="text-xs text-[#697386] font-medium">Success Rate</div>
          <div className="text-xl font-extrabold text-brand-600 mt-1 font-mono">{formatPercent(counts.interventionSuccessRate)}</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-emerald-200 bg-emerald-50/40 text-center">
          <div className="text-xs text-emerald-700 font-bold flex items-center justify-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Safety Violations</span>
          </div>
          <div className="text-xl font-extrabold text-emerald-700 mt-1 font-mono">0</div>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Revenue Trend SVG Chart */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-[#E6E8EC] bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-[#1A1F36] text-base flex items-center space-x-2">
                <BarChart2 className="w-5 h-5 text-brand-500" />
                <span>Daily Recovery Trend</span>
              </h3>
              <p className="text-xs text-[#697386] mt-0.5">Revenue At Risk vs Recovered Revenue over the last 7 days</p>
            </div>
            <div className="flex items-center space-x-4 text-xs font-semibold">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                <span className="text-[#697386]">At Risk</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-brand-500"></span>
                <span className="text-[#697386]">Recovered</span>
              </div>
            </div>
          </div>

          {/* Simple Clean Bar / Trend Graph */}
          <div className="h-56 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-[#E6E8EC]">
            {dailyTrend.map((d: any, idx: number) => {
              const maxVal = Math.max(...dailyTrend.map((x: any) => x.revenueAtRisk || 1));
              const atRiskHeight = Math.max(10, Math.min(100, (d.revenueAtRisk / maxVal) * 100));
              const recoveredHeight = Math.max(5, Math.min(100, (d.recoveredRevenue / maxVal) * 100));

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-12 bg-[#1A1F36] text-[10px] text-white p-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                    <div>At Risk: {formatINRCompact(d.revenueAtRisk)}</div>
                    <div className="text-brand-300 font-bold">Recovered: {formatINRCompact(d.recoveredRevenue)}</div>
                  </div>

                  <div className="w-full flex items-end justify-center gap-1.5 h-44">
                    <div
                      style={{ height: `${atRiskHeight}%` }}
                      className="w-1/2 bg-rose-200 rounded-t-md transition-all group-hover:bg-rose-300"
                    ></div>
                    <div
                      style={{ height: `${recoveredHeight}%` }}
                      className="w-1/2 bg-brand-500 rounded-t-md transition-all group-hover:bg-brand-600 shadow-sm"
                    ></div>
                  </div>
                  <div className="text-[10px] text-[#697386] font-mono mt-2 truncate w-full text-center font-semibold">
                    {d.date.substring(5)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Funnel & Outcome breakdown */}
        <div className="glass-card rounded-2xl p-6 border border-[#E6E8EC] bg-white space-y-6">
          <div>
            <h3 className="font-extrabold text-[#1A1F36] text-base mb-1">Recovery Conversion Funnel</h3>
            <p className="text-xs text-[#697386] mb-4">Stage-by-stage recovery case conversion</p>
            <div className="space-y-3">
              {funnel.map((step: any, idx: number) => {
                const maxCount = funnel[0]?.count || 1;
                const pct = Math.max(8, Math.min(100, (step.count / maxCount) * 100));
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-[#1A1F36]">
                      <span>{step.step}</span>
                      <span className="font-mono text-brand-600 font-bold">{step.count}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full bg-brand-500 rounded-full transition-all"
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[#E6E8EC]">
            <h4 className="text-xs font-bold text-[#8792A2] uppercase tracking-wider mb-3">Quick Navigation</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onNavigateTo('recovery-queue')}
                className="p-2.5 rounded-xl bg-[#F9FAFB] hover:bg-brand-50 border border-[#E6E8EC] text-[#1A1F36] hover:text-brand-600 text-xs font-semibold text-left transition-all"
              >
                📋 View Queue
              </button>
              <button
                onClick={() => onNavigateTo('revenue-leaks')}
                className="p-2.5 rounded-xl bg-[#F9FAFB] hover:bg-brand-50 border border-[#E6E8EC] text-[#1A1F36] hover:text-brand-600 text-xs font-semibold text-left transition-all"
              >
                💧 Revenue Leaks
              </button>
              <button
                onClick={() => onNavigateTo('evaluation')}
                className="p-2.5 rounded-xl bg-[#F9FAFB] hover:bg-brand-50 border border-[#E6E8EC] text-[#1A1F36] hover:text-brand-600 text-xs font-semibold text-left transition-all"
              >
                📈 Benchmark
              </button>
              <button
                onClick={() => onNavigateTo('audit-trail')}
                className="p-2.5 rounded-xl bg-[#F9FAFB] hover:bg-brand-50 border border-[#E6E8EC] text-[#1A1F36] hover:text-brand-600 text-xs font-semibold text-left transition-all"
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
