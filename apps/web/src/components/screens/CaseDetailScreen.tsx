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
      <div className="p-8 text-center text-[#697386]">
        <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-4"></div>
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
          className="flex items-center space-x-2 text-[#697386] hover:text-[#1A1F36] text-xs font-bold bg-white border border-[#E6E8EC] px-3.5 py-2 rounded-xl transition-all shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-brand-500" />
          <span>Back to Recovery Queue</span>
        </button>

        {detail.status === 'HUMAN_REVIEW' && (
          <div className="flex items-center space-x-3">
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-brand-500/20 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve & Execute</span>
            </button>
            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center space-x-1.5 disabled:opacity-50"
            >
              <span>Reject Case</span>
            </button>
          </div>
        )}
      </div>

      {actionMessage && (
        <div className="p-4 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 text-xs font-bold shadow-xs">
          {actionMessage}
        </div>
      )}

      {/* Case Header Card */}
      <div className="glass-card rounded-2xl p-6 border border-[#E6E8EC] bg-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-extrabold text-[#1A1F36] font-mono tracking-tight">{detail.id}</h2>
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                detail.status === 'RECOVERED'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : detail.status === 'HUMAN_REVIEW'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : detail.status === 'STOPPED'
                  ? 'bg-slate-100 text-slate-700 border border-slate-300'
                  : 'bg-brand-50 text-brand-700 border border-brand-200'
              }`}
            >
              {detail.status}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-[#697386] mt-2 font-mono">
            <span>Order ID: <strong className="text-[#1A1F36]">{detail.order_id}</strong></span>
            <span>Payment ID: <strong className="text-[#1A1F36]">{detail.payment_id || 'N/A'}</strong></span>
            <span>Created: <strong className="text-[#1A1F36]">{new Date(detail.started_at).toLocaleString()}</strong></span>
          </div>
        </div>

        <div className="flex items-center space-x-6 border-t md:border-t-0 md:border-l border-[#E6E8EC] pt-4 md:pt-0 md:pl-6">
          <div>
            <div className="text-xs text-[#697386] font-bold uppercase">Amount At Risk</div>
            <div className="text-2xl font-extrabold text-rose-600 font-mono mt-1">{formatINR(detail.amount_at_risk)}</div>
          </div>
          <div>
            <div className="text-xs text-[#697386] font-bold uppercase">Expected Value</div>
            <div className="text-2xl font-extrabold text-emerald-700 font-mono mt-1">
              {formatINR(detail.expected_recovery_value || Math.floor(detail.amount_at_risk * (detail.recoverability_score || 0.6)))}
            </div>
          </div>
        </div>
      </div>

      {/* State Machine Lifecycle Bar */}
      <div className="glass-card rounded-2xl p-6 border border-[#E6E8EC] bg-white shadow-xs">
        <h3 className="text-xs font-bold text-[#8792A2] uppercase tracking-wider mb-4 flex items-center space-x-2">
          <Activity className="w-4 h-4 text-brand-500" />
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
                      ? 'bg-brand-500 text-white shadow-sm font-extrabold'
                      : isCompleted
                      ? 'bg-brand-50 text-brand-700 border border-brand-200'
                      : 'bg-[#F9FAFB] text-[#8792A2] border border-[#E6E8EC]'
                  }`}
                >
                  <span>{stepName}</span>
                </div>
                {idx < stateSteps.length - 1 && <span className="text-[#8792A2] font-bold">→</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Diagnosis & Scoring */}
        <div className="glass-card rounded-2xl p-6 border border-[#E6E8EC] bg-white space-y-4 shadow-xs">
          <h3 className="text-base font-extrabold text-[#1A1F36] flex items-center space-x-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <span>Revenue Risk Diagnosis & Scoring</span>
          </h3>

          <div className="grid grid-cols-2 gap-4 bg-[#F9FAFB] p-4 rounded-xl border border-[#E6E8EC] font-mono text-xs">
            <div>
              <div className="text-[#8792A2] text-[10px] uppercase font-sans font-bold">Diagnosis Category</div>
              <div className="text-[#1A1F36] font-bold text-sm mt-0.5">{detail.diagnosis || 'TEMPORARY_BANK_DEGRADATION'}</div>
            </div>
            <div>
              <div className="text-[#8792A2] text-[10px] uppercase font-sans font-bold">Diagnosis Confidence</div>
              <div className="text-brand-600 font-bold text-sm mt-0.5">{formatPercent((detail.diagnosis_confidence || 0.88) * 100)}</div>
            </div>
            <div>
              <div className="text-[#8792A2] text-[10px] uppercase font-sans font-bold">Recoverability Score</div>
              <div className="text-emerald-700 font-bold text-sm mt-0.5">{formatPercent((detail.recoverability_score || 0.85) * 100)}</div>
            </div>
            <div>
              <div className="text-[#8792A2] text-[10px] uppercase font-sans font-bold">Priority Score</div>
              <div className="text-amber-700 font-bold text-sm mt-0.5">{detail.priority_score || 85}</div>
            </div>
          </div>

          <div className="text-xs text-[#1A1F36] bg-[#F9FAFB] p-3 rounded-xl border border-[#E6E8EC]">
            <strong className="text-[#1A1F36]">Failure Explanation:</strong> Payment failed due to transient gateway latency on bank authorization endpoint. Historical recovery probability remains high.
          </div>
        </div>

        {/* AI Decision Engine */}
        <div className="glass-card rounded-2xl p-6 border border-[#E6E8EC] bg-white space-y-4 shadow-xs">
          <h3 className="text-base font-extrabold text-[#1A1F36] flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-brand-500" />
            <span>AI Decision Engine</span>
          </h3>

          <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#E6E8EC] space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#697386]">Model Provider:</span>
              <span className="font-mono text-brand-600 font-bold">{aiDecision.model || 'gemini-2.5-flash'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#697386]">Prompt Version:</span>
              <span className="font-mono text-[#1A1F36] font-semibold">{aiDecision.prompt_version || 'RazorRecover-AI-Decision-v1'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#697386]">Recommended Action:</span>
              <span className="font-mono text-emerald-700 font-bold">{aiDecision.recommended_action || detail.recommended_action || 'WAIT_AND_RETRY'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#697386]">Decision Confidence:</span>
              <span className="font-mono text-amber-700 font-bold">{formatPercent((aiDecision.confidence || 0.88) * 100)}</span>
            </div>
          </div>

          <div className="text-xs text-[#1A1F36] bg-brand-50/50 p-3 rounded-xl border border-brand-200">
            <strong className="text-brand-700">AI Rationale:</strong> {aiDecision.rationale || 'High recovery probability detected based on customer history and bank health.'}
          </div>
        </div>

        {/* Policy Guardrails */}
        <div className="glass-card rounded-2xl p-6 border border-[#E6E8EC] bg-white space-y-4 shadow-xs">
          <h3 className="text-base font-extrabold text-[#1A1F36] flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Policy Guardrails Check</span>
          </h3>

          <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#E6E8EC] space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#697386]">Policy Version:</span>
              <span className="font-mono text-[#1A1F36] font-semibold">{policyDecision.policy_version || 'policy-v1'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#697386]">Policy Evaluation Result:</span>
              <span
                className={`font-mono font-bold ${
                  policyDecision.allowed ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {policyDecision.allowed ? 'APPROVED' : 'HUMAN_REQUIRED'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#697386]">Human Approval Required:</span>
              <span className="font-mono text-amber-700 font-bold">{policyDecision.requires_human ? 'YES' : 'NO'}</span>
            </div>
          </div>

          <div className="text-xs text-[#1A1F36] bg-emerald-50/40 p-3 rounded-xl border border-emerald-200">
            <strong className="text-emerald-800">Policy Rationale:</strong> {policyDecision.reasons?.join('; ') || 'Allowed under default policy parameters'}
          </div>
        </div>

        {/* Customer & Transaction Info */}
        <div className="glass-card rounded-2xl p-6 border border-[#E6E8EC] bg-white space-y-4 shadow-xs">
          <h3 className="text-base font-extrabold text-[#1A1F36] flex items-center space-x-2">
            <User className="w-5 h-5 text-brand-500" />
            <span>Customer & Payment Context</span>
          </h3>

          <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#E6E8EC] space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-[#697386] font-sans">Payment Method:</span>
              <span className="text-[#1A1F36] font-bold uppercase">{payment.method || 'upi'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#697386] font-sans">Bank / Provider:</span>
              <span className="text-[#1A1F36] font-bold">{payment.bank || 'HDFC'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#697386] font-sans">Contact Opt-In:</span>
              <span className="text-emerald-700 font-bold">{customer.contact_opt_in ? 'YES' : 'NO'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#697386] font-sans">Past Payment History:</span>
              <span className="text-brand-600 font-bold">{customer.successful_payment_count || 5} Success / {customer.failed_payment_count || 1} Failed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action History & Audit Log */}
      <div className="glass-card rounded-2xl p-6 border border-[#E6E8EC] bg-white space-y-4 shadow-xs">
        <h3 className="text-base font-extrabold text-[#1A1F36] flex items-center space-x-2">
          <Clock className="w-5 h-5 text-[#8792A2]" />
          <span>Case Audit Log & Action History</span>
        </h3>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
          {auditEvents.map((evt: any, idx: number) => (
            <div key={idx} className="bg-[#F9FAFB] p-3 rounded-xl border border-[#E6E8EC] text-xs flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-bold text-[#1A1F36] flex items-center space-x-2">
                  <span className="text-brand-600 font-mono font-bold">{evt.event_type}</span>
                  <span className="text-[10px] text-[#8792A2] font-sans font-semibold">[{evt.actor_type}]</span>
                </div>
                <div className="text-[#697386] font-medium">{evt.decision_summary || evt.input_summary || 'Event logged'}</div>
              </div>
              <div className="text-[10px] font-mono text-[#8792A2] font-bold">
                {new Date(evt.timestamp || evt.created_at || Date.now()).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
