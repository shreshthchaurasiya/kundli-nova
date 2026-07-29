import React from 'react';

export type EarningsInternalTab = 'overview' | 'withdraw' | 'statements';

interface EarningsSubNavigationProps {
  currentTab: EarningsInternalTab;
  onChange: (tab: EarningsInternalTab) => void;
}

export function EarningsSubNavigation({ currentTab, onChange }: EarningsSubNavigationProps) {
  return (
    <div className="flex bg-[#FAFAFA] p-1 rounded-xl border border-neutral-100/50 mb-5 w-full">
      <button
        onClick={() => onChange('overview')}
        className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition-colors ${
          currentTab === 'overview' ? 'bg-white shadow-sm text-neutral-900 border border-neutral-100/80' : 'text-neutral-500 hover:text-neutral-700'
        }`}
      >
        Overview
      </button>
      <button
        onClick={() => onChange('withdraw')}
        className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition-colors ${
          currentTab === 'withdraw' ? 'bg-white shadow-sm text-neutral-900 border border-neutral-100/80' : 'text-neutral-500 hover:text-neutral-700'
        }`}
      >
        Withdraw
      </button>
      <button
        onClick={() => onChange('statements')}
        className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition-colors ${
          currentTab === 'statements' ? 'bg-white shadow-sm text-neutral-900 border border-neutral-100/80' : 'text-neutral-500 hover:text-neutral-700'
        }`}
      >
        Statements
      </button>
    </div>
  );
}
