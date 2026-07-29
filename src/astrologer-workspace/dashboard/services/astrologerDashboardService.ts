import { supabase } from '../../../lib/supabase';
import {
  AstrologerAvailability,
  AstrologerDashboardSession,
  AstrologerDashboardSnapshot,
  AstrologerWorkspaceProfile,
  AstrologerPayoutAccount,
} from '../types';
import { ASTROLOGER_DASHBOARD_SESSION_LIMIT } from '../dashboardConfig';
import { AstrologerDashboardSummary, AstrologerEarningsPayoutSummary, AstrologerWithdrawalRequest, AstrologerPaymentStatement, AstrologerPaymentStatementType } from '../types';

type WorkspaceProfileRow = {
  id: string;
  user_id: string;
  name: string;
  image: string | null;
  status: AstrologerAvailability;
  price_per_minute: number | string;
  is_published: boolean;
  last_seen: string;
};

type DashboardSessionRow = {
  id: string;
  customer_display_name: string | null;
  status: AstrologerDashboardSession['status'];
  rate_per_minute: number | string;
  requested_at: string;
  started_at: string | null;
  ended_at: string | null;
  billed_minutes: number;
  total_charged: number | string;
  kundli_profile_id: string | null;
};

const workspaceProfileColumns = [
  'id',
  'user_id',
  'name',
  'image',
  'status',
  'price_per_minute',
  'is_published',
  'last_seen',
].join(',');

const dashboardSessionColumns = [
  'id',
  'customer_display_name',
  'status',
  'rate_per_minute',
  'requested_at',
  'started_at',
  'ended_at',
  'billed_minutes',
  'total_charged',
  'kundli_profile_id',
].join(',');

function mapProfile(row: WorkspaceProfileRow): AstrologerWorkspaceProfile {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    image: row.image ?? '',
    availability: row.status,
    pricePerMinute: Number(row.price_per_minute),
    isPublished: row.is_published,
    lastSeenAt: row.last_seen,
  };
}

function mapSession(row: DashboardSessionRow): AstrologerDashboardSession {
  return {
    id: row.id,
    customerDisplayName: row.customer_display_name ?? undefined,
    status: row.status,
    ratePerMinute: Number(row.rate_per_minute),
    requestedAt: row.requested_at,
    startedAt: row.started_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
    billedMinutes: row.billed_minutes,
    totalCharged: Number(row.total_charged),
    kundliProfileId: row.kundli_profile_id ?? null,
  };
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Your session has expired. Please sign in again.');
  return data.user.id;
}

