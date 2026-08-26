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
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      targetAmount: 750000
    },
    {
      id: 'SCENARIO_B',
      title: 'Scenario B: Policy Safe Stop',
      description: 'Simulates low-probability repeated failure where policy guardrails enforce a safe stop and prevent unsafe retry spam.',
      badge: 'POLICY GUARDRAIL',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      targetAmount: 200000
    },
    {
      id: 'SCENARIO_C',
      title: 'Scenario C: High-Value Human Escalation',
      description: 'Simulates high-value transaction (₹1,25,000) with ambiguous failure details that triggers mandatory human approval.',
      badge: 'HUMAN ESCALATION',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      targetAmount: 12500000
    },
    {
      id: 'SCENARIO_D',
      title: 'Scenario D: AI Outage Fallback',
      description: 'Simulates LLM provider unavailability, demonstrating safe deterministic fallback and escalation without system failure.',
      badge: 'FALLBACK SAFETY',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
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
        <h2 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center space-x-2.5">
          <PlaySquare className="w-6 h-6 text-cyan-400" />
          <span>Interactive Recovery Demo Simulator</span>
        </h2>
        <p className="text-slate-400 text-sm mt-1">
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
              className={`glass-card rounded-2xl p-6 border transition-all flex flex-col justify-between ${
                isSelected
                  ? 'border-cyan-500 shadow-lg shadow-cyan-500/20 bg-cyan-950/20'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border font-mono ${sc.badgeColor}`}>
                    {sc.badge}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-300">{formatINR(sc.targetAmount)}</span>
                </div>
                <h3 className="font-bold text-slate-100 text-base">{sc.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{sc.description}</p>
              </div>

              <div className="pt-5 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-mono">Scenario: {sc.id}</span>
                <button
                  onClick={() => handleRunSimulation(sc.id)}
                  disabled={isRunning}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 flex items-center space-x-1.5 disabled:opacity-50 transition-all"
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
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-slate-100 text-base">Live Simulation Step Execution Trace</h3>
            </div>
            {simulationResult.caseId && (
              <button
                onClick={() => onSelectCase(simulationResult.caseId)}
                className="text-xs text-cyan-400 font-semibold flex items-center space-x-1 hover:underline"
              >
                <span>View Generated Case {simulationResult.caseId}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {simulationResult.error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              Simulation Error: {simulationResult.error}
            </div>
          ) : (
            <div className="space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800 font-sans">
                <div>
                  <span className="text-slate-400 text-xs">Final Case State:</span>{' '}
                  <strong className="text-cyan-400 font-bold ml-1">{simulationResult.finalStatus}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-xs">Recovered Amount:</span>{' '}
                  <strong className="text-emerald-400 font-bold ml-1">{formatINR(simulationResult.recoveredAmount)}</strong>
                </div>
              </div>

              {/* Steps timeline */}
              <div className="space-y-3">
                {simulationResult.steps?.map((st: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border flex items-start space-x-3 ${
                      st.status === 'SUCCESS'
                        ? 'bg-slate-900/80 border-emerald-500/30 text-slate-200'
                        : st.status === 'WARNING'
                        ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                        : st.status === 'FAILED'
                        ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[11px] font-bold text-cyan-400 flex-shrink-0">
                      {st.step}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between font-sans">
                        <strong className="font-bold text-slate-100">{st.name}</strong>
                        <span className="text-[10px] text-slate-500">{new Date(st.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-slate-300 text-xs font-sans">{st.detail}</p>
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
