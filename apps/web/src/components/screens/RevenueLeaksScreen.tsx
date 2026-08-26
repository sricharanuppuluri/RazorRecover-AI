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
      <div className="p-8 text-center text-[#697386]">
        <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-4"></div>
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
          <h2 className="text-2xl font-extrabold text-[#1A1F36] tracking-tight flex items-center space-x-2.5">
            <TrendingDown className="w-6 h-6 text-rose-600" />
            <span>Revenue Leaks & Failure Diagnostics</span>
          </h2>
          <p className="text-[#697386] text-sm mt-1">
            Analyze root-cause failure patterns, bank degradation spikes, and payment friction to prioritize recovery strategies.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="px-3.5 py-2 rounded-xl bg-white border border-[#E6E8EC] hover:bg-slate-50 text-[#1A1F36] text-xs font-bold flex items-center space-x-2 transition-all self-start sm:self-auto shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-brand-500" />
          <span>Refresh Analysis</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-[#E6E8EC] pb-3">
        <button
          onClick={() => setActiveTab('category')}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'category'
              ? 'bg-brand-500 text-white shadow-xs'
              : 'text-[#697386] hover:text-[#1A1F36] hover:bg-[#F9FAFB] bg-white border border-[#E6E8EC]'
          }`}
        >
          By Failure Category ({byCategory.length})
        </button>
        <button
          onClick={() => setActiveTab('method')}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'method'
              ? 'bg-brand-500 text-white shadow-xs'
              : 'text-[#697386] hover:text-[#1A1F36] hover:bg-[#F9FAFB] bg-white border border-[#E6E8EC]'
          }`}
        >
          By Payment Method ({byMethod.length})
        </button>
        <button
          onClick={() => setActiveTab('bank')}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'bank'
              ? 'bg-brand-500 text-white shadow-xs'
              : 'text-[#697386] hover:text-[#1A1F36] hover:bg-[#F9FAFB] bg-white border border-[#E6E8EC]'
          }`}
        >
          By Bank / Gateway ({byBank.length})
        </button>
      </div>

      {/* Breakdown Table */}
      <div className="glass-card rounded-2xl border border-[#E6E8EC] bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#1A1F36]">
            <thead className="bg-[#F9FAFB] border-b border-[#E6E8EC] text-xs text-[#697386] font-extrabold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Breakdown Name</th>
                <th className="px-6 py-4">Failure Count</th>
                <th className="px-6 py-4">Revenue at Risk</th>
                <th className="px-6 py-4">Recovered Revenue</th>
                <th className="px-6 py-4">Recovery Rate</th>
                <th className="px-6 py-4 text-right">Risk Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E8EC]">
              {currentData.map((item: any, idx: number) => {
                const totalRisk = currentData.reduce((acc: number, curr: any) => acc + (curr.revenueAtRisk || 0), 0);
                const sharePct = totalRisk > 0 ? ((item.revenueAtRisk / totalRisk) * 100).toFixed(1) : '0.0';

                return (
                  <tr key={idx} className="hover:bg-brand-50/40 transition-colors">
                    <td className="px-6 py-4 font-bold text-[#1A1F36] flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-brand-500"></span>
                      <span className="font-mono">{item.category}</span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-[#1A1F36]">{item.count}</td>
                    <td className="px-6 py-4 font-mono font-bold text-rose-600">{formatINR(item.revenueAtRisk)}</td>
                    <td className="px-6 py-4 font-mono font-bold text-emerald-700">{formatINR(item.recoveredRevenue)}</td>
                    <td className="px-6 py-4 font-mono">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${
                          item.recoveryRate >= 70
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : item.recoveryRate >= 40
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {formatPercent(item.recoveryRate)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs text-[#697386] font-bold">
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
