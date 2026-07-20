import { describe, expect, it } from 'vitest';
import { createAstrologerDashboardSummary } from '../dashboardSelectors';
import { AstrologerDashboardSession } from '../types';

const baseSession: AstrologerDashboardSession = {
  id: 'session-id',
  status: 'ENDED',
  ratePerMinute: 15,
  requestedAt: '2026-07-20T08:00:00.000Z',
  endedAt: '2026-07-20T09:00:00.000Z',
  billedMinutes: 4,
  totalCharged: 60,
};

describe('createAstrologerDashboardSummary', () => {
  it('counts waiting and active consultations from server statuses', () => {
    const sessions: AstrologerDashboardSession[] = [
      { ...baseSession, id: 'waiting', status: 'WAITING_FOR_ASTROLOGER' },
      { ...baseSession, id: 'active', status: 'ACTIVE' },
      { ...baseSession, id: 'recharging', status: 'RECHARGING' },
    ];

    const summary = createAstrologerDashboardSummary(sessions, new Date('2026-07-20T12:00:00.000Z'));
    expect(summary.waitingRequests).toBe(1);
    expect(summary.activeSessions).toBe(2);
  });

  it('includes only consultations completed on the current local day', () => {
    const sessions: AstrologerDashboardSession[] = [
      baseSession,
      { ...baseSession, id: 'older', endedAt: '2026-07-19T09:00:00.000Z', totalCharged: 200 },
      { ...baseSession, id: 'expired', status: 'EXPIRED', totalCharged: 500 },
    ];

    const summary = createAstrologerDashboardSummary(sessions, new Date('2026-07-20T12:00:00.000Z'));
    expect(summary.completedToday).toBe(1);
    expect(summary.grossValueToday).toBe(60);
  });
});
