import { AstrologerConsultationStatus } from './types';

export const ASTROLOGER_DASHBOARD_SESSION_LIMIT = 100;

export const ACTIVE_ASTROLOGER_SESSION_STATUSES: readonly AstrologerConsultationStatus[] = [
  'ACTIVE',
  'LOW_BALANCE',
  'RECHARGING',
];
