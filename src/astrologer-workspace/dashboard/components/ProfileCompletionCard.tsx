import React from 'react';
import { ArrowRight, BadgeCheck, Sparkles } from 'lucide-react';

interface ProfileCompletionCardProps {
  onCompleteProfile: () => void;
}

export default function ProfileCompletionCard({ onCompleteProfile }: ProfileCompletionCardProps) {
  return (
    <button
      type="button"
      onClick={onCompleteProfile}
      className="flex w-full items-center gap-4 rounded-[20px] border border-neutral-100 bg-gradient-to-r from-orange-50 to-white p-4 text-left shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
    >
      <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm border border-orange-100 text-[#FF8A00]">
        <Sparkles size={20} className="absolute top-2 right-2 text-orange-300 w-3 h-3" />
        <BadgeCheck size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold text-neutral-900">Complete your professional profile</span>
        <span className="mt-0.5 block text-[11px] font-semibold text-neutral-500 leading-snug">A complete profile helps users understand your expertise.</span>
      </div>
      <ArrowRight size={18} className="text-neutral-300" />
    </button>
  );
}
