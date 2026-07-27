import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConsultsTab from '../components/ConsultsTab';
import { AstrologerDashboardSession } from '../types';

const NOW = new Date('2026-07-27T07:00:00Z').getTime();

function makeSession(
  overrides: Partial<AstrologerDashboardSession> & { id: string },
): AstrologerDashboardSession {
  return {
    id: overrides.id,
    status: 'ACTIVE',
    ratePerMinute: 15,
    requestedAt: new Date(NOW - 90000).toISOString(),
    billedMinutes: 0,
    totalCharged: 0,
    customerDisplayName: 'Test Customer',
    kundliProfileId: null,
    ...overrides,
  };
}

const noop = vi.fn().mockResolvedValue(undefined);

function defaultProps(overrides: Partial<React.ComponentProps<typeof ConsultsTab>> = {}) {
  return {
    sessions: [],
    isLoading: false,
    error: null,
    onOpenChat: noop,
    onRetry: noop,
    ...overrides,
  };
}

describe('ConsultsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Loading state
  it('1. renders loading state skeletons', () => {
    render(<ConsultsTab {...defaultProps({ isLoading: true })} />);
    const pulses = document.querySelectorAll('.animate-pulse');
    expect(pulses.length).toBeGreaterThan(0);
    expect(screen.queryByText('No active consultation')).not.toBeInTheDocument();
  });

  // 2. No active consultation
  it('2. renders empty active state when no active sessions exist', () => {
    render(<ConsultsTab {...defaultProps({ sessions: [] })} />);
    expect(screen.getByText('No active consultation')).toBeInTheDocument();
    expect(screen.getByText('No consultation history yet')).toBeInTheDocument();
  });

  // 3. Active consultation renders correctly
  it('3. renders active consultation with backend billed minutes', () => {
    const active = makeSession({
      id: 's-active',
      status: 'ACTIVE',
      billedMinutes: 42,
      startedAt: new Date(NOW - 600000).toISOString(), // 10 mins ago
    });
    render(<ConsultsTab {...defaultProps({ sessions: [active] })} />);
    
    expect(screen.getByText('Active Consultation')).toBeInTheDocument();
    expect(screen.getByText('Live Chat Consultation')).toBeInTheDocument();
    // Verify authoritative backend billed duration format (42 mins -> "42 min")
    expect(screen.getByText('42 min')).toBeInTheDocument();
    expect(screen.getByText('Test Customer')).toBeInTheDocument();
  });

  // 4. Low balance state
  it('4. displays low balance warning state', () => {
    const lowBalance = makeSession({ id: 's-low', status: 'LOW_BALANCE' });
    render(<ConsultsTab {...defaultProps({ sessions: [lowBalance] })} />);
    expect(screen.getByText('Customer balance is running low. The consultation may pause if they do not recharge.')).toBeInTheDocument();
  });

  // 5. Recharging state
  it('5. displays recharging informational state', () => {
    const recharging = makeSession({ id: 's-rech', status: 'RECHARGING' });
    render(<ConsultsTab {...defaultProps({ sessions: [recharging] })} />);
    expect(screen.getByText('Customer is recharging their wallet. You can continue once the recharge is completed.')).toBeInTheDocument();
  });

  // 6. Kundli indicator
  it('6. displays Kundli indicator on active and history if attached', () => {
    const active = makeSession({ id: 's-act', status: 'ACTIVE', kundliProfileId: 'k1' });
    const ended = makeSession({ id: 's-end', status: 'ENDED', kundliProfileId: 'k2' });
    render(<ConsultsTab {...defaultProps({ sessions: [active, ended] })} />);
    
    const kundliBadges = screen.getAllByText('Kundli');
    expect(kundliBadges).toHaveLength(2);
  });

  // 7. Recent ended consultation
  it('7. renders ended consultations in Completed section', () => {
    const ended = makeSession({
      id: 's-end',
      status: 'ENDED',
      totalCharged: 150,
      billedMinutes: 10,
    });
    render(<ConsultsTab {...defaultProps({ sessions: [ended] })} />);
    expect(screen.getByText('Completed Consultations')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('₹150.00')).toBeInTheDocument(); // formatMoney output
  });

  // 8. Separates unsuccessful history
  it('8. renders expired/rejected/cancelled in Unsuccessful section', () => {
    const expired = makeSession({ id: 's-exp', status: 'EXPIRED' });
    render(<ConsultsTab {...defaultProps({ sessions: [expired] })} />);
    expect(screen.getByText('Unsuccessful / Closed')).toBeInTheDocument();
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  // 9. Continue consultation navigation
  it('9. continue button calls onOpenChat with session', () => {
    const onOpenChat = vi.fn();
    const active = makeSession({ id: 's-act', status: 'ACTIVE' });
    render(<ConsultsTab {...defaultProps({ sessions: [active], onOpenChat })} />);
    
    const btn = screen.getByRole('button', { name: /continue consultation/i });
    fireEvent.click(btn);
    expect(onOpenChat).toHaveBeenCalledWith(active);
  });

  // 10. View Details history navigation
  it('10. view details button calls onOpenChat for history session', () => {
    const onOpenChat = vi.fn();
    const ended = makeSession({ id: 's-end', status: 'ENDED' });
    render(<ConsultsTab {...defaultProps({ sessions: [ended], onOpenChat })} />);
    
    const btn = screen.getByRole('button', { name: /view details/i });
    fireEvent.click(btn);
    expect(onOpenChat).toHaveBeenCalledWith(ended);
  });

  // 11. Error state with retry
  it('11. renders scoped error and handles retry', () => {
    const onRetry = vi.fn();
    render(<ConsultsTab {...defaultProps({ error: 'Network fail', onRetry })} />);
    expect(screen.getByText('Could not load consults')).toBeInTheDocument();
    expect(screen.getByText('Network fail')).toBeInTheDocument();
    
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  // 12. Realtime prop updates
  it('12. updates automatically when props change', () => {
    const { rerender } = render(<ConsultsTab {...defaultProps({ sessions: [] })} />);
    expect(screen.getByText('No active consultation')).toBeInTheDocument();

    const active = makeSession({ id: 'new-active', status: 'ACTIVE' });
    rerender(<ConsultsTab {...defaultProps({ sessions: [active] })} />);
    
    expect(screen.queryByText('No active consultation')).not.toBeInTheDocument();
    expect(screen.getByText('Active Consultation')).toBeInTheDocument();
  });
});
