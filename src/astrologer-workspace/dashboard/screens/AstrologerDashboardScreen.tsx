import React, { useMemo, useState } from 'react';
import { ShieldCheck, Clock3, LoaderCircle, MessageCircleMore, Phone, Clock, UserRound, BadgeCheck, IndianRupee, AlertCircle, Pencil, Eye } from 'lucide-react';
import { motion } from 'motion/react';
import { Screen } from '../../../types';
import AstrologerDashboardBottomNav from '../components/AstrologerDashboardBottomNav';
import { useAstrologerDashboard } from '../AstrologerDashboardContext';
import { AstrologerDashboardSession, AstrologerDashboardTab } from '../types';
import { ACTIVE_ASTROLOGER_SESSION_STATUSES } from '../dashboardConfig';
import { ApiConsultationRepository } from '../../../repositories/api/apiConsultationRepository';
import { formatMoney } from '../../../utils/format';

import AstrologerHeader from '../components/AstrologerHeader';
import AvailabilityCard from '../components/AvailabilityCard';
import TodayOverviewCard from '../components/TodayOverviewCard';
import QuickBillingSummary from '../components/QuickBillingSummary';
import ActiveConsultationCard from '../components/ActiveConsultationCard';
import QueuePreview from '../components/QueuePreview';
import ProfileCompletionCard from '../components/ProfileCompletionCard';
import RequestsTab from '../components/RequestsTab';
import ConsultsTab from '../components/ConsultsTab';
import { PayoutAccountForm } from '../components/PayoutAccountForm';
import { astrologerDashboardService } from '../services/astrologerDashboardService';
import { AstrologerPayoutAccount, AstrologerEarningsPayoutSummary } from '../types';

import { EarningsSubNavigation, EarningsInternalTab } from '../components/earnings/EarningsSubNavigation';
import { EarningsOverviewTab } from '../components/earnings/EarningsOverviewTab';
import { WithdrawTab } from '../components/earnings/WithdrawTab';
import { StatementsTab } from '../components/earnings/StatementsTab';

const consultationRepository = new ApiConsultationRepository();

interface AstrologerDashboardScreenProps {
  onNavigate: (screen: Screen, params?: unknown) => void;
  onOpenDrawer?: () => void;
  routeParams?: any;
}

const activeStatuses = new Set(ACTIVE_ASTROLOGER_SESSION_STATUSES);

function statusLabel(status: AstrologerDashboardSession['status']): string {
  return status.toLowerCase().split('_').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
}

