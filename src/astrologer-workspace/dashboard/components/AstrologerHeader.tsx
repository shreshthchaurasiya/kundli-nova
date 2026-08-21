import React from 'react';
import { Menu, BadgeCheck, ArrowLeftRight } from 'lucide-react';
import { AstrologerWorkspaceProfile } from '../types';

interface AstrologerHeaderProps {
  profile: AstrologerWorkspaceProfile;
  onOpenDrawer?: () => void;
  onSwitchWorkspace: () => void;
}

export default function AstrologerHeader({ profile, onOpenDrawer, onSwitchWorkspace }: AstrologerHeaderProps) {
  return (
    <header className="flex items-center gap-3 border-b border-neutral-100 bg-white px-5 py-4">
      <button
        type="button"
        onClick={onOpenDrawer}
        className="mr-1 text-neutral-800 p-1 -ml-2 rounded-full active:bg-neutral-100"
      >
        <Menu size={24} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h1 className="truncate text-[16px] font-black text-neutral-900">{profile.name}</h1>
          {profile.isPublished && <BadgeCheck size={16} className="shrink-0 text-emerald-500" />}
        </div>
        <p className="mt-0.5 text-[11px] font-semibold text-neutral-400">Astrologer workspace</p>
      </div>
      <button
        type="button"
        onClick={onSwitchWorkspace}
        className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-2 text-[10px] font-bold text-neutral-600 active:bg-neutral-50"
      >
        <ArrowLeftRight size={14} /> Switch
      </button>
    </header>
  );
}
