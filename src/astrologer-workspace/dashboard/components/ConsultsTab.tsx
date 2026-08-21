import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  History,
  MessageCircleMore,
  RefreshCw,
  Wallet,
  WifiOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AstrologerDashboardSession } from '../types';
import { ACTIVE_ASTROLOGER_SESSION_STATUSES } from '../dashboardConfig';
import { formatDateTime, formatDuration, formatMoney } from '../../../utils/format';

const activeStatusSet = new Set(ACTIVE_ASTROLOGER_SESSION_STATUSES);

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getStatusLabel(status: AstrologerDashboardSession['status']): string {
  const map: Record<string, string> = {
    ENDED: 'Completed',
    CANCELLED: 'Cancelled',
    REJECTED: 'Declined',
    EXPIRED: 'Expired',
  };
  return map[status] || status;
}

// ─── Active Timer ─────────────────────────────────────────────────────────────
/** Display-only timer for active consultation. Financial calculations are backend-driven. */
function ActiveTimer({ startedAt }: { startedAt?: string }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    
    const compute = () => {
      const ms = Math.max(0, Date.now() - start);
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setElapsed(`${m}m ${s}s`);
    };
    
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  if (!startedAt) return null;

  return (
    <span className="flex items-center gap-0.5 text-[9px] font-bold text-neutral-500">
      <Clock size={9} /> {elapsed} elapsed
    </span>
  );
}

// ─── Active Consultation Panel ────────────────────────────────────────────────
interface ActiveConsultationPanelProps {
  session: AstrologerDashboardSession;
  onOpenChat: (session: AstrologerDashboardSession) => void;
}

