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
          <h2 className="text-2xl font-extrabold text-[#1A1F36] tracking-tight flex items-center space-x-2.5">
            <ShieldAlert className="w-6 h-6 text-amber-500" />
            <span>Human Review Queue ({humanCases.length})</span>
          </h2>
          <p className="text-[#697386] text-sm mt-1">
            Cases requiring merchant approval due to high transaction value (&gt; ₹1,00,000), policy guardrails, or AI confidence thresholds.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="px-3.5 py-2 rounded-xl bg-white border border-[#E6E8EC] hover:bg-slate-50 text-[#1A1F36] text-xs font-bold flex items-center space-x-2 transition-all self-start sm:self-auto shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-brand-500" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {actionFeedback && (
        <div className="p-4 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 text-xs font-bold shadow-xs">
          {actionFeedback}
        </div>
      )}

      {/* Cases List */}
      {humanCases.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-[#E6E8EC] bg-white space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-[#1A1F36] text-base">Human Review Queue is Clear</h3>
          <p className="text-xs text-[#697386] max-w-md mx-auto">
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
                className="glass-card rounded-2xl p-6 border border-amber-200 bg-amber-50/40 space-y-4 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-200/60 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 border border-amber-300">
                      <ShieldAlert className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-extrabold text-[#1A1F36] text-base">{c.id}</span>
                        <span className="text-xs text-amber-800 font-extrabold bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                          HUMAN APPROVAL REQUIRED
                        </span>
                      </div>
                      <div className="text-xs text-[#697386] font-mono mt-0.5 font-medium">Order ID: {c.order_id}</div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-xs text-[#697386] font-sans font-bold uppercase">Amount at Risk</div>
                    <div className="text-xl font-extrabold text-rose-600">{formatINR(c.amount_at_risk)}</div>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-[#E6E8EC] text-xs">
                  <div>
                    <span className="text-[#697386] font-bold">Diagnosis:</span>
                    <div className="font-mono text-[#1A1F36] font-bold mt-0.5">{c.diagnosis || 'HIGH_VALUE_VERIFICATION'}</div>
                  </div>
                  <div>
                    <span className="text-[#697386] font-bold">AI Recommendation:</span>
                    <div className="font-mono text-brand-600 font-bold mt-0.5">{c.recommended_action || 'WAIT_AND_RETRY'}</div>
                  </div>
                  <div>
                    <span className="text-[#697386] font-bold">Escalation Reason:</span>
                    <div className="font-mono text-amber-700 font-bold mt-0.5">
                      {c.policy_decision === 'HUMAN_REQUIRED' ? 'High Transaction Value Threshold' : 'Ambiguous Failure Pattern'}
                    </div>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    onClick={() => onSelectCase(c.id)}
                    className="text-xs text-brand-600 hover:text-brand-700 font-bold flex items-center space-x-1"
                  >
                    <span>Inspect Full Case Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleAction(c.id, 'approve')}
                      disabled={isLoading}
                      className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-brand-500/20 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve & Execute</span>
                    </button>
                    <button
                      onClick={() => handleAction(c.id, 'reject')}
                      disabled={isLoading}
                      className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center space-x-1.5 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => handleAction(c.id, 'stop')}
                      disabled={isLoading}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#1A1F36] border border-[#E6E8EC] font-bold text-xs flex items-center space-x-1 disabled:opacity-50 shadow-xs"
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
