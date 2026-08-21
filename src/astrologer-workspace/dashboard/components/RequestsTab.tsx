import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  Clock3,
  LoaderCircle,
  MessageCircleMore,
  Phone,
  RefreshCw,
  WifiOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AstrologerDashboardSession } from '../types';
import {
  ACTIVE_ASTROLOGER_SESSION_STATUSES,
  RECENTLY_MISSED_DISPLAY_LIMIT,
  TERMINAL_NEGATIVE_STATUSES,
} from '../dashboardConfig';
import { formatMoney } from '../../../utils/format';

// ─── Active status set ───────────────────────────────────────────────────────
const activeStatusSet = new Set(ACTIVE_ASTROLOGER_SESSION_STATUSES);
const terminalNegativeSet = new Set(TERMINAL_NEGATIVE_STATUSES);

// ─── Wait timer ──────────────────────────────────────────────────────────────
/**
 * Displays elapsed wait time derived from requestedAt.
 * Timer is display-only. Backend status is the source of truth for expiry.
 * Cleanup via useEffect return.
 */
function WaitTimer({ requestedAt }: { requestedAt: string }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const compute = () => {
      const ms = Math.max(0, Date.now() - new Date(requestedAt).getTime());
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setElapsed(`${m}m ${s}s`);
    };
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [requestedAt]);

  return (
    <span className="flex items-center gap-0.5 text-[9px] font-bold text-neutral-400">
      <Clock size={9} /> {elapsed} wait
    </span>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────
export interface RequestsTabProps {
  sessions: AstrologerDashboardSession[];
  isOnline: boolean;
  isLoading: boolean;
  error: string | null;
  processingSessionId: string | null;
  onDecision: (
    session: AstrologerDashboardSession,
    decision: 'accept' | 'reject',
  ) => Promise<void>;
  onOpenChat: (session: AstrologerDashboardSession) => void;
  onRetry: () => Promise<void>;
}

// ─── Per-card error state ─────────────────────────────────────────────────────
function useCardErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const setError = useCallback((id: string, msg: string) =>
    setErrors(prev => ({ ...prev, [id]: msg })), []);
  const clearError = useCallback((id: string) =>
    setErrors(prev => { const next = { ...prev }; delete next[id]; return next; }), []);
  return { errors, setError, clearError };
}

// ─── Request card ─────────────────────────────────────────────────────────────
interface RequestCardProps {
  key?: React.Key;
  session: AstrologerDashboardSession;
  processingSessionId: string | null;
  cardError?: string;
  onDecision: (session: AstrologerDashboardSession, decision: 'accept' | 'reject') => Promise<void>;
}