function ActiveConsultationPanel({ session, onOpenChat }: ActiveConsultationPanelProps) {
  const customerName = session.customerDisplayName || 'Customer';

  return (
    <section>
      <div className="mb-3 px-1">
        <h2 className="text-sm font-black text-neutral-900">Active Consultation</h2>
      </div>
      <article className="rounded-[18px] border border-emerald-100 bg-white p-4 shadow-[0_4px_20px_rgba(16,185,129,0.04)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-sm font-black text-emerald-600">
              {customerName[0].toUpperCase()}
            </div>
            <div>
              <p className="text-[15px] font-black tracking-tight text-neutral-900">
                {customerName}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-bold text-neutral-500">Live Chat Consultation</p>
                {session.kundliProfileId && (
                  <span className="flex items-center gap-0.5 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-indigo-500">
                    <BookOpen size={9} /> Kundli
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="animate-pulse rounded-md bg-emerald-100 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700">
              Live
            </span>
            <ActiveTimer startedAt={session.startedAt} />
          </div>
        </div>

        {/* Real Backend Billed Mins Display */}
        <div className="mt-3 flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2.5">
          <span className="text-[11px] font-bold text-neutral-500">Billed duration</span>
          <span className="text-[12px] font-black text-neutral-900">
            {formatDuration(session.billedMinutes)}
          </span>
        </div>

        {/* Warning states */}
        {session.status === 'LOW_BALANCE' && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-500" />
            <p className="text-[11px] font-semibold leading-relaxed text-amber-800">
              Customer balance is running low. The consultation may pause if they do not recharge.
            </p>
          </div>
        )}

        {session.status === 'RECHARGING' && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5">
            <Wallet size={14} className="mt-0.5 shrink-0 text-blue-500" />
            <p className="text-[11px] font-semibold leading-relaxed text-blue-800">
              Customer is recharging their wallet. You can continue once the recharge is completed.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => onOpenChat(session)}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-[13px] font-black text-white shadow-[0_4px_12px_rgba(16,185,129,0.2)] transition-transform active:scale-[0.98]"
        >
          <MessageCircleMore size={16} /> Continue Consultation
        </button>
      </article>
    </section>
  );
}

// ─── History List Card ───────────────────────────────────────────────────────
interface ConsultationHistoryCardProps {
  key?: React.Key;
  session: AstrologerDashboardSession;
  onOpenChat: (session: AstrologerDashboardSession) => void;
}

function ConsultationHistoryCard({ session, onOpenChat }: ConsultationHistoryCardProps) {
  const customerName = session.customerDisplayName || 'Customer';
  const isCompleted = session.status === 'ENDED';
  const labelColor = isCompleted
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-neutral-100 text-neutral-600';
  const labelText = getStatusLabel(session.status);

  return (
    <article className="rounded-[16px] border border-neutral-100 bg-white p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-50 text-xs font-black text-neutral-400">
            {customerName[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-black text-neutral-900">{customerName}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${labelColor}`}>
                {labelText}
              </span>
              {session.kundliProfileId && (
                <span className="flex items-center gap-0.5 rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-indigo-500">
                  <BookOpen size={9} /> Kundli
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[12px] font-black text-[#1FA664]">
            +{formatMoney(session.totalCharged * 0.60)}
          </p>
          <p className="mt-0.5 text-[10px] font-bold text-neutral-400">
            {formatDuration(session.billedMinutes)}
          </p>
        </div>
      </div>
      
      <div className="mt-3 flex items-center justify-between border-t border-neutral-50 pt-3">
        <p className="text-[10px] font-semibold text-neutral-400">
          {formatDateTime(session.startedAt || session.requestedAt)}
        </p>
        <button
          type="button"
          onClick={() => onOpenChat(session)}
          className="flex items-center gap-1 rounded-lg bg-neutral-50 px-3 py-1.5 text-[11px] font-bold text-neutral-600 transition-colors active:bg-neutral-100"
        >
          View Details
        </button>
      </div>
    </article>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export interface ConsultsTabProps {
  sessions: AstrologerDashboardSession[];
  isLoading: boolean;
  error: string | null;
  onOpenChat: (session: AstrologerDashboardSession) => void;
  onRetry: () => Promise<void>;
}

export default function ConsultsTab({
  sessions,
  isLoading,
  error,
  onOpenChat,
  onRetry,
}: ConsultsTabProps) {
  
  // Categorise sessions based on real backend statuses
  const activeSession = sessions.find(s => activeStatusSet.has(s.status));
  const completedSessions = sessions.filter(s => s.status === 'ENDED');
  const closedSessions = sessions.filter(s => ['CANCELLED', 'REJECTED', 'EXPIRED'].includes(s.status));

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="h-4 w-32 rounded bg-neutral-200 animate-pulse" />
          <div className="h-40 rounded-[18px] bg-neutral-100 animate-pulse" />
        </div>
        <div className="space-y-3">
          <div className="h-4 w-32 rounded bg-neutral-200 animate-pulse" />
          <div className="h-28 rounded-[16px] bg-neutral-100 animate-pulse" />
          <div className="h-28 rounded-[16px] bg-neutral-100 animate-pulse" />
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[20px] border border-neutral-100 bg-white px-8 py-10 text-center shadow-sm">
        <WifiOff size={28} className="text-neutral-300" />
        <p className="mt-3 text-sm font-extrabold text-neutral-800">Could not load consults</p>
        <p className="mt-1 text-[11px] font-medium text-neutral-400">{error}</p>
        <button
          type="button"
          onClick={() => void onRetry()}
          className="mt-4 flex items-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2.5 text-xs font-bold text-white transition-transform active:scale-95"
        >
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  const hasHistory = completedSessions.length > 0 || closedSessions.length > 0;

  return (
    <div className="space-y-6 pb-4">
      {/* ── Active Consultation ── */}
      {activeSession ? (
        <ActiveConsultationPanel session={activeSession} onOpenChat={onOpenChat} />
      ) : (
        <div className="rounded-[18px] border border-dashed border-neutral-200 bg-white px-6 py-8 text-center">
          <MessageCircleMore size={24} className="mx-auto text-neutral-300" />
          <p className="mt-3 text-[14px] font-extrabold text-neutral-800">No active consultation</p>
          <p className="mx-auto mt-1 max-w-[240px] text-[11px] font-medium leading-relaxed text-neutral-400">
            Accepted consultations will appear here automatically.
          </p>
        </div>
      )}

      {/* ── Completed Consultations ── */}
      {completedSessions.length > 0 && (
        <section>
          <div className="mb-3 px-1">
            <h2 className="text-sm font-black text-neutral-900">Completed Consultations</h2>
          </div>
          <div className="space-y-2.5">
            {completedSessions.map(session => (
              <ConsultationHistoryCard key={session.id} session={session} onOpenChat={onOpenChat} />
            ))}
          </div>
        </section>
      )}

      {/* ── Unsuccessful / Closed ── */}
      {closedSessions.length > 0 && (
        <section>
          <div className="mb-3 px-1">
            <h2 className="text-sm font-black text-neutral-900">Unsuccessful / Closed</h2>
          </div>
          <div className="space-y-2.5">
            {closedSessions.map(session => (
              <ConsultationHistoryCard key={session.id} session={session} onOpenChat={onOpenChat} />
            ))}
          </div>
        </section>
      )}

      {/* ── Full History Empty ── */}
      {!hasHistory && (
        <div className="rounded-[18px] border border-dashed border-neutral-200 bg-white px-6 py-6 text-center">
          <History size={20} className="mx-auto text-neutral-300" />
          <p className="mt-2 text-[13px] font-extrabold text-neutral-800">No consultation history yet</p>
          <p className="mx-auto mt-1 text-[10px] font-medium leading-relaxed text-neutral-400">
            Completed consultations will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
