import React, { useState } from 'react';
import { History, Filter, Search, ShieldCheck } from 'lucide-react';

interface AuditTrailScreenProps {
  auditData: any;
  onRefresh: () => void;
}

export const AuditTrailScreen: React.FC<AuditTrailScreenProps> = ({ auditData, onRefresh }) => {
  const [filterActor, setFilterActor] = useState<string>('ALL');

  if (!auditData) {
    return (
      <div className="p-8 text-center text-[#697386]">
        <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        Loading Audit Trail Logs...
      </div>
    );
  }

  const events = auditData.events || [];
  const filteredEvents = filterActor === 'ALL'
    ? events
    : events.filter((e: any) => e.actor_type?.toLowerCase() === filterActor.toLowerCase());

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1A1F36] tracking-tight flex items-center space-x-2.5">
            <History className="w-6 h-6 text-brand-500" />
            <span>Immutable Audit Trail & Security Logs</span>
          </h2>
          <p className="text-[#697386] text-sm mt-1">
            Complete compliance ledger recording every risk score, AI recommendation, policy decision, and action execution with strict correlation tracking.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center space-x-2 bg-white p-1.5 rounded-2xl border border-[#E6E8EC] self-start w-fit shadow-xs">
        {['ALL', 'system', 'ai', 'merchant'].map((actor) => (
          <button
            key={actor}
            onClick={() => setFilterActor(actor)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold uppercase transition-all ${
              filterActor === actor
                ? 'bg-brand-500 text-white shadow-xs'
                : 'text-[#697386] hover:text-[#1A1F36] hover:bg-[#F9FAFB]'
            }`}
          >
            {actor === 'ALL' ? 'All Actors' : actor}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl border border-[#E6E8EC] bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#1A1F36] font-mono text-xs">
            <thead className="bg-[#F9FAFB] border-b border-[#E6E8EC] text-xs text-[#697386] uppercase tracking-wider font-sans font-extrabold">
              <tr>
                <th className="px-5 py-4">Timestamp</th>
                <th className="px-5 py-4">Event Type</th>
                <th className="px-5 py-4">Actor</th>
                <th className="px-5 py-4">Case ID</th>
                <th className="px-5 py-4">Action</th>
                <th className="px-5 py-4">Decision Summary</th>
                <th className="px-5 py-4">Outcome</th>
                <th className="px-5 py-4 text-right">Correlation ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E8EC]">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-[#697386] font-sans font-medium">
                    No audit events recorded for current filters.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt: any) => (
                  <tr key={evt.id} className="hover:bg-brand-50/40 transition-colors">
                    <td className="px-5 py-4 text-[#697386] whitespace-nowrap font-medium">
                      {new Date(evt.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 font-bold text-brand-600 whitespace-nowrap">{evt.event_type}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold font-sans uppercase border ${
                          evt.actor_type === 'ai'
                            ? 'bg-brand-100 text-brand-800 border-brand-300'
                            : evt.actor_type === 'merchant'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        {evt.actor_type}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[#1A1F36] font-bold">{evt.recovery_case_id || 'N/A'}</td>
                    <td className="px-5 py-4 font-sans font-semibold text-[#1A1F36]">{evt.action || '-'}</td>
                    <td className="px-5 py-4 font-sans text-[#697386] font-medium max-w-xs truncate">
                      {evt.decision_summary || evt.input_summary || '-'}
                    </td>
                    <td className="px-5 py-4 font-sans">
                      {evt.outcome ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {evt.outcome}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-5 py-4 text-right text-[#8792A2] text-[10px] font-medium">{evt.correlation_id}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
