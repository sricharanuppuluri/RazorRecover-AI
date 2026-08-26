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
          <h2 className="text-2xl font-extrabold text-[#1A1F36] tracking-tight flex items-center space-x-2.5">
            <Layers className="w-6 h-6 text-brand-500" />
            <span>Recovery Cases Queue</span>
          </h2>
          <p className="text-[#697386] text-sm mt-1">
            Prioritized operational queue ordered by expected recovery value. Inspect risk diagnosis, AI recommendations, policy decisions, and case states.
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1.5 bg-white p-1.5 rounded-2xl border border-[#E6E8EC] shadow-xs">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onStatusFilterChange(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === tab.id
                  ? 'bg-brand-500 text-white shadow-xs'
                  : 'text-[#697386] hover:text-[#1A1F36] hover:bg-[#F9FAFB]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#8792A2] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Case or Order ID..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-white border border-[#E6E8EC] rounded-xl pl-9 pr-4 py-2 text-xs text-[#1A1F36] placeholder-[#8792A2] focus:outline-none focus:border-brand-500 shadow-xs"
          />
        </div>
      </div>

      {/* Queue Table */}
      <div className="glass-card rounded-2xl border border-[#E6E8EC] overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#1A1F36]">
            <thead className="bg-[#F9FAFB] border-b border-[#E6E8EC] text-xs text-[#697386] font-extrabold uppercase tracking-wider">
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
            <tbody className="divide-y divide-[#E6E8EC] font-mono text-xs">
              {cases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-[#8792A2] font-sans">
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
                      className="hover:bg-brand-50/40 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-4 font-bold text-[#1A1F36]">
                        <span className="text-brand-600 font-extrabold">{c.id}</span>
                        <div className="text-[10px] text-[#8792A2] font-sans mt-0.5">{c.order_id}</div>
                      </td>
                      <td className="px-5 py-4 font-bold text-rose-600">{formatINR(c.amount_at_risk)}</td>
                      <td className="px-5 py-4 font-bold text-emerald-700">
                        {formatINR(c.expected_recovery_value || Math.floor(c.amount_at_risk * (c.recoverability_score || 0.6)))}
                      </td>
                      <td className="px-5 py-4 font-sans text-[#1A1F36]">
                        <span className="bg-slate-100 px-2 py-1 rounded text-[11px] font-bold border border-slate-200 text-slate-700">
                          {c.diagnosis || 'DEGRADATION'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 rounded font-bold bg-brand-50 text-brand-700 border border-brand-200">
                          {c.priority_score || 70}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-sans font-bold text-[#1A1F36]">
                        {c.recommended_action || 'WAIT_AND_RETRY'}
                      </td>
                      <td className="px-5 py-4 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            c.policy_decision === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : c.policy_decision === 'HUMAN_REQUIRED'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {c.policy_decision || 'APPROVED'}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-sans">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                            isRecovered
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : isHuman
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : isStopped
                              ? 'bg-slate-100 text-slate-700 border border-slate-300'
                              : 'bg-brand-50 text-brand-700 border border-brand-200'
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
                          className="px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-600 font-sans text-xs font-bold inline-flex items-center space-x-1 transition-all"
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
        <div className="p-4 bg-[#F9FAFB] border-t border-[#E6E8EC] flex items-center justify-between text-xs text-[#697386] font-sans">
          <div>
            Showing <strong className="text-[#1A1F36]">{cases.length}</strong> of{' '}
            <strong className="text-[#1A1F36]">{total}</strong> cases
          </div>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="px-3 py-1.5 rounded-lg bg-white border border-[#E6E8EC] hover:bg-slate-50 text-[#1A1F36] disabled:opacity-40 font-semibold shadow-xs"
            >
              Previous
            </button>
            <span className="px-2 font-mono text-[#1A1F36] font-semibold">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="px-3.5 py-1.5 rounded-lg bg-white border border-[#E6E8EC] hover:bg-slate-50 text-[#1A1F36] disabled:opacity-40 font-semibold shadow-xs"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
