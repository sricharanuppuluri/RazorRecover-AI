import React, { useState } from 'react';
import { formatINR, formatPercent } from '../../utils/money';
import { TrendingDown, Filter, AlertCircle, RefreshCw } from 'lucide-react';

interface RevenueLeaksScreenProps {
  analytics: any;
  onRefresh: () => void;
}

export const RevenueLeaksScreen: React.FC<RevenueLeaksScreenProps> = ({ analytics, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'category' | 'method' | 'bank'>('category');

  if (!analytics) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        Loading Revenue Leaks Analytics...
      </div>
    );
  }

  const byCategory = analytics.byCategory || [];
  const byMethod = analytics.byPaymentMethod || [];
  const byBank = analytics.byBankProvider || [];

  const currentData = activeTab === 'category' ? byCategory : activeTab === 'method' ? byMethod : byBank;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center space-x-2.5">
            <TrendingDown className="w-6 h-6 text-rose-400" />
            <span>Revenue Leaks & Failure Diagnostics</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Analyze root-cause failure patterns, bank degradation spikes, and payment friction to prioritize recovery strategies.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-2 transition-all self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
          <span>Refresh Analysis</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('category')}
          className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all ${
            activeTab === 'category'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          By Failure Category ({byCategory.length})
        </button>
        <button
          onClick={() => setActiveTab('method')}
          className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all ${
            activeTab === 'method'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          By Payment Method ({byMethod.length})
        </button>
        <button
          onClick={() => setActiveTab('bank')}
          className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all ${
            activeTab === 'bank'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          By Bank / Gateway ({byBank.length})
        </button>
      </div>

      {/* Breakdown Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Breakdown Name</th>
                <th className="px-6 py-4">Failure Count</th>
                <th className="px-6 py-4">Revenue at Risk</th>
                <th className="px-6 py-4">Recovered Revenue</th>
                <th className="px-6 py-4">Recovery Rate</th>
                <th className="px-6 py-4 text-right">Risk Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {currentData.map((item: any, idx: number) => {
                const totalRisk = currentData.reduce((acc: number, curr: any) => acc + (curr.revenueAtRisk || 0), 0);
                const sharePct = totalRisk > 0 ? ((item.revenueAtRisk / totalRisk) * 100).toFixed(1) : '0.0';

                return (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-100 flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                      <span className="font-mono">{item.category}</span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-200">{item.count}</td>
                    <td className="px-6 py-4 font-mono font-bold text-rose-400">{formatINR(item.revenueAtRisk)}</td>
                    <td className="px-6 py-4 font-mono font-bold text-emerald-400">{formatINR(item.recoveredRevenue)}</td>
                    <td className="px-6 py-4 font-mono">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          item.recoveryRate >= 70
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : item.recoveryRate >= 40
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {formatPercent(item.recoveryRate)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs text-slate-400">
                      {sharePct}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
