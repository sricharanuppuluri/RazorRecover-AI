import React from 'react';
import { RefreshCw, Activity, Calendar, ShieldCheck, Building2 } from 'lucide-react';

interface TopBarProps {
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  healthStatus?: 'HEALTHY' | 'DEGRADED' | 'ERROR';
}

export const TopBar: React.FC<TopBarProps> = ({
  dateRange,
  onDateRangeChange,
  onRefresh,
  isRefreshing = false,
  healthStatus = 'HEALTHY'
}) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10">
      {/* Left: Environment & Merchant Selector */}
      <div className="flex items-center space-x-4">
        {/* Test Mode Badge */}
        <div className="flex items-center space-x-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold px-2.5 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          <span>TEST MODE</span>
        </div>

        {/* Merchant Info */}
        <div className="hidden sm:flex items-center space-x-2 text-slate-300 text-sm font-medium border-l border-slate-800 pl-4">
          <Building2 className="w-4 h-4 text-cyan-400" />
          <span>RazorRecover Demo Merchant</span>
          <span className="text-xs text-slate-500 font-mono">(mch_test_01)</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        {/* System Health */}
        <div className="hidden md:flex items-center space-x-2 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs px-3 py-1.5 rounded-xl font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>System: <strong className="text-emerald-300">{healthStatus}</strong></span>
        </div>

        {/* Date Filter */}
        <div className="flex items-center space-x-1.5 bg-slate-800/80 border border-slate-700/60 rounded-xl p-1 text-xs">
          <Calendar className="w-3.5 h-3.5 text-slate-400 ml-2" />
          {['7d', '30d', 'all'].map((r) => {
            const label = r === '7d' ? 'Last 7 Days' : r === '30d' ? 'Last 30 Days' : 'All Time';
            return (
              <button
                key={r}
                onClick={() => onDateRangeChange(r)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  dateRange === r
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all disabled:opacity-50"
          title="Refresh Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </header>
  );
};
