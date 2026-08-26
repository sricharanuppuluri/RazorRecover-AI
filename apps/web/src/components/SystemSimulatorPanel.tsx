import React, { useState } from 'react';
import { Play, ShieldCheck, CheckCircle2, AlertTriangle, Cpu } from 'lucide-react';
import { SimulationScenario, SimulationScenarioResult } from '@razorrecover/shared-types';

export const SystemSimulatorPanel: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<string>('BANK_DEGRADATION');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [result, setResult] = useState<SimulationScenarioResult | null>(null);

  const scenarios: SimulationScenario[] = [
    {
      id: 'BANK_DEGRADATION',
      title: 'Temporary HDFC Bank Degradation',
      description: 'Simulates a 45% failure spike on HDFC UPI payments triggering automated wait & alternate payment guidance.',
      defaultAmount: 750000,
      expectedDiagnosis: 'temporary_bank_degradation',
      expectedAction: 'OFFER_ALTERNATE_PAYMENT',
    },
    {
      id: 'AUTH_FAILURE',
      title: 'Customer OTP / 3DS Authentication Failure',
      description: 'Simulates customer checkout OTP timeout and issues safe recovery link.',
      defaultAmount: 250000,
      expectedDiagnosis: 'customer_authentication_issue',
      expectedAction: 'SEND_RECOVERY_LINK',
    },
    {
      id: 'ABANDONED_CHECKOUT',
      title: 'High-Intent Abandoned Checkout',
      description: 'Detects cart abandonment after 15 minutes of inactivity and sends personalized reminder.',
      defaultAmount: 1200000,
      expectedDiagnosis: 'checkout_abandonment',
      expectedAction: 'SEND_REMINDER',
    },
    {
      id: 'SUBSCRIPTION_RECURRING',
      title: 'Recurring Subscription Mandate Failure',
      description: 'Simulates insufficient funds on monthly SaaS mandate and schedules intelligent retry.',
      defaultAmount: 149900,
      expectedDiagnosis: 'insufficient_funds',
      expectedAction: 'WAIT_AND_RETRY',
    },
    {
      id: 'VOICE_RECOVERY',
      title: 'Hinglish Interactive Voice Recovery Call',
      description: 'Initiates automated voice assistant call for high-value payment recovery.',
      defaultAmount: 1850000,
      expectedDiagnosis: 'temporary_bank_degradation',
      expectedAction: 'VOICE_ASSISTANT_CALL',
    },
  ];

  const handleRunSimulation = () => {
    setIsExecuting(true);
    const active = scenarios.find((s) => s.id === selectedScenario)!;

    setTimeout(() => {
      setResult({
        scenarioId: active.id,
        merchantId: 'mch_test_01',
        orderId: `ord_sim_${active.id.toLowerCase()}_${Date.now()}`,
        paymentId: `pay_sim_${active.id.toLowerCase()}_${Date.now()}`,
        recoveryCaseId: `rc_sim_${active.id.toLowerCase()}_${Date.now()}`,
        diagnosis: active.expectedDiagnosis,
        aiRecommendation: active.expectedAction,
        policyDecision: 'ALLOWED',
        actionExecuted: active.expectedAction,
        caseStatus: 'ACTION_SENT',
        executedAt: new Date().toISOString(),
      });
      setIsExecuting(false);
    }, 600);
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-indigo-500/30 bg-slate-900/80 my-6 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-indigo-950/90 border border-indigo-700/80 text-indigo-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-lg">System Recovery Orchestration Simulator</h3>
            <p className="text-xs text-slate-400">End-to-End multi-scenario simulation trace across AI Engine, Policy Guardrails & ActionExecutor</p>
          </div>
        </div>
        <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-indigo-950/80 text-indigo-300 border border-indigo-800">
          Phase 14 Production Suite
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {scenarios.map((sc) => (
          <button
            key={sc.id}
            onClick={() => setSelectedScenario(sc.id)}
            className={`p-4 rounded-xl text-left transition-all border ${
              selectedScenario === sc.id
                ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-lg shadow-indigo-950/50'
                : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="font-semibold text-sm mb-1">{sc.title}</div>
            <div className="text-xs line-clamp-2 text-slate-400">{sc.description}</div>
            <div className="text-[11px] font-mono text-indigo-400 mt-2 font-medium">
              ₹{(sc.defaultAmount / 100).toLocaleString('en-IN')}
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-end mb-4">
        <button
          onClick={handleRunSimulation}
          disabled={isExecuting}
          className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors shadow-lg shadow-indigo-600/30 disabled:opacity-50"
        >
          <Play className="w-4 h-4" />
          <span>{isExecuting ? 'Simulating Trace...' : 'Execute Recovery Simulation'}</span>
        </button>
      </div>

      {result && (
        <div className="p-4 rounded-xl bg-slate-950/80 border border-indigo-800/60 mt-4 space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
            <span className="font-mono text-emerald-400 flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Trace Succeeded
            </span>
            <span className="font-mono text-slate-400 text-[11px]">{new Date(result.executedAt).toLocaleTimeString()}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px]">Diagnosis</span>
              <span className="font-mono font-medium text-slate-200">{result.diagnosis}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">AI Recommendation</span>
              <span className="font-mono font-medium text-cyan-400">{result.aiRecommendation}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Policy Guardrail</span>
              <span className="font-mono font-medium text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> {result.policyDecision}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Case Status</span>
              <span className="font-mono font-medium text-indigo-400">{result.caseStatus}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
