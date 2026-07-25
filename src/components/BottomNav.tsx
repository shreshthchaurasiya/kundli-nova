import React from 'react';
import { Home, Users, User, LayoutGrid } from 'lucide-react';
import { Tab } from '../types';

interface BottomNavProps {
  currentTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function BottomNav({ currentTab, onTabChange }: BottomNavProps) {
  const tabs: { id: Tab; label: string; icon: React.ReactNode; isFab?: boolean }[] = [
    { id: 'home', label: 'Home', icon: <Home size={24} strokeWidth={2} /> },
    { id: 'chat-list', label: 'Astrologers', icon: <Users size={24} strokeWidth={2} /> },
    { 
      id: 'nova-ai', 
      label: 'Nova AI', 
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[26px] h-[26px]">
          {/* Inner crystal orb sphere */}
          <circle cx="12" cy="12" r="4.2" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.8" />
          {/* Celestial orbit ring intersecting */}
          <ellipse cx="12" cy="12" rx="9" ry="3" stroke="currentColor" strokeWidth="1.6" transform="rotate(-30 12 12)" />
          {/* Subtle surrounding planetary bodies representing alignment */}
          <circle cx="12" cy="4.5" r="0.8" fill="currentColor" />
          <circle cx="12" cy="19.5" r="0.8" fill="currentColor" />
          <circle cx="4.5" cy="12" r="0.8" fill="currentColor" />
          <circle cx="19.5" cy="12" r="0.8" fill="currentColor" />
        </svg>
      ), 
      isFab: true 
    },
    { id: 'services', label: 'Category', icon: <LayoutGrid size={24} strokeWidth={2} /> },
    { id: 'profile', label: 'Profile', icon: <User size={24} strokeWidth={2} /> },
  ];

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-[#FFFFFF] border-t border-[#F3F4F6] pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.04)] z-50">
      <div className="flex justify-between items-end h-[68px] px-[8px] pb-[8px]">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          
          if (tab.isFab) {
            return (
              <div key={tab.id} className="relative flex flex-col items-center justify-end w-full h-full pb-[2px] z-10">
                <button
                  onClick={() => onTabChange(tab.id)}
                  className="absolute top-[-26px] flex items-center justify-center w-[56px] h-[56px] rounded-full bg-[#FF8A00] text-white shadow-[0_4px_24px_rgba(255,138,0,0.6)] active:scale-95 transition-all duration-300 focus:outline-none"
                >
                  {tab.icon}
                </button>
                <span className={`text-[10.5px] font-[700] tracking-[0.2px] transition-colors duration-300 ${isActive ? 'text-[#FF8A00]' : 'text-[#6B7280]'}`}>
                  {tab.label}
                </span>
              </div>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-col items-center justify-end w-full h-full pb-[2px] focus:outline-none group"
            >
              <div className={`relative flex items-center justify-center mb-[6px] transition-colors duration-300 ${isActive ? 'text-[#FF8A00]' : 'text-[#9CA3AF] group-hover:text-[#6B7280]'}`}>
                {tab.icon}
              </div>
              <span className={`text-[10.5px] font-[600] tracking-[0.1px] transition-colors duration-300 ${isActive ? 'text-[#FF8A00]' : 'text-[#9CA3AF] group-hover:text-[#6B7280]'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
