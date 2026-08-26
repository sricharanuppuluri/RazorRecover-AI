import React, { useState } from 'react';
import { formatINR, formatPercent } from '../../utils/money';
import { Layers, Search, Filter, ArrowUpDown, ChevronRight, AlertTriangle, ShieldCheck } from 'lucide-react';

interface RecoveryQueueScreenProps {
  cases: any[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectCase: (caseId: string) => void;
}

export const RecoveryQueueScreen: React.FC<RecoveryQueueScreenProps> = ({
  cases,
  total,
  page,
  limit,
  onPageChange,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchChange,
  onSelectCase
}) => {
  const statusTabs = [
    { id: 'ALL', label: 'All Cases' },
    { id: 'HUMAN_REVIEW', label: 'Human Review' },
    { id: 'WAITING_FOR_OUTCOME', label: 'Waiting Outcome' },
    { id: 'ACTION_SENT', label: 'Action Sent' },
    { id: 'RECOVERED', label: 'Recovered' },
    { id: 'STOPPED', label: 'Stopped' }
  ];

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center space-x-2.5">
            <Layers className="w-6 h-6 text-cyan-400" />
            <span>Recovery Cases Queue</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Prioritized operational queue ordered by expected recovery value. Inspect risk diagnosis, AI recommendations, policy decisions, and case states.
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1.5 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onStatusFilterChange(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === tab.id
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Case or Order ID..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Queue Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/90 border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4">Case ID</th>
                <th className="px-5 py-4">Amount at Risk</th>
                <th className="px-5 py-4">Expected Value</th>
                <th className="px-5 py-4">Diagnosis</th>
                <th className="px-5 py-4">Priority</th>
                <th className="px-5 py-4">Recommended Action</th>
                <th className="px-5 py-4">Policy Status</th>
                <th className="px-5 py-4">State</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {cases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500 font-sans">
                    No recovery cases matched the current filter parameters.
                  </td>
                </tr>
              ) : (
                cases.map((c: any) => {
                  const isHuman = c.status === 'HUMAN_REVIEW';
                  const isRecovered = c.status === 'RECOVERED';
                  const isStopped = c.status === 'STOPPED';

                  return (
                    <tr
                      key={c.id}
                      onClick={() => onSelectCase(c.id)}
                      className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-4 font-bold text-slate-100">
                        <span className="text-cyan-400">{c.id}</span>
                        <div className="text-[10px] text-slate-500 font-sans mt-0.5">{c.order_id}</div>
                      </td>
                      <td className="px-5 py-4 font-bold text-rose-300">{formatINR(c.amount_at_risk)}</td>
                      <td className="px-5 py-4 font-bold text-emerald-400">
                        {formatINR(c.expected_recovery_value || Math.floor(c.amount_at_risk * (c.recoverability_score || 0.6)))}
                      </td>
                      <td className="px-5 py-4 font-sans text-slate-300">
                        <span className="bg-slate-800 px-2 py-1 rounded text-[11px] font-semibold border border-slate-700">
                          {c.diagnosis || 'DEGRADATION'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 rounded font-bold bg-slate-800 text-cyan-300">
                          {c.priority_score || 70}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-sans font-semibold text-slate-200">
                        {c.recommended_action || 'WAIT_AND_RETRY'}
                      </td>
                      <td className="px-5 py-4 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            c.policy_decision === 'APPROVED'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : c.policy_decision === 'HUMAN_REQUIRED'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {c.policy_decision || 'APPROVED'}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-sans">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isRecovered
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : isHuman
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                              : isStopped
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                              : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCase(c.id);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 font-sans text-xs font-semibold inline-flex items-center space-x-1 transition-all"
                        >
                          <span>Inspect</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-sans">
          <div>
            Showing <strong className="text-slate-200">{cases.length}</strong> of{' '}
            <strong className="text-slate-200">{total}</strong> cases
          </div>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 font-semibold"
            >
              Previous
            </button>
            <span className="px-2 font-mono text-slate-300">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 font-semibold"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
