import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RequestsTab, { RequestsTabProps } from '../components/RequestsTab';
import { AstrologerDashboardSession } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const NOW = new Date('2026-07-27T07:00:00Z').getTime();

function makeSession(
  overrides: Partial<AstrologerDashboardSession> & { id: string },
): AstrologerDashboardSession {
  return {
    id: overrides.id,
    status: 'WAITING_FOR_ASTROLOGER',
    ratePerMinute: 15,
    requestedAt: new Date(NOW - 90000).toISOString(), // 90s ago
    billedMinutes: 0,
    totalCharged: 0,
    customerDisplayName: undefined,
    kundliProfileId: null,
    ...overrides,
  };
}

const noop = vi.fn().mockResolvedValue(undefined);

function defaultProps(overrides: Partial<RequestsTabProps> = {}): RequestsTabProps {
  return {
    sessions: [],
    isOnline: true,
    isLoading: false,
    error: null,
    processingSessionId: null,
    onDecision: noop,
    onOpenChat: noop,
    onRetry: noop,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('RequestsTab', () => {
  beforeEach(() => vi.clearAllMocks());

  // 1. Loading skeleton
  it('1. renders loading skeleton when isLoading=true', () => {
    render(<RequestsTab {...defaultProps({ isLoading: true })} />);
    // Three skeleton articles exist as animate-pulse divs
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText('No consultation requests')).not.toBeInTheDocument();
  });

  // 2. Online empty state
  it('2. renders online empty state when online with no sessions', () => {
    render(<RequestsTab {...defaultProps({ sessions: [], isOnline: true })} />);
    expect(screen.getByText('No consultation requests')).toBeInTheDocument();
    expect(screen.getByText('New requests will appear here automatically.')).toBeInTheDocument();
  });

  // 3. Offline empty state
  it('3. renders offline empty state when offline with no sessions', () => {
    render(<RequestsTab {...defaultProps({ sessions: [], isOnline: false })} />);
    expect(screen.getByText("You're currently offline")).toBeInTheDocument();
    expect(screen.getByText('Go online from Home to receive consultation requests.')).toBeInTheDocument();
  });

  // 4. Request list renders
  it('4. renders waiting request cards', () => {
    const sessions = [
      makeSession({ id: 's1', customerDisplayName: 'Priya Sharma' }),
      makeSession({ id: 's2', customerDisplayName: 'Rahul Kumar' }),
    ];
    render(<RequestsTab {...defaultProps({ sessions })} />);
    expect(screen.getByText('New Requests')).toBeInTheDocument();
    expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
    expect(screen.getByText('Rahul Kumar')).toBeInTheDocument();
  });

  // 4b. Kundli indicator
  it('4b. shows Kundli indicator when kundliProfileId is set', () => {
    const sessions = [
      makeSession({ id: 's1', customerDisplayName: 'Test', kundliProfileId: 'kp-abc' }),
    ];
    render(<RequestsTab {...defaultProps({ sessions })} />);
    expect(screen.getByText('Kundli')).toBeInTheDocument();
  });

  // 5. Accept loading state — double-tap prevention
  it('5. disables both buttons while processingSessionId matches', () => {
    const session = makeSession({ id: 's1', customerDisplayName: 'Alice' });
    render(<RequestsTab {...defaultProps({ sessions: [session], processingSessionId: 's1' })} />);

    const acceptBtn = screen.getByRole('button', { name: /accept request/i });
    const declineBtn = screen.getByRole('button', { name: /decline/i });
    expect(acceptBtn).toBeDisabled();
    expect(declineBtn).toBeDisabled();
  });

  // 5b. Different session is not disabled
  it('5b. other session buttons remain enabled while different session is processing', () => {
    const sessions = [
      makeSession({ id: 's1', customerDisplayName: 'Alice' }),
      makeSession({ id: 's2', customerDisplayName: 'Bob' }),
    ];
    render(<RequestsTab {...defaultProps({ sessions, processingSessionId: 's1' })} />);

    const allAcceptBtns = screen.getAllByRole('button', { name: /accept request/i });
    // s1 is processing → first card disabled; s2 → second card enabled
    expect(allAcceptBtns[0]).toBeDisabled();
    expect(allAcceptBtns[1]).not.toBeDisabled();
  });

  // 6. Accept success — onDecision called with 'accept'
  it('6. accept success — calls onDecision with accept', async () => {
    const onDecision = vi.fn().mockResolvedValue(undefined);
    const session = makeSession({ id: 's1', customerDisplayName: 'Alice' });
    render(<RequestsTab {...defaultProps({ sessions: [session], onDecision })} />);

    const acceptBtn = screen.getByRole('button', { name: /accept request/i });
    fireEvent.click(acceptBtn);
    await waitFor(() => expect(onDecision).toHaveBeenCalledWith(session, 'accept'));
  });

  // 7. Accept failure — shows inline card error
  it('7. accept failure — shows error on the card without crashing', async () => {
    const onDecision = vi.fn().mockRejectedValue(new Error('Consultation already accepted'));
    const session = makeSession({ id: 's1', customerDisplayName: 'Alice' });
    render(<RequestsTab {...defaultProps({ sessions: [session], onDecision })} />);

    const acceptBtn = screen.getByRole('button', { name: /accept request/i });
    fireEvent.click(acceptBtn);
    await waitFor(() =>
      expect(screen.getByText('Consultation already accepted')).toBeInTheDocument(),
    );
    // No navigation — component did not crash
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  // 8. Reject success — calls onDecision with reject
  it('8. reject success — calls onDecision with reject', async () => {
    const onDecision = vi.fn().mockResolvedValue(undefined);
    const session = makeSession({ id: 's1', customerDisplayName: 'Bob' });
    render(<RequestsTab {...defaultProps({ sessions: [session], onDecision })} />);

    const declineBtn = screen.getByRole('button', { name: /decline/i });
    fireEvent.click(declineBtn);
    await waitFor(() => expect(onDecision).toHaveBeenCalledWith(session, 'reject'));
  });

  // 9. Expired request shown in Recently Missed
  it('9. shows expired session in recently missed section', () => {
    const expired = makeSession({
      id: 's-exp',
      status: 'EXPIRED',
      customerDisplayName: 'Ghost User',
    });
    render(<RequestsTab {...defaultProps({ sessions: [expired] })} />);
    expect(screen.getByText('Recently Missed')).toBeInTheDocument();
    expect(screen.getByText('Ghost User')).toBeInTheDocument();
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  // 9b. Rejected shown as Declined
  it('9b. shows rejected session as Declined', () => {
    const rejected = makeSession({ id: 's-rej', status: 'REJECTED', customerDisplayName: 'Skip Me' });
    render(<RequestsTab {...defaultProps({ sessions: [rejected] })} />);
    expect(screen.getByText('Declined')).toBeInTheDocument();
  });

  // 9c. Only RECENTLY_MISSED_DISPLAY_LIMIT (5) shown
  it('9c. shows at most 5 recently missed sessions', () => {
    const missedSessions = Array.from({ length: 8 }, (_, i) =>
      makeSession({ id: `m${i}`, status: 'EXPIRED', customerDisplayName: `User ${i}` }),
    );
    render(<RequestsTab {...defaultProps({ sessions: missedSessions })} />);
    // Should show only 5 missed cards (not 8)
    const articles = document.querySelectorAll('article');
    expect(articles.length).toBe(5);
  });

  // 10. Active sessions shown in Active Consultations section
  it('10. renders active session in active consultations section', () => {
    const active = makeSession({
      id: 's-active',
      status: 'ACTIVE',
      customerDisplayName: 'Active User',
      startedAt: new Date(NOW - 300000).toISOString(),
    });
    render(<RequestsTab {...defaultProps({ sessions: [active] })} />);
    expect(screen.getByText('Active Consultations')).toBeInTheDocument();
    expect(screen.getByText('Active User')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open consultation/i })).toBeInTheDocument();
  });

  // 11. Open chat from active card
  it('11. clicking open on active card calls onOpenChat', () => {
    const onOpenChat = vi.fn();
    const active = makeSession({ id: 's-active', status: 'ACTIVE', customerDisplayName: 'Live' });
    render(<RequestsTab {...defaultProps({ sessions: [active], onOpenChat })} />);

    const openBtn = screen.getByRole('button', { name: /open consultation/i });
    fireEvent.click(openBtn);
    expect(onOpenChat).toHaveBeenCalledWith(active);
  });

  // 12. Fetch error state with retry
  it('12. renders fetch error and calls onRetry on button click', () => {
    const onRetry = vi.fn().mockResolvedValue(undefined);
    render(<RequestsTab {...defaultProps({ error: 'Network timeout', onRetry })} />);

    expect(screen.getByText('Could not load requests')).toBeInTheDocument();
    expect(screen.getByText('Network timeout')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalled();
  });

  // 13. Props update — new session renders after rerender (realtime context integration)
  it('13. re-render with new sessions reflects updated list', () => {
    const { rerender } = render(<RequestsTab {...defaultProps({ sessions: [] })} />);
    expect(screen.getByText('No consultation requests')).toBeInTheDocument();

    const newSession = makeSession({ id: 's-new', customerDisplayName: 'New Customer' });
    rerender(<RequestsTab {...defaultProps({ sessions: [newSession] })} />);

    expect(screen.queryByText('No consultation requests')).not.toBeInTheDocument();
    expect(screen.getByText('New Customer')).toBeInTheDocument();
  });

  // 14. Mixed sections — all three sections visible at once
  it('14. renders all three sections when sessions have mixed statuses', () => {
    const sessions = [
      makeSession({ id: 'w1', status: 'WAITING_FOR_ASTROLOGER', customerDisplayName: 'Waiting' }),
      makeSession({ id: 'a1', status: 'ACTIVE', customerDisplayName: 'Active' }),
      makeSession({ id: 'e1', status: 'EXPIRED', customerDisplayName: 'Expired' }),
    ];
    render(<RequestsTab {...defaultProps({ sessions })} />);

    expect(screen.getByText('New Requests')).toBeInTheDocument();
    expect(screen.getByText('Active Consultations')).toBeInTheDocument();
    expect(screen.getByText('Recently Missed')).toBeInTheDocument();
  });
});