export default function AstrologerDashboardScreen({ onNavigate, onOpenDrawer, routeParams }: AstrologerDashboardScreenProps) {
  const {
    profile,
    sessions,
    summary,
    isSummaryLoading,
    summaryError,
    retrySummary,
    isLoading,
    isUpdatingAvailability,
    error,
    refresh,
    setAvailability,
  } = useAstrologerDashboard();
  
  const [currentTab, setCurrentTab] = useState<AstrologerDashboardTab>((routeParams?.initialTab as AstrologerDashboardTab) || 'home');
  const [processingSessionId, setProcessingSessionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [payoutAccount, setPayoutAccount] = useState<AstrologerPayoutAccount | null>(null);
  const [isPayoutLoading, setIsPayoutLoading] = useState(false);
  
  const [earningsTab, setEarningsTab] = useState<EarningsInternalTab>('overview');
  const [earningsSummary, setEarningsSummary] = useState<AstrologerEarningsPayoutSummary | null>(null);
  const [isEarningsSummaryLoading, setIsEarningsSummaryLoading] = useState(false);
  const [earningsSummaryError, setEarningsSummaryError] = useState<string | null>(null);

  const waitingSessions = useMemo(
    () => sessions.filter(session => session.status === 'WAITING_FOR_ASTROLOGER'),
    [sessions],
  );
  
  const activeSessions = useMemo(
    () => sessions.filter(session => activeStatuses.has(session.status)),
    [sessions],
  );
  
  const consultSessions = useMemo(
    () => sessions.filter(session => session.status !== 'WAITING_FOR_ASTROLOGER'),
    [sessions],
  );

  const openChat = (session: AstrologerDashboardSession) => {
    onNavigate('astrologer-consultation-chat', {
      sessionId: session.id,
      customerName: session.customerDisplayName,
      startedAt: session.startedAt,
      readOnly: !activeStatuses.has(session.status),
    });
  };

  const decideRequest = async (session: AstrologerDashboardSession, decision: 'accept' | 'reject') => {
    if (processingSessionId) return;
    setProcessingSessionId(session.id);
    setActionError(null);
    try {
      const result = decision === 'accept'
        ? await consultationRepository.acceptSession(session.id)
        : await consultationRepository.rejectSession(session.id);
      // Refresh dashboard so realtime state is authoritative
      await refresh();
      // Navigate to chat ONLY if the backend confirms the session is now active.
      // accept_astrologer_consultation returns status 'already_accepted' or calls
      // start_consultation_session which produces ACTIVE / LOW_BALANCE / RECHARGING.
      if (
        decision === 'accept' &&
        result.session &&
        activeStatuses.has(result.session.status as AstrologerDashboardSession['status'])
      ) {
        onNavigate('astrologer-consultation-chat', {
          sessionId: result.session.id,
          customerName: session.customerDisplayName,
          startedAt: result.session.startedAt,
        });
      }
      // If session is already_accepted (already active) or reject succeeded,
      // the refresh above will update the UI through the realtime context.
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Unable to update this consultation request.');
      // Re-throw so RequestsTab can scope the error to the card
      throw caught;
    } finally {
      setProcessingSessionId(null);
    }
  };

  const loadEarningsData = async () => {
    setIsEarningsSummaryLoading(true);
    setEarningsSummaryError(null);
    try {
      const data = await astrologerDashboardService.getEarningsPayoutSummary(Intl.DateTimeFormat().resolvedOptions().timeZone);
      setEarningsSummary(data);
    } catch (err) {
      setEarningsSummaryError(err instanceof Error ? err.message : 'Failed to load earnings summary');
    } finally {
      setIsEarningsSummaryLoading(false);
    }
  };

  const handleTabChange = (tab: AstrologerDashboardTab) => {
    setCurrentTab(tab);
    if (tab === 'earnings' && !earningsSummary && !isEarningsSummaryLoading) {
      loadEarningsData();
    }
    if (tab === 'earnings' && !payoutAccount && !isPayoutLoading) {
      setIsPayoutLoading(true);
      astrologerDashboardService.getPayoutAccount()
        .then(account => setPayoutAccount(account))
        .catch(err => console.error('Failed to load payout account:', err))
        .finally(() => setIsPayoutLoading(false));
    }
  };

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
      <AstrologerHeader
        profile={profile}
        onOpenDrawer={onOpenDrawer}
        onSwitchWorkspace={() => {
          localStorage.setItem('kundli_nova_workspace', 'customer');
          onNavigate('home');
        }}
      />

      <main className="flex-1 overflow-y-auto px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5 no-scrollbar">
        {currentTab === 'home' && (
          <div className="space-y-5">
            <AvailabilityCard
              isOnline={isOnline}
              isUpdatingAvailability={isUpdatingAvailability}
              availabilityStatus={profile.availability}
              setAvailability={setAvailability}
            />

            <TodayOverviewCard
              summary={summary}
              isLoading={isSummaryLoading}
              error={summaryError}
              onRetry={retrySummary}
            />

            <QuickBillingSummary
              summary={summary}
              isLoading={isSummaryLoading}
              error={summaryError}
            />

            <ActiveConsultationCard
              activeSession={activeSessions.length > 0 ? activeSessions[0] : null}
              onOpenChat={openChat}
            />

            <QueuePreview
              requests={waitingSessions}
              isOnline={isOnline}
              onViewAll={() => setCurrentTab('requests')}
              processingSessionId={processingSessionId}
              onDecision={decideRequest}
            />

            <ProfileCompletionCard
              onCompleteProfile={() => setCurrentTab('profile')}
            />
          </div>
        )}

        {currentTab === 'requests' && (
          <RequestsTab
            sessions={sessions}
            isOnline={isOnline}
            isLoading={isLoading}
            error={error}
            processingSessionId={processingSessionId}
            onDecision={decideRequest}
            onOpenChat={openChat}
            onRetry={refresh}
          />
        )}

        {currentTab === 'consults' && (
          <ConsultsTab
            sessions={sessions}
            isLoading={isLoading}
            error={error}
            onOpenChat={openChat}
            onRetry={refresh}
          />
        )}

        {currentTab === 'earnings' && (
          <section className="space-y-0 h-full flex flex-col">
            <EarningsSubNavigation currentTab={earningsTab} onChange={setEarningsTab} />
            
            <div className="flex-1">
              {earningsTab === 'overview' && (
                isEarningsSummaryLoading ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-32 bg-neutral-100 rounded-2xl" />
                    <div className="h-48 bg-neutral-100 rounded-2xl" />
                  </div>
                ) : earningsSummaryError ? (
                  <div className="flex flex-col items-center justify-center py-8 px-4 text-center bg-white rounded-[24px]">
                    <AlertCircle size={32} className="text-red-400 mb-3" />
                    <p className="text-sm font-bold text-neutral-800 mb-1">Unable to load earnings summary</p>
                    <p className="text-xs text-neutral-500 mb-4">{earningsSummaryError}</p>
                    <button onClick={loadEarningsData} className="px-4 py-2 bg-neutral-900 text-white text-xs font-bold rounded-lg active:scale-95 transition-transform">
                      Retry
                    </button>
                  </div>
                ) : earningsSummary ? (
                  <EarningsOverviewTab 
                    summary={earningsSummary}
                    payoutAccount={payoutAccount}
                    onNavigateWithdraw={() => setEarningsTab('withdraw')}
                  />
                ) : null
              )}

              {earningsTab === 'withdraw' && (
                isEarningsSummaryLoading ? (
                  <div className="animate-pulse h-48 bg-neutral-100 rounded-2xl" />
                ) : earningsSummaryError ? (
                  <div className="rounded-[24px] bg-white p-8 text-center text-red-500 font-bold">{earningsSummaryError}</div>
                ) : earningsSummary ? (
                  <WithdrawTab 
                    summary={earningsSummary}
                    payoutAccount={payoutAccount}
                    onSuccess={() => {
                      loadEarningsData();
                      setEarningsTab('statements');
                    }}
                  />
                ) : null
              )}

              {earningsTab === 'statements' && (
                <StatementsTab />
              )}
            </div>
          </section>
        )}

        {currentTab === 'profile' && (
          <section className="space-y-4">
            <div className="rounded-[24px] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-neutral-100">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-3">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] bg-orange-50">
                    {profile.image ? <img src={profile.image} alt={profile.name} className="h-full w-full object-cover" /> : <UserRound size={28} className="text-[#FF8A00]" />}
                  </div>
                  <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 border-[2.5px] border-white shadow-sm">
                    <BadgeCheck size={14} className="text-white" />
                  </div>
                </div>
                <h2 className="text-xl font-black text-neutral-900 tracking-tight">{profile.name}</h2>
                <div className="mt-1.5 flex items-center justify-center gap-2">
                  <span className="rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#FF8A00]">Level 2 Astrologer</span>
                  <span className="text-[12px] font-bold text-neutral-400">•</span>
                  <span className="text-[13px] font-bold text-neutral-600">{formatMoney(profile.pricePerMinute)}/min</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => onNavigate('manage-astrologer-profile')} className="flex flex-col items-center justify-center gap-2 rounded-[20px] border border-neutral-100 bg-white p-4 shadow-[0_4px_15px_rgba(0,0,0,0.02)] active:scale-[0.98] transition-transform">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-[#FF8A00]"><Pencil size={18} /></span>
                <span className="text-[12px] font-black text-neutral-800">Edit Profile</span>
              </button>
              <button type="button" onClick={() => onNavigate('astrologer-profile', { astrologerId: profile.id })} className="flex flex-col items-center justify-center gap-2 rounded-[20px] border border-neutral-100 bg-white p-4 shadow-[0_4px_15px_rgba(0,0,0,0.02)] active:scale-[0.98] transition-transform">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-500"><Eye size={18} /></span>
                <span className="text-[12px] font-black text-neutral-800">Preview</span>
              </button>
            </div>
          </section>
        )}
      </main>

      <AstrologerDashboardBottomNav
        currentTab={currentTab}
        onTabChange={handleTabChange}
        waitingCount={waitingSessions.length}
      />
    </div>
  );
}

