import React from 'react';
import { Home, Bell, MessageCircleMore, IndianRupee, UserRound } from 'lucide-react';
import { AstrologerDashboardTab } from '../types';

interface AstrologerDashboardBottomNavProps {
  currentTab: AstrologerDashboardTab;
  onTabChange: (tab: AstrologerDashboardTab) => void;
  waitingCount?: number;
}

const tabs: Array<{
  id: AstrologerDashboardTab;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}> = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'requests', label: 'Requests', icon: Bell },
  { id: 'consults', label: 'Consults', icon: MessageCircleMore },
  { id: 'earnings', label: 'Earnings', icon: IndianRupee },
  { id: 'profile', label: 'Profile', icon: UserRound },
];

export default function AstrologerDashboardBottomNav({
  currentTab,
  onTabChange,
  waitingCount = 0,
}: AstrologerDashboardBottomNavProps) {
  return (
    <nav className="border-t border-neutral-100 bg-white px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.025)]">
      <div className="grid grid-cols-5">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = tab.id === currentTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex min-h-[54px] flex-col items-center justify-center gap-1.5 rounded-xl text-[10px] font-bold transition-colors ${
                isActive ? 'text-[#FF8A00]' : 'text-neutral-400 active:bg-neutral-50'
              }`}
            >
              <div className="relative">
                <Icon size={21} strokeWidth={isActive ? 2.6 : 1.9} />
                {tab.id === 'requests' && waitingCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white shadow-sm ring-2 ring-white">
                    {waitingCount > 9 ? '9+' : waitingCount}
                  </span>
                )}
              </div>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
