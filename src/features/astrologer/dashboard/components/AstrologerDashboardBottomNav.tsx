import React from 'react';
import { Home, MessageCircleMore, UserRound, UsersRound } from 'lucide-react';
import { AstrologerDashboardTab } from '../types';

interface AstrologerDashboardBottomNavProps {
  currentTab: AstrologerDashboardTab;
  onTabChange: (tab: AstrologerDashboardTab) => void;
}

const tabs: Array<{
  id: AstrologerDashboardTab | 'profile';
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}> = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'requests', label: 'Requests', icon: UsersRound },
  { id: 'chats', label: 'Chats', icon: MessageCircleMore },
  { id: 'profile', label: 'Profile', icon: UserRound },
];

export default function AstrologerDashboardBottomNav({
  currentTab,
  onTabChange,
}: AstrologerDashboardBottomNavProps) {
  return (
    <nav className="border-t border-neutral-100 bg-white px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.025)]">
      <div className="grid grid-cols-4">
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
              <Icon size={21} strokeWidth={isActive ? 2.4 : 1.9} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