function RequestCard({ session, processingSessionId, cardError, onDecision }: RequestCardProps) {
  const customerName = session.customerDisplayName || 'Customer';
  const isProcessing = processingSessionId === session.id;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-[17px] border border-neutral-100 bg-white p-4 shadow-[0_3px_14px_rgba(0,0,0,0.02)]"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50 text-sm font-black text-[#FF8A00]">
            {customerName[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14.5px] font-black tracking-tight text-neutral-900">
              {customerName}
            </p>
            <div className="mt-0.5 flex items-center gap-2">
              <p className="text-[11px] font-bold text-neutral-400">
                {formatMoney(session.ratePerMinute)}/min
              </p>
              {session.kundliProfileId && (
                <span className="flex items-center gap-0.5 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-indigo-500">
                  <BookOpen size={9} /> Kundli
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="animate-pulse rounded-md bg-orange-100 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-orange-700">
            Waiting
          </span>
          <WaitTimer requestedAt={session.requestedAt} />
        </div>
      </div>

      {/* Card-scoped error */}
      {cardError && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2">
          <AlertCircle size={13} className="shrink-0 text-red-500" />
          <p className="text-[11px] font-semibold text-red-700">{cardError}</p>
        </div>
      )}

      {/* Actions — 44px min height */}
      <div className="mt-4 grid grid-cols-[1fr_2fr] gap-2">
        <button
          type="button"
          disabled={isProcessing}
          onClick={() => void onDecision(session, 'reject')}
          className="h-11 rounded-xl bg-neutral-50 text-[12px] font-black text-neutral-500 transition-colors disabled:opacity-50 active:bg-neutral-100"
        >
          Decline
        </button>
        <button
          type="button"
          disabled={isProcessing}
          onClick={() => void onDecision(session, 'accept')}
          className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#FF8A00] text-[13px] font-black text-white shadow-[0_4px_12px_rgba(255,138,0,0.3)] transition-transform disabled:opacity-50 active:scale-[0.98]"
        >
          {isProcessing
            ? <LoaderCircle size={15} className="animate-spin" />
            : <Phone size={15} className="mr-0.5" />}
          Accept Request
        </button>
      </div>
    </motion.article>
  );
}

// ─── Queued card (accepted, not yet active — defensive; backend drives active) ─
interface QueuedCardProps {
  key?: React.Key;
  session: AstrologerDashboardSession;
  onOpenChat: (session: AstrologerDashboardSession) => void;
}

function QueuedCard({ session, onOpenChat }: QueuedCardProps) {
  const customerName = session.customerDisplayName || 'Customer';
  return (
    <article className="rounded-[17px] border border-emerald-100 bg-emerald-50/40 p-4 shadow-[0_3px_14px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-100 text-sm font-black text-emerald-600">
            {customerName[0].toUpperCase()}
          </div>
          <div>
            <p className="text-[14px] font-black tracking-tight text-neutral-900">{customerName}</p>
            <p className="mt-0.5 text-[11px] font-bold text-neutral-500">
              {formatMoney(session.ratePerMinute)}/min
            </p>
          </div>
        </div>
        <span className="rounded-md bg-emerald-100 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700">
          Active
        </span>
      </div>
      <button
        type="button"
        onClick={() => onOpenChat(session)}
        className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 text-[12px] font-extrabold text-white active:scale-[0.98] transition-transform"
      >
        <MessageCircleMore size={15} /> Open Consultation
      </button>
    </article>
  );
}

// ─── Missed card (read-only) ──────────────────────────────────────────────────
interface MissedCardProps {
  key?: React.Key;
  session: AstrologerDashboardSession;
}

function MissedCard({ session }: MissedCardProps) {
  const customerName = session.customerDisplayName || 'Customer';
  const statusLabel: Record<string, string> = {
    EXPIRED: 'Expired',
    REJECTED: 'Declined',
    CANCELLED: 'Cancelled',
  };
  const label = statusLabel[session.status] ?? session.status;

  const requestedDate = new Date(session.requestedAt);
  const formattedDate = requestedDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <article className="flex items-center justify-between gap-3 rounded-[15px] border border-neutral-100 bg-white p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-black text-neutral-400">
          {customerName[0].toUpperCase()}
        </div>
        <div>
          <p className="text-[13px] font-bold text-neutral-800">{customerName}</p>
          <p className="mt-0.5 text-[10px] font-medium text-neutral-400">{formattedDate}</p>
        </div>
      </div>
      <span className="shrink-0 rounded-md bg-neutral-100 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-neutral-500">
        {label}
      </span>
    </article>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionHeading({ title, count }: { title: string; count?: number }) {
  return (
    <div className="mb-3 flex items-center justify-between px-1">
      <h2 className="text-sm font-black text-neutral-900">{title}</h2>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] font-bold text-neutral-400">{count}</span>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function RequestsTab({
  sessions,
  isOnline,
  isLoading,
  error,
  processingSessionId,
  onDecision,
  onOpenChat,
  onRetry,
}: RequestsTabProps) {
  const { errors: cardErrors, setError: setCardError, clearError: clearCardError } = useCardErrors();

  // Derived session lists — all derived from real backend sessions prop
  const waitingSessions = sessions.filter(s => s.status === 'WAITING_FOR_ASTROLOGER');
  const activeSessions = sessions.filter(s => activeStatusSet.has(s.status));
  const recentlyMissed = sessions
    .filter(s => terminalNegativeSet.has(s.status))
    .slice(0, RECENTLY_MISSED_DISPLAY_LIMIT);

  // Wrap onDecision to scope errors per card
  const handleDecision = useCallback(
    async (session: AstrologerDashboardSession, decision: 'accept' | 'reject') => {
      clearCardError(session.id);
      try {
        await onDecision(session, decision);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
        setCardError(session.id, msg);
      }
    },
    [onDecision, setCardError, clearCardError],
  );

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="animate-pulse rounded-[17px] border border-neutral-100 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-neutral-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-3/5 rounded-full bg-neutral-100" />
                <div className="h-2.5 w-2/5 rounded-full bg-neutral-100" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-[1fr_2fr] gap-2">
              <div className="h-11 rounded-xl bg-neutral-100" />
              <div className="h-11 rounded-xl bg-neutral-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Fetch error ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[20px] border border-neutral-100 bg-white px-8 py-10 text-center shadow-sm">
        <WifiOff size={28} className="text-neutral-300" />
        <p className="mt-3 text-sm font-extrabold text-neutral-800">Could not load requests</p>
        <p className="mt-1 text-[11px] font-medium text-neutral-400">{error}</p>
        <button
          type="button"
          onClick={() => void onRetry()}
          className="mt-4 flex items-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2.5 text-xs font-bold text-white active:scale-95 transition-transform"
        >
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  // ── Full empty (no sessions at all) ──────────────────────────────────────
  const hasAnySessions =
    waitingSessions.length > 0 || activeSessions.length > 0 || recentlyMissed.length > 0;

  if (!hasAnySessions) {
    return (
      <div className="rounded-[20px] border border-dashed border-neutral-200 bg-white px-8 py-10 text-center">
        {isOnline ? (
          <>
            <Clock3 size={26} className="mx-auto text-neutral-300" />
            <p className="mt-3 text-[15px] font-extrabold text-neutral-800">No consultation requests</p>
            <p className="mx-auto mt-1 max-w-[260px] text-[11px] font-medium leading-relaxed text-neutral-400">
              New requests will appear here automatically.
            </p>
          </>
        ) : (
          <>
            <WifiOff size={26} className="mx-auto text-neutral-300" />
            <p className="mt-3 text-[15px] font-extrabold text-neutral-800">You&apos;re currently offline</p>
            <p className="mx-auto mt-1 max-w-[260px] text-[11px] font-medium leading-relaxed text-neutral-400">
              Go online from Home to receive consultation requests.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── New Requests ───────────────────────────────────────────────────── */}
      {waitingSessions.length > 0 && (
        <section>
          <SectionHeading title="New Requests" count={waitingSessions.length} />
          <AnimatePresence initial={false}>
            <div className="space-y-2.5">
              {waitingSessions.map(session => (
                <RequestCard
                  key={session.id}
                  session={session}
                  processingSessionId={processingSessionId}
                  cardError={cardErrors[session.id]}
                  onDecision={handleDecision}
                />
              ))}
            </div>
          </AnimatePresence>
        </section>
      )}

      {/* ── Accepted / Active ──────────────────────────────────────────────── */}
      {activeSessions.length > 0 && (
        <section>
          <SectionHeading title="Active Consultations" count={activeSessions.length} />
          <div className="space-y-2.5">
            {activeSessions.map(session => (
              <QueuedCard key={session.id} session={session} onOpenChat={onOpenChat} />
            ))}
          </div>
        </section>
      )}

      {/* ── No new requests but online ────────────────────────────────────── */}
      {waitingSessions.length === 0 && (
        <div className="rounded-[18px] border border-dashed border-neutral-200 bg-white px-6 py-6 text-center">
          <Clock3 size={20} className="mx-auto text-neutral-300" />
          <p className="mt-2 text-[13px] font-extrabold text-neutral-800">No requests waiting</p>
          <p className="mx-auto mt-1 max-w-[270px] text-[10px] font-medium leading-relaxed text-neutral-400">
            {isOnline
              ? "You're online and ready to receive new consultation requests."
              : 'Go online to start receiving consultation requests.'}
          </p>
        </div>
      )}

      {/* ── Recently Missed ────────────────────────────────────────────────── */}
      {recentlyMissed.length > 0 && (
        <section>
          <SectionHeading title="Recently Missed" />
          <div className="space-y-2">
            {recentlyMissed.map(session => (
              <MissedCard key={session.id} session={session} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
