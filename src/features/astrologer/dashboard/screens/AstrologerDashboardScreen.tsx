import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  IndianRupee,
  Clock3,
  LoaderCircle,
  MessageCircleMore,
  RefreshCw,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Screen } from '../../../../types';
import AstrologerDashboardBottomNav from '../components/AstrologerDashboardBottomNav';
import { useAstrologerDashboard } from '../AstrologerDashboardContext';
import { AstrologerDashboardSession, AstrologerDashboardTab } from '../types';
import { ACTIVE_ASTROLOGER_SESSION_STATUSES } from '../dashboardConfig';

interface AstrologerDashboardScreenProps {
  onNavigate: (screen: Screen, params?: unknown) => void;
}

const activeStatuses = new Set(ACTIVE_ASTROLOGER_SESSION_STATUSES);

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function statusLabel(status: AstrologerDashboardSession['status']): string {
  return status.toLowerCase().split('_').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
}

export default function AstrologerDashboardScreen({ onNavigate }: AstrologerDashboardScreenProps) {
  const {
    profile,
    sessions,
    summary,
    isLoading,
    isUpdatingAvailability,
    error,
    refresh,
    setAvailability,
  } = useAstrologerDashboard();
  const [currentTab, setCurrentTab] = useState<AstrologerDashboardTab>('home');

  const waitingSessions = useMemo(
    () => sessions.filter(session => session.status === 'WAITING_FOR_ASTROLOGER'),
    [sessions],
  );
  const activeSessions = useMemo(
    () => sessions.filter(session => activeStatuses.has(session.status)),
    [sessions],
  );

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-[#FAFAFA] px-8 text-center">
        <LoaderCircle size={28} className="animate-spin text-[#FF8A00]" />
        <p className="mt-4 text-sm font-bold text-neutral-800">Preparing your workspace</p>
        <p className="mt-1 text-xs font-medium text-neutral-400">Loading verified profile and consultation activity.</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-white px-8 text-center">
        <ShieldCheck size={34} className="text-neutral-300" />
        <h1 className="mt-4 text-lg font-black text-neutral-900">Verified workspace unavailable</h1>
        <p className="mt-2 text-xs font-medium leading-relaxed text-neutral-500">
          The astrologer dashboard becomes available after your application is approved and published.
        </p>
        <button onClick={() => onNavigate('partner-with-us')} className="mt-5 rounded-full bg-[#FF8A00] px-5 py-2.5 text-xs font-bold text-white">
          View application
        </button>
      </div>
    );
  }

  const isOnline = profile.availability === 'ONLINE';

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#FAFAFA]">
      <header className="flex items-center gap-3 border-b border-neutral-100 bg-white px-5 py-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100">
          {profile.image ? <img src={profile.image} alt="" className="h-full w-full object-cover" /> : <UsersRound size={20} className="text-neutral-400" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="truncate text-[16px] font-black text-neutral-900">{profile.name}</h1>
            <BadgeCheck size={16} className="shrink-0 text-emerald-500" />
          </div>
          <p className="mt-0.5 text-[11px] font-semibold text-neutral-400">Astrologer workspace</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-2 text-[10px] font-bold text-neutral-600 active:bg-neutral-50"
        >
          <ArrowLeftRight size={14} /> Customer mode
        </button>
      </header>

      {error && (
        <div className="mx-5 mt-4 flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
          <p className="text-xs font-semibold text-red-700">{error}</p>
          <button type="button" onClick={() => void refresh()} className="shrink-0 rounded-full p-2 text-red-600 active:bg-red-100"><RefreshCw size={15} /></button>
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-5 pb-6 pt-5 no-scrollbar">
        {currentTab === 'home' && (
          <div className="space-y-5">
            <section className="relative overflow-hidden rounded-[22px] bg-neutral-950 p-5 text-white">
              <div className="absolute -right-12 -top-14 h-40 w-40 rounded-full bg-[#FF8A00]/15 blur-3xl" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.17em] text-neutral-500">Availability</p>
                  <h2 className="mt-2 text-[22px] font-black tracking-tight">{isOnline ? 'You are accepting requests' : 'You are currently offline'}</h2>
                  <p className="mt-2 max-w-[245px] text-[12px] font-medium leading-relaxed text-neutral-400">
                    {isOnline ? 'New consultation requests can reach your live queue.' : 'Go online whenever you are ready to consult.'}
                  </p>
                </div>
                <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.8)]' : 'bg-neutral-600'}`} />
              </div>
              <button
                type="button"
                disabled={isUpdatingAvailability || profile.availability === 'BUSY'}
                onClick={() => void setAvailability(isOnline ? 'OFFLINE' : 'ONLINE')}
                className={`relative mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-[14px] text-xs font-extrabold transition-colors disabled:opacity-60 ${
                  isOnline ? 'bg-white text-neutral-900' : 'bg-[#FF8A00] text-white'
                }`}
              >
                {isUpdatingAvailability && <LoaderCircle size={16} className="animate-spin" />}
                {profile.availability === 'BUSY' ? 'Active consultation in progress' : isOnline ? 'Go offline' : 'Go online'}
              </button>
            </section>

            <section className="grid grid-cols-2 gap-3">
              <MetricCard icon={<UsersRound size={18} />} label="Waiting requests" value={String(summary.waitingRequests)} />
              <MetricCard icon={<MessageCircleMore size={18} />} label="Active sessions" value={String(summary.activeSessions)} />
              <MetricCard icon={<CalendarCheck size={18} />} label="Completed today" value={String(summary.completedToday)} />
              <MetricCard icon={<IndianRupee size={18} />} label="Gross value today" value={formatMoney(summary.grossValueToday)} />
            </section>

            <DashboardList
              title="Live queue"
              emptyTitle="No consultation waiting"
              emptyDescription={isOnline ? 'New requests will appear here automatically.' : 'Go online to start receiving consultation requests.'}
              sessions={[...waitingSessions, ...activeSessions].slice(0, 4)}
            />

            <button
              type="button"
              onClick={() => onNavigate('manage-astrologer-profile')}
              className="flex w-full items-center gap-3 rounded-[18px] border border-neutral-100 bg-white p-4 text-left shadow-[0_4px_18px_rgba(0,0,0,0.025)]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-[#FF8A00]"><BadgeCheck size={19} /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-neutral-900">Manage public profile</span><span className="mt-1 block text-[11px] font-medium text-neutral-500">Update what customers see before starting a consultation.</span></span>
              <ArrowRight size={17} className="text-neutral-300" />
            </button>
          </div>
        )}

        {currentTab === 'requests' && (
          <DashboardList
            title="Consultation requests"
            emptyTitle="No requests waiting"
            emptyDescription={isOnline ? 'Your queue is clear. New requests appear in realtime.' : 'Go online from Home to receive requests.'}
            sessions={waitingSessions}
          />
        )}

        {currentTab === 'activity' && (
          <DashboardList
            title="Consultation activity"
            emptyTitle="No consultation activity"
            emptyDescription="Your assigned consultations will appear here after customers request them."
            sessions={sessions}
          />
        )}
      </main>

      <AstrologerDashboardBottomNav
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenProfile={() => onNavigate('manage-astrologer-profile')}
      />
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-neutral-100 bg-white p-4 shadow-[0_4px_18px_rgba(0,0,0,0.02)]">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-50 text-[#FF8A00]">{icon}</span>
      <p className="mt-4 text-[20px] font-black tracking-tight text-neutral-900">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">{label}</p>
    </div>
  );
}

