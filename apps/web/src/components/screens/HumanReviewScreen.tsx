import React, { useState } from 'react';
import { formatINR } from '../../utils/money';
import { ShieldAlert, CheckCircle2, XCircle, Ban, ArrowRight, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../../services/api/client';

interface HumanReviewScreenProps {
  cases: any[];
  onRefresh: () => void;
  onSelectCase: (caseId: string) => void;
}

export const HumanReviewScreen: React.FC<HumanReviewScreenProps> = ({ cases, onRefresh, onSelectCase }) => {
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const humanCases = cases.filter((c) => c.status === 'HUMAN_REVIEW');

  const handleAction = async (caseId: string, action: 'approve' | 'reject' | 'stop') => {
    try {
      setLoadingMap((prev) => ({ ...prev, [caseId]: true }));
      setActionFeedback(null);

      if (action === 'approve') {
        await api.approveCase(caseId);
        setActionFeedback(`Case ${caseId} approved and action executed successfully!`);
      } else if (action === 'reject') {
        await api.rejectCase(caseId, 'Merchant rejected escalation');
        setActionFeedback(`Case ${caseId} rejected.`);
      } else {
        await api.stopCase(caseId, 'Merchant stopped case manually');
        setActionFeedback(`Case ${caseId} recovery stopped.`);
      }

      onRefresh();
    } catch (err: any) {
      setActionFeedback(`Action failed: ${err.message}`);
    } finally {
      setLoadingMap((prev) => ({ ...prev, [caseId]: false }));
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center space-x-2.5">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
            <span>Human Review Queue ({humanCases.length})</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Cases requiring merchant approval due to high transaction value (&gt; ₹1,00,000), policy guardrails, or AI confidence thresholds.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-2 transition-all self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {actionFeedback && (
        <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-semibold">
          {actionFeedback}
        </div>
      )}

      {/* Cases List */}
      {humanCases.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-200 text-base">Human Review Queue is Clear</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            All high-value and policy-bound cases have been reviewed. RazorRecover AI is autonomously managing routine recoveries.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {humanCases.map((c) => {
            const isLoading = loadingMap[c.id];
            return (
              <div
                key={c.id}
                className="glass-card glass-card-hover rounded-2xl p-6 border border-amber-500/30 bg-amber-500/5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <ShieldAlert className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-100 text-base">{c.id}</span>
                        <span className="text-xs text-amber-300 font-semibold bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                          HUMAN APPROVAL REQUIRED
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">Order ID: {c.order_id}</div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-xs text-slate-400 font-sans uppercase">Amount at Risk</div>
                    <div className="text-xl font-extrabold text-rose-400">{formatINR(c.amount_at_risk)}</div>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold">Diagnosis:</span>
                    <div className="font-mono text-slate-200 font-bold mt-0.5">{c.diagnosis || 'HIGH_VALUE_VERIFICATION'}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold">AI Recommendation:</span>
                    <div className="font-mono text-cyan-300 font-bold mt-0.5">{c.recommended_action || 'WAIT_AND_RETRY'}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold">Escalation Reason:</span>
                    <div className="font-mono text-amber-300 font-bold mt-0.5">
                      {c.policy_decision === 'HUMAN_REQUIRED' ? 'High Transaction Value Threshold' : 'Ambiguous Failure Pattern'}
                    </div>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    onClick={() => onSelectCase(c.id)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center space-x-1"
                  >
                    <span>Inspect Full Case Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleAction(c.id, 'approve')}
                      disabled={isLoading}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve & Execute</span>
                    </button>
                    <button
                      onClick={() => handleAction(c.id, 'reject')}
                      disabled={isLoading}
                      className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs flex items-center space-x-1.5 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => handleAction(c.id, 'stop')}
                      disabled={isLoading}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center space-x-1 disabled:opacity-50"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Stop Case</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
