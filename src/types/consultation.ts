export type ConsultationState =
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

export interface ConsultationSession {
  id: string;
  astrologerId: string;
  userId: string;
  customerDisplayName?: string;
  status: ConsultationState;
  ratePerMinute: number;
  ratePerMin?: number; // legacy compatibility
  requestedAt: string; // ISO string
  createdAt: string;   // ISO string
  startedAt?: string;  // ISO string
  endedAt?: string;    // ISO string
  lastBilledAt?: string; // ISO string
  billedMinutes: number;
  totalCharged: number;
  elapsedSeconds: number; // timer compatibility
  billingMode?: 'wallet' | 'subscription'; // legacy compatibility
  acceptedAt?: string; // legacy compatibility
  rechargeDeadlineAt?: string;
}

export interface ConsultationRequestResult {
  outcome: 'created' | 'existing_session' | 'insufficient_balance';
  session: ConsultationSession | null;
  balance: number;
  ratePerMinute: number;
  minimumMinutes: number;
  minimumRequired: number;
  heartbeatIntervalSeconds: number;
  requestTimeoutSeconds: number;
  rechargeGraceSeconds: number;
}

export interface ConsultationHeartbeatResult {
  status: string;
  session: ConsultationSession;
  balance?: number;
}
