export type AstrologerAvailability = 'ONLINE' | 'BUSY' | 'OFFLINE';

export type AstrologerDashboardTab = 'home' | 'requests' | 'consults' | 'earnings' | 'profile';

export type AstrologerConsultationStatus =
  | 'CHECKING_WALLET'
  | 'INSUFFICIENT_BALANCE'
  | 'PREPARING_KUNDLI'
  | 'WAITING_FOR_ASTROLOGER'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'ACTIVE'
  | 'LOW_BALANCE'
  | 'RECHARGING'
  | 'ENDED';

export interface AstrologerWorkspaceProfile {
  id: string;
  userId: string;
  name: string;
  image: string;
  availability: AstrologerAvailability;
  pricePerMinute: number;
  isPublished: boolean;
  lastSeenAt: string;
}

export interface AstrologerDashboardSession {
  id: string;
  customerDisplayName?: string;
  status: AstrologerConsultationStatus;
  ratePerMinute: number;
  requestedAt: string;
  startedAt?: string;
  endedAt?: string;
  billedMinutes: number;
  totalCharged: number;
  kundliProfileId?: string | null;
}

export interface AstrologerDashboardSnapshot {
  profile: AstrologerWorkspaceProfile;
  sessions: AstrologerDashboardSession[];
}

export interface AstrologerDashboardSummary {
  todayGrossBilling: number;
  yesterdayGrossBilling: number;
  weekGrossBilling: number;
  monthGrossBilling: number;
  lifetimeGrossBilling: number;

  pendingSettlement: number | null;
  withdrawableBalance: number | null;
  processingPayout: number | null;
  lastSettlementAt: string | null;

  settlementSystemConfigured: boolean;

  totalConsultsToday: number;
  billedMinutesToday: number;
  generatedAt: string;
}

export type AstrologerPayoutAccountStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface AstrologerPayoutAccount {
  id: string;
  accountHolderName: string;
  bankName: string;
  accountNumberLast4: string;
  ifscCode: string;
  status: AstrologerPayoutAccountStatus;
  rejectionReason?: string | null;
  submittedAt: string;
  verifiedAt?: string | null;
}

export type AstrologerWithdrawalStatus = 
  | 'REQUESTED' 
  | 'APPROVED' 
  | 'PROCESSING' 
  | 'PAID' 
  | 'REJECTED' 
  | 'FAILED' 
  | 'CANCELLED';

export type WithdrawalDisabledReason = 
  | 'PAYOUT_ACCOUNT_MISSING'
  | 'PAYOUT_ACCOUNT_PENDING'
  | 'PAYOUT_ACCOUNT_REJECTED'
  | 'PAYOUT_ACCOUNT_NOT_VERIFIED'
  | 'SETTLEMENT_NOT_CONFIGURED'
  | 'INSUFFICIENT_BALANCE'
  | 'MINIMUM_WITHDRAWAL_NOT_MET'
  | 'ACTIVE_WITHDRAWAL_EXISTS';

export interface AstrologerEarningsPayoutSummary {
  grossBillingToday: number;
  grossBillingYesterday: number;
  grossBillingWeek: number;
  grossBillingMonth: number;
  grossBillingLifetime: number;

  calculatedEarningsToday: number;
  calculatedEarningsYesterday: number;
  calculatedEarningsWeek: number;
  calculatedEarningsMonth: number;
  calculatedEarningsLifetime: number;

  awaitingCommission: number;

  withdrawableBalance: number | null;
  pendingSettlement: number | null;
  processingPayout: number | null;
  lastSettlementAmount: number | null;
  lastSettlementAt: string | null;

  canRequestWithdrawal: boolean;
  withdrawalDisabledReason: WithdrawalDisabledReason | null;
  minimumWithdrawalAmount: number;
  activeWithdrawalStatus: AstrologerWithdrawalStatus | null;
}

export interface AstrologerWithdrawalRequest {
  id: string;
  amount: number;
  currency: string;
  status: AstrologerWithdrawalStatus;
  requestedAt: string;
  approvedAt?: string | null;
  processingAt?: string | null;
  paidAt?: string | null;
  rejectedAt?: string | null;
  failedAt?: string | null;
  payoutReference?: string | null;
  bankReference?: string | null;
  rejectionReason?: string | null;
  failureReason?: string | null;
  payoutBankName: string;
  payoutAccountLast4: string;
}

export type AstrologerPaymentStatementType = 'CONSULTATION_BILLING' | 'WITHDRAWAL_REQUEST' | 'WITHDRAWAL_PAID' | 'WITHDRAWAL_REJECTED' | 'SETTLEMENT_CREDIT' | 'ADJUSTMENT';

export interface AstrologerPaymentStatement {
  id: string;
  entryType: AstrologerPaymentStatementType;
  title: string;
  description: string;
  grossAmount: number;
  astrologerAmount?: number | null;
  companyAmount?: number | null;
  status: string;
  consultationId?: string | null;
  customerDisplayName?: string | null;
  billedMinutes?: number | null;
  ratePerMinute?: number | null;
  occurredAt: string;
}
