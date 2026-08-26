import React, { useState } from 'react';
import { formatINR, formatPercent } from '../../utils/money';
import {
  ArrowLeft,
  FileText,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  CreditCard,
  Building,
  Zap,
  Activity
} from 'lucide-react';
import { api } from '../../services/api/client';

interface CaseDetailScreenProps {
  detail: any;
  onBack: () => void;
  onRefresh: () => void;
}

export const CaseDetailScreen: React.FC<CaseDetailScreenProps> = ({ detail, onBack, onRefresh }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  if (!detail) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        Loading Case Details...
      </div>
    );
  }

  const order = detail.order || {};
  const payment = detail.payment || {};
  const customer = detail.customer || {};
  const aiDecision = detail.aiDecision || {};
  const policyDecision = detail.policyDecision || {};
  const actions = detail.actions || [];
  const auditEvents = detail.auditEvents || [];

  const handleApprove = async () => {
    try {
      setIsProcessing(true);
      setActionMessage(null);
      await api.approveCase(detail.id);
      setActionMessage('Case approved and action executed successfully!');
      onRefresh();
    } catch (err: any) {
      setActionMessage(`Error approving case: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    try {
      setIsProcessing(true);
      setActionMessage(null);
      await api.rejectCase(detail.id, 'Merchant rejected case manually');
      setActionMessage('Case rejected and stopped successfully.');
      onRefresh();
    } catch (err: any) {
      setActionMessage(`Error rejecting case: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStop = async () => {
    try {
      setIsProcessing(true);
      setActionMessage(null);
      await api.stopCase(detail.id, 'Merchant stopped recovery manually');
      setActionMessage('Case stopped manually.');
      onRefresh();
    } catch (err: any) {
      setActionMessage(`Error stopping case: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // State Machine Lifecycle Steps
  const stateSteps = [
    'NEW',
    'DETECTED',
    'DIAGNOSING',
    'SCORED',
    'AI_RECOMMENDED',
    'POLICY_CHECK',
    'ACTION_PENDING',
    'ACTION_SENT',
    'WAITING_FOR_OUTCOME',
    detail.status === 'STOPPED' ? 'STOPPED' : 'RECOVERED'
  ];

  const currentStepIdx = stateSteps.indexOf(detail.status);

  return (
    <div className="p-6 space-y-6">
      {/* Back Button & Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-slate-400 hover:text-slate-100 text-xs font-semibold bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Recovery Queue</span>
        </button>

        {detail.status === 'HUMAN_REVIEW' && (
          <div className="flex items-center space-x-3">
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve & Execute</span>
            </button>
            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs flex items-center space-x-1.5 disabled:opacity-50"
            >
              <span>Reject Case</span>
            </button>
          </div>
        )}
      </div>

      {actionMessage && (
        <div className="p-4 rounded-xl bg-sky-950/60 border border-sky-500/40 text-cyan-300 text-xs font-semibold">
          {actionMessage}
        </div>
      )}

      {/* Case Header Card */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-extrabold text-slate-100 font-mono tracking-tight">{detail.id}</h2>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                detail.status === 'RECOVERED'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : detail.status === 'HUMAN_REVIEW'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                  : detail.status === 'STOPPED'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
              }`}
            >
              {detail.status}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2 font-mono">
            <span>Order ID: <strong className="text-slate-200">{detail.order_id}</strong></span>
            <span>Payment ID: <strong className="text-slate-200">{detail.payment_id || 'N/A'}</strong></span>
            <span>Created: <strong className="text-slate-200">{new Date(detail.started_at).toLocaleString()}</strong></span>
          </div>
        </div>

        <div className="flex items-center space-x-6 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase">Amount At Risk</div>
            <div className="text-2xl font-extrabold text-rose-400 font-mono mt-1">{formatINR(detail.amount_at_risk)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase">Expected Value</div>
            <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
              {formatINR(detail.expected_recovery_value || Math.floor(detail.amount_at_risk * (detail.recoverability_score || 0.6)))}
            </div>
          </div>
        </div>
      </div>

      {/* State Machine Lifecycle Bar */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center space-x-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span>Recovery State Machine Lifecycle</span>
        </h3>
        <div className="flex items-center justify-between overflow-x-auto pb-2 gap-2">
          {stateSteps.map((stepName, idx) => {
            const isCompleted = currentStepIdx >= idx && detail.status !== 'STOPPED';
            const isCurrent = stepName === detail.status;
            return (
              <div key={idx} className="flex items-center space-x-2 flex-shrink-0">
                <div
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                      : isCompleted
                      ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30'
                      : 'bg-slate-900 text-slate-600 border border-slate-800'
                  }`}
                >
                  <span>{stepName}</span>
                </div>
                {idx < stateSteps.length - 1 && <span className="text-slate-700 font-bold">→</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Diagnosis & Scoring */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-slate-200 flex items-center space-x-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <span>Revenue Risk Diagnosis & Scoring</span>
          </h3>

          <div className="grid grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800 font-mono text-xs">
            <div>
              <div className="text-slate-500 text-[10px] uppercase font-sans">Diagnosis Category</div>
              <div className="text-slate-100 font-bold text-sm mt-0.5">{detail.diagnosis || 'TEMPORARY_BANK_DEGRADATION'}</div>
            </div>
            <div>
              <div className="text-slate-500 text-[10px] uppercase font-sans">Diagnosis Confidence</div>
              <div className="text-cyan-400 font-bold text-sm mt-0.5">{formatPercent((detail.diagnosis_confidence || 0.88) * 100)}</div>
            </div>
            <div>
              <div className="text-slate-500 text-[10px] uppercase font-sans">Recoverability Score</div>
              <div className="text-emerald-400 font-bold text-sm mt-0.5">{formatPercent((detail.recoverability_score || 0.85) * 100)}</div>
            </div>
            <div>
              <div className="text-slate-500 text-[10px] uppercase font-sans">Priority Score</div>
              <div className="text-amber-300 font-bold text-sm mt-0.5">{detail.priority_score || 85}</div>
            </div>
          </div>

          <div className="text-xs text-slate-300 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
            <strong className="text-slate-200">Failure Explanation:</strong> Payment failed due to transient gateway latency on bank authorization endpoint. Historical recovery probability remains high.
          </div>
        </div>

        {/* AI Decision Engine */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-slate-200 flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <span>AI Decision Engine</span>
          </h3>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Model Provider:</span>
              <span className="font-mono text-cyan-300 font-bold">{aiDecision.model || 'gemini-2.5-flash'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Prompt Version:</span>
              <span className="font-mono text-slate-300">{aiDecision.prompt_version || 'RazorRecover-AI-Decision-v1'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Recommended Action:</span>
              <span className="font-mono text-emerald-400 font-bold">{aiDecision.recommended_action || detail.recommended_action || 'WAIT_AND_RETRY'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Decision Confidence:</span>
              <span className="font-mono text-amber-300 font-bold">{formatPercent((aiDecision.confidence || 0.88) * 100)}</span>
            </div>
          </div>

          <div className="text-xs text-slate-300 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
            <strong className="text-cyan-400">AI Rationale:</strong> {aiDecision.rationale || 'High recovery probability detected based on customer history and bank health.'}
          </div>
        </div>

        {/* Policy Guardrails */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-slate-200 flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Policy Guardrails Check</span>
          </h3>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Policy Version:</span>
              <span className="font-mono text-slate-300">{policyDecision.policy_version || 'policy-v1'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Policy Evaluation Result:</span>
              <span
                className={`font-mono font-bold ${
                  policyDecision.allowed ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {policyDecision.allowed ? 'APPROVED' : 'HUMAN_REQUIRED'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Human Approval Required:</span>
              <span className="font-mono text-amber-300 font-bold">{policyDecision.requires_human ? 'YES' : 'NO'}</span>
            </div>
          </div>

          <div className="text-xs text-slate-300 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
            <strong className="text-emerald-400">Policy Rationale:</strong> {policyDecision.reasons?.join('; ') || 'Allowed under default policy parameters'}
          </div>
        </div>

        {/* Customer & Transaction Info */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-slate-200 flex items-center space-x-2">
            <User className="w-5 h-5 text-sky-400" />
            <span>Customer & Payment Context</span>
          </h3>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Payment Method:</span>
              <span className="text-slate-200 font-bold uppercase">{payment.method || 'upi'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Bank / Provider:</span>
              <span className="text-slate-200 font-bold">{payment.bank || 'HDFC'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Contact Opt-In:</span>
              <span className="text-emerald-400 font-bold">{customer.contact_opt_in ? 'YES' : 'NO'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Past Payment History:</span>
              <span className="text-cyan-300 font-bold">{customer.successful_payment_count || 5} Success / {customer.failed_payment_count || 1} Failed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action History & Audit Log */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-slate-200 flex items-center space-x-2">
          <Clock className="w-5 h-5 text-slate-400" />
          <span>Case Audit Log & Action History</span>
        </h3>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
          {auditEvents.map((evt: any, idx: number) => (
            <div key={idx} className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-bold text-slate-200 flex items-center space-x-2">
                  <span className="text-cyan-400 font-mono">{evt.event_type}</span>
                  <span className="text-[10px] text-slate-500 font-sans">[{evt.actor_type}]</span>
                </div>
                <div className="text-slate-400">{evt.decision_summary || evt.input_summary || 'Event logged'}</div>
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                {new Date(evt.created_at).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