function DashboardList({
  title,
  emptyTitle,
  emptyDescription,
  sessions,
  processingSessionId,
  onDecision,
  onOpen,
}: {
  title: string;
  emptyTitle: string;
  emptyDescription: string;
  sessions: AstrologerDashboardSession[];
  processingSessionId: string | null;
  onDecision: (session: AstrologerDashboardSession, decision: 'accept' | 'reject') => Promise<void>;
  onOpen: (session: AstrologerDashboardSession) => void;
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
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 text-indigo-500 font-black text-sm">
                    {(session.customerDisplayName || 'K')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[14.5px] font-black text-neutral-900 tracking-tight">{session.customerDisplayName || 'Customer'}</p>
                    <p className="mt-0.5 text-[11px] font-bold text-neutral-400">Rate: {formatMoney(session.ratePerMinute)}/min</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`rounded-md px-2 py-1 text-[9px] font-black uppercase tracking-wider ${
                    session.status === 'WAITING_FOR_ASTROLOGER' ? 'bg-orange-100 text-orange-700 animate-pulse'
                      : activeStatuses.has(session.status) ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-neutral-100 text-neutral-500'
                  }`}>{statusLabel(session.status)}</span>
                  {session.status === 'WAITING_FOR_ASTROLOGER' && <span className="mt-1.5 text-[9px] font-bold text-neutral-400 flex items-center"><Clock size={10} className="mr-0.5" /> 1m 20s wait</span>}
                </div>
              </div>
              
              {session.status !== 'WAITING_FOR_ASTROLOGER' && (
                <div className="mt-4 flex items-center gap-4 rounded-xl bg-neutral-50 p-2.5 text-[11px] font-bold text-neutral-500 border border-neutral-100">
                  <span className="flex-1 text-center border-r border-neutral-200">{session.billedMinutes} mins</span>
                  <span className="flex-1 text-center font-black text-neutral-800">{formatMoney(session.totalCharged)} Earned</span>
                </div>
              )}
              
              {session.status === 'WAITING_FOR_ASTROLOGER' ? (
                <div className="mt-4 grid grid-cols-[1fr_2fr] gap-2">
                  <button type="button" disabled={processingSessionId === session.id} onClick={() => void onDecision(session, 'reject')} className="h-11 rounded-xl bg-neutral-50 text-[12px] font-black text-neutral-500 disabled:opacity-50 active:bg-neutral-100 transition-colors">Decline</button>
                  <button type="button" disabled={processingSessionId === session.id} onClick={() => void onDecision(session, 'accept')} className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#FF8A00] text-[13px] font-black text-white shadow-[0_4px_12px_rgba(255,138,0,0.3)] disabled:opacity-50 active:scale-[0.98] transition-transform">
                    {processingSessionId === session.id && <LoaderCircle size={15} className="animate-spin" />} <Phone size={15} className="mr-0.5" /> Accept Request
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => onOpen(session)} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 text-[11px] font-extrabold text-white">
                  <MessageCircleMore size={14} /> {activeStatuses.has(session.status) ? 'Open live chat' : 'View chat history'}
                </button>
              )}
            </motion.article>
          ))}
        </div>
      )}
    </section>
  );
}
