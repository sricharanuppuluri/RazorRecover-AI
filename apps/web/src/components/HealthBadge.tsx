import React, { useEffect, useState } from 'react';
import { HealthResponse } from '@razorrecover/shared-types';
import { Activity, Database, Server, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export const HealthBadge: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/health');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data: HealthResponse = await res.json();
      setHealth(data);
    } catch (err: any) {
      // Fallback try full backend URL if proxy isn't routing
      try {
        const res2 = await fetch('http://localhost:3000/health');
        if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
        const data2: HealthResponse = await res2.json();
        setHealth(data2);
      } catch (err2: any) {
        setError(err.message || 'Failed to reach API server');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-card glass-card-hover rounded-2xl p-6 shadow-2xl relative overflow-hidden border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-base">Backend API Health</h3>
            <p className="text-xs text-slate-400">Live system status & service connectivity</p>
          </div>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
          title="Refresh Health Status"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      </div>

      {loading && !health ? (
        <div className="py-6 flex items-center justify-center text-slate-400 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin mr-2 text-cyan-400" />
          Checking API connection...
        </div>
      ) : error ? (
        <div className="bg-rose-950/40 border border-rose-900/60 rounded-xl p-4 flex items-start space-x-3">
          <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-rose-300">Backend Unreachable</div>
            <div className="text-xs text-rose-400/80 mt-1">{error}</div>
            <div className="text-xs text-slate-400 mt-2">Ensure Express backend is running on <code className="bg-slate-900 px-1 py-0.5 rounded">http://localhost:3000</code></div>
          </div>
        </div>
      ) : health ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/80 rounded-xl p-3.5 border border-slate-800/80">
              <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
                <Server className="w-3.5 h-3.5 text-cyan-400" />
                <span>API Service</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-slate-200 text-sm">{health.service}</span>
              </div>
              <span className="inline-block mt-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-800/50">
                STATUS: {health.status.toUpperCase()}
              </span>
            </div>

            <div className="bg-slate-900/80 rounded-xl p-3.5 border border-slate-800/80">
              <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span>PostgreSQL</span>
              </div>
              <div className="flex items-center space-x-2">
                {health.database === 'connected' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
                <span className="font-semibold text-slate-200 text-sm capitalize">{health.database}</span>
              </div>
              <span className={`inline-block mt-1 text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                health.database === 'connected'
                  ? 'text-emerald-400 bg-emerald-950/50 border-emerald-800/50'
                  : 'text-amber-400 bg-amber-950/50 border-amber-800/50'
              }`}>
                {health.database === 'connected' ? 'DB READY' : 'CONFIGURED FOR PHASE 1'}
              </span>
            </div>
          </div>

          <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800/60 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Env: <strong className="text-slate-200 font-sans">{health.environment}</strong></span>
            <span>Version: <strong className="text-slate-200 font-sans">{health.version}</strong></span>
            <span>Last check: {new Date(health.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
};
