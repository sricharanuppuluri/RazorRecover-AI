import React from 'react';
import { Layers, CheckCircle2, Circle } from 'lucide-react';

export const PhaseBanner: React.FC = () => {
  const phases = [
    { num: 0, title: 'Project Foundation', active: true, done: true },
    { num: 1, title: 'Core State & Razorpay Integration', active: false, done: false },
    { num: 2, title: 'AI Recovery & Policy Engine', active: false, done: false },
    { num: 3, title: 'Dashboard & Synthetic Benchmarks', active: false, done: false },
  ];

  return (
    <div className="glass-card rounded-2xl p-6 border border-slate-800 my-8">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-800/60 text-cyan-400">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-100 text-base">Development Roadmap Status</h3>
          <p className="text-xs text-slate-400">Incremental phase-by-phase build protocol</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        {phases.map((phase) => (
          <div
            key={phase.num}
            className={`p-3.5 rounded-xl border transition-all ${
              phase.active
                ? 'bg-slate-900/90 border-cyan-500/50 shadow-lg shadow-cyan-950/40'
                : 'bg-slate-900/30 border-slate-800/60 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                phase.active ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' : 'bg-slate-800 text-slate-400'
              }`}>
                PHASE {phase.num}
              </span>
              {phase.done ? (
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              ) : (
                <Circle className="w-4 h-4 text-slate-600" />
              )}
            </div>
            <div className="text-xs font-medium text-slate-200">{phase.title}</div>
            <div className="text-[10px] text-slate-400 mt-1">
              {phase.active ? 'Currently active' : 'Planned for upcoming phase'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
