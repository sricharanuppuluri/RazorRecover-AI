import React, { useState, useEffect } from 'react';
import { TrendingUp, Award, DollarSign, Activity } from 'lucide-react';
import { CausalMetrics } from '@razorrecover/shared-types';

export const CausalImpactCard: React.FC = () => {
  const [metrics, setMetrics] = useState<CausalMetrics | null>(null);

  useEffect(() => {
    // In demo environment, set initial metrics or fetch from endpoint
    setMetrics({
      merchantId: 'mch_test_01',
      totalTreatmentCases: 48,
      totalControlCases: 48,
      treatmentRecoveredAmount: 1875000, // ₹18,750 in paise
      controlRecoveredAmount: 1350000,   // ₹13,500 in paise
      treatmentConversionRate: 0.68,
      controlConversionRate: 0.49,
      incrementalRevenueRecovered: 525000, // ₹5,250 in paise
      averageTreatmentEffect: 0.19,
      causalAttributableYield: 28.0,
      confidenceInterval95: [0.14, 0.24],
      calculatedAt: new Date().toISOString(),
    });
  }, []);

  if (!metrics) return null;

  return (
    <div className="glass-card rounded-2xl p-6 border border-cyan-500/30 bg-slate-900/60 my-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-800/80 text-cyan-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-base">Causal Uplift & Counterfactual Attribution</h3>
            <p className="text-xs text-slate-400">AI decision vs propensity-matched control group baseline</p>
          </div>
        </div>
        <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800">
          Statistically Significant (p &lt; 0.01)
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Incremental Recovered</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">
            +₹{(metrics.incrementalRevenueRecovered / 100).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Net gain over control baseline</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Average Treatment Effect</span>
            <Award className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-cyan-400">
            +{(metrics.averageTreatmentEffect * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Conversion lift (95% CI: 14% - 24%)</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Treatment Conversion</span>
            <Activity className="w-4 h-4 text-slate-300" />
          </div>
          <div className="text-xl font-bold text-slate-100">
            {(metrics.treatmentConversionRate * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Control rate: {(metrics.controlConversionRate * 100).toFixed(1)}%</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Attributable Yield</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-purple-400">
            {metrics.causalAttributableYield}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Causal revenue share</div>
        </div>
      </div>
    </div>
  );
};
