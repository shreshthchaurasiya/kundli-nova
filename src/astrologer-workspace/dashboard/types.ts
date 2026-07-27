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
