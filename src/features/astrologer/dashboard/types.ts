export type AstrologerAvailability = 'ONLINE' | 'BUSY' | 'OFFLINE';

export type AstrologerDashboardTab = 'home' | 'requests' | 'activity';

export type AstrologerConsultationStatus =
  | 'CHECKING_WALLET'
  | 'INSUFFICIENT_BALANCE'
  | 'PREPARING_KUNDLI'
  | 'WAITING_FOR_ASTROLOGER'
  | 'REJECTED'
  | 'EXPIRED'
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
  status: AstrologerConsultationStatus;
  ratePerMinute: number;
  requestedAt: string;
  startedAt?: string;
  endedAt?: string;
  billedMinutes: number;
  totalCharged: number;
}

export interface AstrologerDashboardSnapshot {
  profile: AstrologerWorkspaceProfile;
  sessions: AstrologerDashboardSession[];
}

export interface AstrologerDashboardSummary {
  waitingRequests: number;
  activeSessions: number;
  completedToday: number;
  grossValueToday: number;
}
