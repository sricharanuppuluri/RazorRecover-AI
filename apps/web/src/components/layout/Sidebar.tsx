import React from 'react';
import {
  LayoutDashboard,
  TrendingDown,
  Layers,
  FileText,
  ShieldAlert,
  History,
  BarChart3,
  Settings,
  PlaySquare,
  Sparkles
} from 'lucide-react';

export type ScreenId =
  | 'overview'
  | 'revenue-leaks'
  | 'recovery-queue'
  | 'case-detail'
  | 'human-review'
  | 'audit-trail'
  | 'evaluation'
  | 'settings'
  | 'demo-simulator';

interface SidebarProps {
  currentScreen: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
  humanReviewCount?: number;
  selectedCaseId?: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onSelectScreen,
  humanReviewCount = 0,
  selectedCaseId
}) => {
  const navItems: { id: ScreenId; label: string; icon: React.FC<{ className?: string }>; badge?: number | string }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'revenue-leaks', label: 'Revenue Leaks', icon: TrendingDown },
    { id: 'recovery-queue', label: 'Recovery Queue', icon: Layers },
    {
      id: 'case-detail',
      label: selectedCaseId ? `Case: ${selectedCaseId.substring(0, 8)}...` : 'Case Detail',
      icon: FileText
    },
    {
      id: 'human-review',
      label: 'Human Review',
      icon: ShieldAlert,
      badge: humanReviewCount > 0 ? humanReviewCount : undefined
    },
    { id: 'audit-trail', label: 'Audit Trail', icon: History },
    { id: 'evaluation', label: 'Evaluation', icon: BarChart3, badge: 'v1.0' },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'demo-simulator', label: 'Demo Simulator', icon: PlaySquare, badge: 'LIVE' }
  ];

  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col h-screen sticky top-0 backdrop-blur-md z-20">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
          <Sparkles className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-slate-100 tracking-tight leading-none">
            RazorRecover <span className="text-cyan-400 font-extrabold">AI</span>
          </h1>
          <p className="text-[11px] font-medium text-slate-400 mt-1">Autonomous Revenue Recovery</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Merchant Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectScreen(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-md shadow-cyan-950/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    item.id === 'human-review'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                      : item.id === 'demo-simulator'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 text-xs text-slate-400 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Razorpay Buildathon</span>
          <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-cyan-400">Track 03</span>
        </div>
        <div className="text-[11px] text-slate-400">Phase 8: Merchant UI</div>
      </div>
    </aside>
  );
};
