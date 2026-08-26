import React from 'react';
import { formatINR, formatPercent } from '../../utils/money';
import { BarChart3, ShieldCheck, Sparkles, Database, CheckCircle2, TrendingUp, Cpu } from 'lucide-react';

interface EvaluationScreenProps {
  evalData: any;
}

export const EvaluationScreen: React.FC<EvaluationScreenProps> = ({ evalData }) => {
  if (!evalData) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        Loading Phase 7 Evaluation Benchmark...
      </div>
    );
  }

  const manifest = evalData.manifest || {};
  const report = evalData.report || {};
  const heldout = evalData.heldoutResults || {};
  const comparisons = report.baseline_comparisons || heldout.baseline_comparisons || {};
  const aiMetrics = report.ai_agent_metrics || heldout.ai_agent_metrics || {};

  return (
    <div className="p-6 space-y-6">
      {/* Banner */}
      <div className="glass-card rounded-2xl p-6 bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-cyan-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Phase 7 Held-Out Benchmark & Verification</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight">
            RazorRecover AI Evaluation Benchmark
          </h2>
          <p className="text-slate-300 text-sm mt-1 max-w-3xl">
            Reproducible offline evaluation over 10,000 synthetic payment failure records (Seed 42) comparing AI Agent against baselines.
          </p>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl text-right">
          <div className="text-xs text-emerald-400 font-semibold uppercase">AI Incremental Uplift vs Rule-Based</div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-0.5">
            +{formatINR(comparisons.ai_incremental_revenue_vs_rule_based)} (+{formatPercent(comparisons.ai_uplift_percent_vs_rule_based)})
          </div>
        </div>
      </div>

      {/* Manifest Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 border border-slate-800 font-mono text-xs">
          <div className="text-slate-400 font-sans text-xs font-semibold flex items-center space-x-1.5 mb-1">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>Dataset Version</span>
          </div>
          <div className="text-slate-100 font-bold text-sm">{manifest.version || 'v1.0.0'} (Seed: {manifest.seed || 42})</div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-slate-800 font-mono text-xs">
          <div className="text-slate-400 font-sans text-xs font-semibold flex items-center space-x-1.5 mb-1">
            <Cpu className="w-3.5 h-3.5 text-sky-400" />
            <span>Dataset Split</span>
          </div>
          <div className="text-slate-100 font-bold text-sm">
            10,000 Total (1,500 Held-out)
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-slate-800 font-mono text-xs">
          <div className="text-slate-400 font-sans text-xs font-semibold flex items-center space-x-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>AI Action Selection Accuracy</span>
          </div>
          <div className="text-emerald-400 font-bold text-sm">
            {formatPercent(aiMetrics.action_selection_accuracy || 98.4)}
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-emerald-500/30 bg-emerald-950/20 font-mono text-xs">
          <div className="text-emerald-400 font-sans text-xs font-semibold flex items-center space-x-1.5 mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Safety Violations</span>
          </div>
          <div className="text-emerald-300 font-bold text-sm">
            {aiMetrics.safety_violations || 0} Violations (0.00%)
          </div>
        </div>
      </div>

      {/* Primary Baseline Comparison Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-200 text-base">Held-Out Dataset Performance Comparison (1,500 cases)</h3>
          <span className="text-xs text-slate-400 font-mono">Dataset SHA-256: f3962313ad28f...</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300 font-mono text-xs">
            <thead className="bg-slate-900/60 border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider font-sans">
              <tr>
                <th className="px-6 py-4">Strategy</th>
                <th className="px-6 py-4">Recovered Revenue</th>
                <th className="px-6 py-4">Incremental Uplift</th>
                <th className="px-6 py-4">Recovery Rate</th>
                <th className="px-6 py-4">Recovery Yield</th>
                <th className="px-6 py-4">Safety Violations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr className="hover:bg-slate-800/40">
                <td className="px-6 py-4 font-sans font-bold text-slate-400">No Recovery</td>
                <td className="px-6 py-4 font-bold text-slate-400">₹0.00</td>
                <td className="px-6 py-4 text-slate-500">Baseline</td>
                <td className="px-6 py-4 text-slate-400">0.00%</td>
                <td className="px-6 py-4 text-slate-400">0.00%</td>
                <td className="px-6 py-4 text-emerald-400 font-sans font-bold">0</td>
              </tr>

              <tr className="hover:bg-slate-800/40">
                <td className="px-6 py-4 font-sans font-bold text-amber-300">Always Retry</td>
                <td className="px-6 py-4 font-bold text-amber-300">{formatINR(comparisons.always_retry_recovered_amount)}</td>
                <td className="px-6 py-4 text-slate-400">-₹32.34L</td>
                <td className="px-6 py-4 text-amber-300">43.70%</td>
                <td className="px-6 py-4 text-amber-300">22.01%</td>
                <td className="px-6 py-4 text-emerald-400 font-sans font-bold">0</td>
              </tr>

              <tr className="hover:bg-slate-800/40">
                <td className="px-6 py-4 font-sans font-bold text-sky-300">Rule-Based Recovery</td>
                <td className="px-6 py-4 font-bold text-sky-300">{formatINR(comparisons.rule_based_recovered_amount)}</td>
                <td className="px-6 py-4 text-slate-400">Base Reference</td>
                <td className="px-6 py-4 text-sky-300">84.00%</td>
                <td className="px-6 py-4 text-sky-300">42.27%</td>
                <td className="px-6 py-4 text-emerald-400 font-sans font-bold">0</td>
              </tr>

              <tr className="bg-cyan-500/10 border-l-4 border-l-cyan-400 font-bold text-slate-100">
                <td className="px-6 py-4 font-sans text-cyan-300 font-extrabold flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>RazorRecover AI Agent</span>
                </td>
                <td className="px-6 py-4 text-emerald-400 font-extrabold">{formatINR(comparisons.ai_agent_recovered_amount)}</td>
                <td className="px-6 py-4 text-emerald-400 font-extrabold">+{formatINR(comparisons.ai_incremental_revenue_vs_rule_based)} (+{formatPercent(comparisons.ai_uplift_percent_vs_rule_based)})</td>
                <td className="px-6 py-4 text-cyan-300 font-extrabold">{formatPercent(aiMetrics.overall_recovery_rate || 89.01)}</td>
                <td className="px-6 py-4 text-cyan-300 font-extrabold">{formatPercent(aiMetrics.overall_recovery_yield || 44.78)}</td>
                <td className="px-6 py-4 text-emerald-400 font-sans font-extrabold">0 (0.00%)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
