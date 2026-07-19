export type ConsultationState =
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

export interface ConsultationSession {
  id: string;
  astrologerId: string;
  userId: string;
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
}
