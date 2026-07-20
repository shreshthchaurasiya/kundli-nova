import { AstrologerDashboardSession, AstrologerDashboardSummary } from './types';
import { ACTIVE_ASTROLOGER_SESSION_STATUSES } from './dashboardConfig';

export function isSameLocalDay(value: string | undefined, comparison: Date): boolean {
  if (!value) return false;
  const date = new Date(value);
  return date.getFullYear() === comparison.getFullYear()
    && date.getMonth() === comparison.getMonth()
    && date.getDate() === comparison.getDate();
}

export function createAstrologerDashboardSummary(
  sessions: AstrologerDashboardSession[],
  now = new Date(),
): AstrologerDashboardSummary {
  const completedToday = sessions.filter(
    session => session.status === 'ENDED' && isSameLocalDay(session.endedAt, now),
  );

  return {
    waitingRequests: sessions.filter(session => session.status === 'WAITING_FOR_ASTROLOGER').length,
    activeSessions: sessions.filter(session => ACTIVE_ASTROLOGER_SESSION_STATUSES.includes(session.status)).length,
    completedToday: completedToday.length,
    grossValueToday: completedToday.reduce((total, session) => total + session.totalCharged, 0),
  };
}
