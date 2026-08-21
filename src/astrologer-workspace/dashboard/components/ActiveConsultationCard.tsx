import React, { useEffect, useState } from 'react';
import { MessageCircleMore, Clock } from 'lucide-react';
import { AstrologerDashboardSession } from '../types';

interface ActiveConsultationCardProps {
  activeSession: AstrologerDashboardSession | null;
  onOpenChat: (session: AstrologerDashboardSession) => void;
}

export default function ActiveConsultationCard({ activeSession, onOpenChat }: ActiveConsultationCardProps) {
  const [elapsedText, setElapsedText] = useState<string | null>(null);

  useEffect(() => {
    if (!activeSession?.startedAt || activeSession.status === 'ENDED') {
      setElapsedText(null);
      return;
    }

    const interval = setInterval(() => {
      const ms = Date.now() - new Date(activeSession.startedAt!).getTime();
      const mins = Math.floor(ms / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      setElapsedText(`${mins}m ${secs}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession?.startedAt, activeSession?.status]);

  if (!activeSession) return null;

  const customerName = activeSession.customerDisplayName || 'Customer';

  return (
    <section>
      <div className="mb-2 px-1">
        <h2 className="text-sm font-black text-neutral-900">Active Consultation</h2>
      </div>
      <div className="rounded-[17px] border border-emerald-100 bg-emerald-50/50 p-4 shadow-[0_3px_14px_rgba(0,0,0,0.02)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-black text-sm border border-emerald-200">
              {customerName[0].toUpperCase()}
            </div>
            <div>
              <p className="text-[14.5px] font-black text-neutral-900 tracking-tight">{customerName}</p>
              <p className="mt-0.5 text-[11px] font-bold text-neutral-500">Live Chat Consultation</p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="rounded-md bg-emerald-100 text-emerald-700 px-2 py-1 text-[9px] font-black uppercase tracking-wider animate-pulse">
              Live
            </span>
            {elapsedText && (
              <span className="mt-1.5 text-[9px] font-bold text-neutral-500 flex items-center">
                <Clock size={10} className="mr-0.5" /> {elapsedText}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpenChat(activeSession)}
          className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-[12px] font-black text-white shadow-[0_4px_12px_rgba(16,185,129,0.2)] active:scale-[0.98] transition-transform"
        >
          <MessageCircleMore size={16} /> Continue Consultation
        </button>
      </div>
    </section>
  );
}
