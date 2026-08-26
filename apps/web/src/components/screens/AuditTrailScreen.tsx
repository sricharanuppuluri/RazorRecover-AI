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
      <div className="p-8 text-center text-slate-400">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
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
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center space-x-2.5">
            <History className="w-6 h-6 text-cyan-400" />
            <span>Immutable Audit Trail & Security Logs</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Complete compliance ledger recording every risk score, AI recommendation, policy decision, and action execution with strict correlation tracking.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center space-x-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 self-start w-fit">
        {['ALL', 'system', 'ai', 'merchant'].map((actor) => (
          <button
            key={actor}
            onClick={() => setFilterActor(actor)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold uppercase transition-all ${
              filterActor === actor
                ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {actor === 'ALL' ? 'All Actors' : actor}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300 font-mono text-xs">
            <thead className="bg-slate-900/90 border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider font-sans">
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
            <tbody className="divide-y divide-slate-800/60">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500 font-sans">
                    No audit events recorded for current filters.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt: any) => (
                  <tr key={evt.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                      {new Date(evt.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 font-bold text-cyan-300 whitespace-nowrap">{evt.event_type}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-sans uppercase ${
                          evt.actor_type === 'ai'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : evt.actor_type === 'merchant'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {evt.actor_type}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-200 font-bold">{evt.recovery_case_id || 'N/A'}</td>
                    <td className="px-5 py-4 font-sans font-semibold text-slate-300">{evt.action || '-'}</td>
                    <td className="px-5 py-4 font-sans text-slate-300 max-w-xs truncate">
                      {evt.decision_summary || evt.input_summary || '-'}
                    </td>
                    <td className="px-5 py-4 font-sans">
                      {evt.outcome ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-emerald-400">
                          {evt.outcome}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-5 py-4 text-right text-slate-500 text-[10px]">{evt.correlation_id}</td>
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
