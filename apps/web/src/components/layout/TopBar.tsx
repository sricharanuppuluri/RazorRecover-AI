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
    <header className="h-16 border-b border-[#E6E8EC] bg-white px-6 flex items-center justify-between sticky top-0 z-10 shadow-xs">
      {/* Left: Environment & Merchant Selector */}
      <div className="flex items-center space-x-4">
        {/* Test Mode Badge */}
        <div className="flex items-center space-x-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>TEST MODE</span>
        </div>

        {/* Merchant Info */}
        <div className="hidden sm:flex items-center space-x-2 text-[#1A1F36] text-sm font-medium border-l border-[#E6E8EC] pl-4">
          <Building2 className="w-4 h-4 text-brand-500" />
          <span className="font-semibold">RazorRecover Demo Merchant</span>
          <span className="text-xs text-[#8792A2] font-mono">(mch_test_01)</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        {/* System Health */}
        <div className="hidden md:flex items-center space-x-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-3 py-1.5 rounded-xl font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>System: <strong className="text-emerald-800">{healthStatus}</strong></span>
        </div>

        {/* Date Filter */}
        <div className="flex items-center space-x-1 bg-[#F9FAFB] border border-[#E6E8EC] rounded-xl p-1 text-xs">
          <Calendar className="w-3.5 h-3.5 text-[#8792A2] ml-2" />
          {['7d', '30d', 'all'].map((r) => {
            const label = r === '7d' ? 'Last 7 Days' : r === '30d' ? 'Last 30 Days' : 'All Time';
            return (
              <button
                key={r}
                onClick={() => onDateRangeChange(r)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  dateRange === r
                    ? 'bg-brand-500 text-white font-bold shadow-xs'
                    : 'text-[#697386] hover:text-[#1A1F36] hover:bg-slate-100'
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
          className="flex items-center space-x-1.5 bg-white hover:bg-[#F9FAFB] border border-[#E6E8EC] text-[#1A1F36] text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shadow-xs disabled:opacity-50"
          title="Refresh Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-brand-500 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </header>
  );
};