function DashboardList({
  title,
  emptyTitle,
  emptyDescription,
  sessions,
}: {
  title: string;
  emptyTitle: string;
  emptyDescription: string;
  sessions: AstrologerDashboardSession[];
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-black text-neutral-900">{title}</h2>
        {sessions.length > 0 && <span className="text-[10px] font-bold text-neutral-400">{sessions.length} total</span>}
      </div>
      {sessions.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-neutral-200 bg-white px-6 py-8 text-center">
          <Clock3 size={23} className="mx-auto text-neutral-300" />
          <p className="mt-3 text-sm font-extrabold text-neutral-800">{emptyTitle}</p>
          <p className="mx-auto mt-1 max-w-[270px] text-[11px] font-medium leading-relaxed text-neutral-400">{emptyDescription}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sessions.map(session => (
            <motion.article key={session.id} layout className="rounded-[17px] border border-neutral-100 bg-white p-4 shadow-[0_3px_14px_rgba(0,0,0,0.02)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-neutral-900">Consultation</p>
                  <p className="mt-1 text-[11px] font-medium text-neutral-400">Requested {formatDateTime(session.requestedAt)}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide ${
                  session.status === 'WAITING_FOR_ASTROLOGER' ? 'bg-orange-50 text-[#FF8A00]'
                    : activeStatuses.has(session.status) ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-neutral-100 text-neutral-500'
                }`}>{statusLabel(session.status)}</span>
              </div>
              <div className="mt-3 flex items-center gap-4 border-t border-neutral-50 pt-3 text-[11px] font-semibold text-neutral-500">
                <span>{formatMoney(session.ratePerMinute)}/min</span>
                <span>{session.billedMinutes} billed min</span>
                <span className="ml-auto font-extrabold text-neutral-800">{formatMoney(session.totalCharged)}</span>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </section>
  );
}
