import { AstrologerConsultationStatus } from './types';

export const ASTROLOGER_DASHBOARD_SESSION_LIMIT = 100;

/** Maximum number of terminal-negative sessions shown in the "Recently Missed" section */
export const RECENTLY_MISSED_DISPLAY_LIMIT = 5;

export const ACTIVE_ASTROLOGER_SESSION_STATUSES: readonly AstrologerConsultationStatus[] = [
  'ACTIVE',
  'LOW_BALANCE',
  'RECHARGING',
];

export const TERMINAL_NEGATIVE_STATUSES: readonly AstrologerConsultationStatus[] = [
  'EXPIRED',
  'REJECTED',
  'CANCELLED',
];
