import React, { useState } from 'react';
import { formatINR } from '../../utils/money';
import { PlaySquare, Sparkles, ShieldCheck, AlertTriangle, ArrowRight, CheckCircle2, RefreshCw, Terminal, Layers } from 'lucide-react';
import { api } from '../../services/api/client';

interface DemoSimulatorScreenProps {
  onRefresh: () => void;
  onSelectCase: (caseId: string) => void;
}

export const DemoSimulatorScreen: React.FC<DemoSimulatorScreenProps> = ({ onRefresh, onSelectCase }) => {
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  const scenarios = [
    {
      id: 'SCENARIO_A',
      title: 'Scenario A: Automatic Recovery',
      description: 'Simulates transient bank degradation payment failure that AI recommends retrying. Policy approves and automatic retry succeeds.',
      badge: 'SUCCESS CASE',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      targetAmount: 750000
    },
    {
      id: 'SCENARIO_B',
      title: 'Scenario B: Policy Safe Stop',
      description: 'Simulates low-probability repeated failure where policy guardrails enforce a safe stop and prevent unsafe retry spam.',
      badge: 'POLICY GUARDRAIL',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
      targetAmount: 200000
    },
    {
      id: 'SCENARIO_C',
      title: 'Scenario C: High-Value Human Escalation',
      description: 'Simulates high-value transaction (₹1,25,000) with ambiguous failure details that triggers mandatory human approval.',
      badge: 'HUMAN ESCALATION',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      targetAmount: 12500000
    },
    {
      id: 'SCENARIO_D',
      title: 'Scenario D: AI Outage Fallback',
      description: 'Simulates LLM provider unavailability, demonstrating safe deterministic fallback and escalation without system failure.',
      badge: 'FALLBACK SAFETY',
      badgeColor: 'bg-brand-100 text-brand-800 border-brand-300',
      targetAmount: 450000
    }
  ];

  const handleRunSimulation = async (scenarioId: string) => {
    try {
      setIsRunning(true);
      setActiveScenario(scenarioId);
      setSimulationResult(null);

      const res = await api.runSimulation(scenarioId as any);
      setSimulationResult(res);
      onRefresh();
    } catch (err: any) {
      setSimulationResult({ error: err.message });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-[#1A1F36] tracking-tight flex items-center space-x-2.5">
          <PlaySquare className="w-6 h-6 text-brand-500" />
          <span>Interactive Recovery Demo Simulator</span>
        </h2>
        <p className="text-[#697386] text-sm mt-1">
          Trigger live, end-to-end recovery scenarios to test risk scoring, AI recommendations, zero-trust policy guardrails, and state machine transitions.
        </p>
      </div>

      {/* Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {scenarios.map((sc) => {
          const isSelected = activeScenario === sc.id;
          return (
            <div
              key={sc.id}
              className={`glass-card rounded-2xl p-6 border transition-all bg-white flex flex-col justify-between shadow-xs ${
                isSelected
                  ? 'border-brand-500 shadow-md bg-brand-50/20'
                  : 'border-[#E6E8EC] hover:border-brand-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border font-mono ${sc.badgeColor}`}>
                    {sc.badge}
                  </span>
                  <span className="text-xs font-mono font-bold text-[#1A1F36]">{formatINR(sc.targetAmount)}</span>
                </div>
                <h3 className="font-extrabold text-[#1A1F36] text-base">{sc.title}</h3>
                <p className="text-xs text-[#697386] leading-relaxed">{sc.description}</p>
              </div>

              <div className="pt-5 mt-4 border-t border-[#E6E8EC] flex items-center justify-between">
                <span className="text-[11px] text-[#8792A2] font-mono font-semibold">Scenario: {sc.id}</span>
                <button
                  onClick={() => handleRunSimulation(sc.id)}
                  disabled={isRunning}
                  className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/20 flex items-center space-x-1.5 disabled:opacity-50 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isRunning && isSelected ? 'Simulating...' : 'Run Simulation'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Simulation Trace Terminal */}
      {simulationResult && (
        <div className="glass-card rounded-2xl p-6 border border-[#E6E8EC] bg-white space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E6E8EC] pb-4">
            <div className="flex items-center space-x-2">
              <Terminal className="w-5 h-5 text-brand-500" />
              <h3 className="font-extrabold text-[#1A1F36] text-base">Live Simulation Step Execution Trace</h3>
            </div>
            {simulationResult.caseId && (
              <button
                onClick={() => onSelectCase(simulationResult.caseId)}
                className="text-xs text-brand-600 font-bold flex items-center space-x-1 hover:underline"
              >
                <span>View Generated Case {simulationResult.caseId}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {simulationResult.error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              Simulation Error: {simulationResult.error}
            </div>
          ) : (
            <div className="space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between bg-[#F9FAFB] p-3 rounded-xl border border-[#E6E8EC] font-sans">
                <div>
                  <span className="text-[#697386] text-xs font-bold">Final Case State:</span>{' '}
                  <strong className="text-brand-600 font-extrabold ml-1">{simulationResult.finalStatus}</strong>
                </div>
                <div>
                  <span className="text-[#697386] text-xs font-bold">Recovered Amount:</span>{' '}
                  <strong className="text-emerald-700 font-extrabold ml-1">{formatINR(simulationResult.recoveredAmount)}</strong>
                </div>
              </div>

              {/* Steps timeline */}
              <div className="space-y-3">
                {simulationResult.steps?.map((st: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border flex items-start space-x-3 ${
                      st.status === 'SUCCESS'
                        ? 'bg-emerald-50/30 border-emerald-200 text-[#1A1F36]'
                        : st.status === 'WARNING'
                        ? 'bg-amber-50/40 border-amber-200 text-amber-900'
                        : st.status === 'FAILED'
                        ? 'bg-rose-50/40 border-rose-200 text-rose-900'
                        : 'bg-[#F9FAFB] border-[#E6E8EC] text-[#1A1F36]'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-brand-50 flex items-center justify-center text-[11px] font-extrabold text-brand-600 border border-brand-200 flex-shrink-0">
                      {st.step}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between font-sans">
                        <strong className="font-extrabold text-[#1A1F36]">{st.name}</strong>
                        <span className="text-[10px] text-[#8792A2] font-semibold">{new Date(st.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-[#697386] text-xs font-sans font-medium">{st.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
