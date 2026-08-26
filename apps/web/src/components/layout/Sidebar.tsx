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
    <aside className="w-64 bg-white border-r border-[#E6E8EC] flex flex-col h-screen sticky top-0 z-20 shadow-sm">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#E6E8EC] flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-md shadow-brand-500/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-extrabold text-lg text-[#1A1F36] tracking-tight leading-none">
            RazorRecover <span className="text-brand-500 font-extrabold">AI</span>
          </h1>
          <p className="text-[11px] font-medium text-[#697386] mt-1">Autonomous Revenue Recovery</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-bold text-[#8792A2] uppercase tracking-wider">
          Merchant Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectScreen(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-brand-50 text-brand-600 font-semibold border-l-4 border-brand-500 shadow-sm'
                  : 'text-[#697386] hover:text-[#1A1F36] hover:bg-[#F9FAFB]'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-brand-500' : 'text-[#8792A2]'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    item.id === 'human-review'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : item.id === 'demo-simulator'
                      ? 'bg-brand-50 text-brand-600 border border-brand-200'
                      : 'bg-slate-100 text-[#697386]'
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
      <div className="p-4 border-t border-[#E6E8EC] bg-[#F9FAFB] text-xs text-[#697386] space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[#697386] font-medium">Razorpay Buildathon</span>
          <span className="font-mono text-[10px] bg-brand-50 text-brand-600 px-2 py-0.5 rounded-md font-bold border border-brand-200">Track 03</span>
        </div>
        <div className="text-[11px] text-[#8792A2]">Razorpay-Inspired UI</div>
      </div>
    </aside>
  );
};
