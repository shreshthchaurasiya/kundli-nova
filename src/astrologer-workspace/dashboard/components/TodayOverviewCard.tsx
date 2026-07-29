import React from 'react';
import { Clock, UsersRound, AlertCircle } from 'lucide-react';
import { AstrologerDashboardSummary } from '../types';
import { formatMoney } from '../../../utils/format';

interface TodayOverviewCardProps {
  summary: AstrologerDashboardSummary | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => Promise<void>;
}

export default function TodayOverviewCard({ summary, isLoading, error, onRetry }: TodayOverviewCardProps) {
  return (
    <section className="relative overflow-hidden rounded-[24px] bg-[#111827] text-white shadow-[0_8px_30px_rgba(17,24,39,0.15)]">
      <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#FF8A00]/20 blur-3xl pointer-events-none" />
      <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
      
      <div className="relative p-6">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-neutral-400">Today's Net Earnings</p>
        
        {isLoading ? (
          <div className="mt-2 h-10 w-32 rounded-lg bg-neutral-800 animate-pulse" />
        ) : error ? (
          <div className="mt-2 flex items-center gap-3 text-red-400">
            <AlertCircle size={18} />
            <span className="text-sm font-medium">Unable to load</span>
            <button onClick={onRetry} className="text-xs font-bold underline decoration-red-400/50 underline-offset-2">Retry</button>
          </div>
        ) : (
          <div className="mt-1.5 flex items-baseline gap-2">
            <h2 className="text-[34px] font-black tracking-tight text-white">{formatMoney(summary?.todayGrossBilling ?? 0)}</h2>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between rounded-xl bg-white/5 border border-white/10 p-3.5 backdrop-blur-sm">
           <div className="flex items-center gap-3">
             <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FF8A00]/20 text-[#FF8A00]">
               <UsersRound size={16} />
             </div>
             <div>
               <p className="text-[10px] font-bold text-neutral-400">Total Consults</p>
               <p className="text-sm font-black text-white">
                 {isLoading || error ? '-' : (summary?.totalConsultsToday ?? 0)} <span className="font-medium text-neutral-500 text-xs font-normal">today</span>
               </p>
             </div>
           </div>
           <div className="h-8 w-px bg-white/10" />
           <div className="flex items-center gap-3">
             <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
               <Clock size={16} />
             </div>
             <div>
               <p className="text-[10px] font-bold text-neutral-400">Time Billed</p>
               <p className="text-sm font-black text-white">
                 {isLoading || error ? '-' : (summary?.billedMinutesToday ?? 0)} <span className="font-medium text-neutral-500 text-xs font-normal">mins</span>
               </p>
             </div>
           </div>
        </div>
      </div>
    </section>
  );
}