export const astrologerDashboardService = {
  
  async getDashboardSummary(timezone: string): Promise<AstrologerDashboardSummary> {
    const userId = await requireUserId();
    const { data, error } = await supabase.rpc('get_my_astrologer_dashboard_summary', {
      p_timezone: timezone
    });

    if (error) throw new Error(error.message);
    if (!data) throw new Error('No summary data returned');

    return {
      todayGrossBilling: Number(data.todayGrossBilling ?? 0),
      yesterdayGrossBilling: Number(data.yesterdayGrossBilling ?? 0),
      weekGrossBilling: Number(data.weekGrossBilling ?? 0),
      monthGrossBilling: Number(data.monthGrossBilling ?? 0),
      lifetimeGrossBilling: Number(data.lifetimeGrossBilling ?? 0),
      pendingSettlement: data.pendingSettlement ? Number(data.pendingSettlement) : null,
      withdrawableBalance: data.withdrawableBalance ? Number(data.withdrawableBalance) : null,
      processingPayout: data.processingPayout ? Number(data.processingPayout) : null,
      lastSettlementAt: data.lastSettlementAt,
      settlementSystemConfigured: Boolean(data.settlementSystemConfigured),
      totalConsultsToday: Number(data.totalConsultsToday ?? 0),
      billedMinutesToday: Number(data.billedMinutesToday ?? 0),
      generatedAt: data.generatedAt ?? new Date().toISOString()
    };
  },
  async getSnapshot(): Promise<AstrologerDashboardSnapshot | null> {
    const userId = await requireUserId();
    const { data: profileData, error: profileError } = await supabase
      .from('astrologers')
      .select(workspaceProfileColumns)
      .eq('user_id', userId)
      .eq('is_published', true)
      .maybeSingle();

    if (profileError) throw new Error(profileError.message);
    if (!profileData) return null;

    const profile = mapProfile(profileData as unknown as WorkspaceProfileRow);
    const { data: sessionData, error: sessionError } = await supabase
      .from('consultation_sessions')
      .select(dashboardSessionColumns)
      .eq('astrologer_id', profile.id)
      .order('requested_at', { ascending: false })
      .limit(ASTROLOGER_DASHBOARD_SESSION_LIMIT);

    if (sessionError) throw new Error(sessionError.message);
    return {
      profile,
      sessions: (sessionData ?? []).map(row => mapSession(row as unknown as DashboardSessionRow)),
    };
  },

  async setAvailability(
    profileId: string,
    availability: Extract<AstrologerAvailability, 'ONLINE' | 'OFFLINE'>,
  ): Promise<AstrologerWorkspaceProfile> {
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from('astrologers')
      .update({ status: availability, last_seen: new Date().toISOString() })
      .eq('id', profileId)
      .eq('user_id', userId)
      .select(workspaceProfileColumns)
      .single();

    if (error) throw new Error(error.message);
    return mapProfile(data as unknown as WorkspaceProfileRow);
  },

  async getPayoutAccount(): Promise<AstrologerPayoutAccount | null> {
    await requireUserId();
    const { data, error } = await supabase.rpc('get_my_payout_account');
    if (error) throw new Error(error.message);
    if (!data) return null;
    
    return {
      id: data.id,
      accountHolderName: data.account_holder_name,
      bankName: data.bank_name,
      accountNumberLast4: data.account_number_last4,
      ifscCode: data.ifsc_code,
      status: data.status,
      rejectionReason: data.rejection_reason,
      submittedAt: data.submitted_at,
      verifiedAt: data.verified_at,
    };
  },

  async savePayoutAccount(details: { accountHolderName: string, bankName: string, accountNumber: string, ifscCode: string }): Promise<AstrologerPayoutAccount> {
    await requireUserId();
    const { data, error } = await supabase.rpc('submit_my_payout_account', {
      p_account_holder_name: details.accountHolderName,
      p_bank_name: details.bankName,
      p_account_number: details.accountNumber,
      p_ifsc_code: details.ifscCode
    });
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Failed to save payout account');

    return {
      id: data.id,
      accountHolderName: data.account_holder_name,
      bankName: data.bank_name,
      accountNumberLast4: data.account_number_last4,
      ifscCode: data.ifsc_code,
      status: data.status,
      rejectionReason: data.rejection_reason,
      submittedAt: data.submitted_at,
      verifiedAt: data.verified_at,
    };
  },
  
  async getEarningsPayoutSummary(timezone: string): Promise<AstrologerEarningsPayoutSummary> {
    const userId = await requireUserId();
    const { data, error } = await supabase.rpc('get_my_earnings_payout_summary', { p_timezone: timezone });
    if (error) throw new Error(error.message);
    if (!data) throw new Error('No earnings summary data returned');
    
    return {
      grossBillingToday: Number(data.gross_billing_today ?? 0),
      grossBillingYesterday: Number(data.gross_billing_yesterday ?? 0),
      grossBillingWeek: Number(data.gross_billing_week ?? 0),
      grossBillingMonth: Number(data.gross_billing_month ?? 0),
      grossBillingLifetime: Number(data.gross_billing_lifetime ?? 0),

      calculatedEarningsToday: Number(data.calculated_earnings_today ?? 0),
      calculatedEarningsYesterday: Number(data.calculated_earnings_yesterday ?? 0),
      calculatedEarningsWeek: Number(data.calculated_earnings_week ?? 0),
      calculatedEarningsMonth: Number(data.calculated_earnings_month ?? 0),
      calculatedEarningsLifetime: Number(data.calculated_earnings_lifetime ?? 0),

      awaitingCommission: Number(data.awaiting_commission ?? 0),

      withdrawableBalance: data.withdrawable_balance !== null ? Number(data.withdrawable_balance) : null,
      pendingSettlement: data.pending_settlement !== null ? Number(data.pending_settlement) : null,
      processingPayout: data.processing_payout !== null ? Number(data.processing_payout) : null,
      lastSettlementAmount: data.last_settlement_amount !== null ? Number(data.last_settlement_amount) : null,
      lastSettlementAt: data.last_settlement_at,

      canRequestWithdrawal: Boolean(data.can_request_withdrawal),
      withdrawalDisabledReason: data.withdrawal_disabled_reason,
      minimumWithdrawalAmount: Number(data.minimum_withdrawal_amount ?? 200),
      activeWithdrawalStatus: data.active_withdrawal_status,
    };
  },

  async requestWithdrawal(amount: number): Promise<void> {
    const userId = await requireUserId();
    const { data, error } = await supabase.rpc('request_my_withdrawal', { p_amount: amount });
    if (error) throw new Error(error.message);
    if (data && data.status === 'error') {
      throw new Error(data.message || 'Unable to request withdrawal at this time.');
    }
  },

  async getWithdrawalRequests(): Promise<AstrologerWithdrawalRequest[]> {
    const userId = await requireUserId();
    const { data, error } = await supabase.rpc('get_my_withdrawal_requests');
    if (error) throw new Error(error.message);
    if (!data) return [];
    
    return data.map((row: any) => ({
      id: row.id,
      amount: Number(row.amount),
      currency: row.currency,
      status: row.status,
      requestedAt: row.requested_at,
      approvedAt: row.approved_at,
      processingAt: row.processing_at,
      paidAt: row.paid_at,
      rejectedAt: row.rejected_at,
      failedAt: row.failed_at,
      payoutReference: row.payout_reference,
      bankReference: row.bank_reference,
      rejectionReason: row.rejection_reason,
      failureReason: row.failure_reason,
      payoutBankName: row.payout_bank_name,
      payoutAccountLast4: row.payout_account_last4,
    }));
  },

  async getPaymentStatements(): Promise<AstrologerPaymentStatement[]> {
    const userId = await requireUserId();
    const { data, error } = await supabase.rpc('get_my_payment_statements');
    if (error) throw new Error(error.message);
    if (!data) return [];
    
    return data.map((row: any) => ({
      id: row.id,
      entryType: row.entry_type as AstrologerPaymentStatementType,
      title: row.title,
      description: row.description,
      grossAmount: Number(row.gross_amount),
      astrologerAmount: row.astrologer_amount !== null ? Number(row.astrologer_amount) : null,
      companyAmount: row.company_amount !== null ? Number(row.company_amount) : null,
      status: row.status,
      consultationId: row.consultation_id,
      customerDisplayName: row.customer_display_name,
      billedMinutes: row.billed_minutes !== null ? Number(row.billed_minutes) : null,
      ratePerMinute: row.rate_per_minute !== null ? Number(row.rate_per_minute) : null,
      occurredAt: row.occurred_at,
    }));
  },
};
