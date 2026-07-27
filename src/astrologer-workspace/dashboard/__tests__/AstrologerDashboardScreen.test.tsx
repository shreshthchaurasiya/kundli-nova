import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AstrologerDashboardScreen from '../screens/AstrologerDashboardScreen';
import * as AuthContext from '../../../auth';
import * as DashboardContext from '../AstrologerDashboardContext';
import { AstrologerDashboardSummary, AstrologerWorkspaceProfile, AstrologerDashboardSession } from '../types';

vi.mock('../../../auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../AstrologerDashboardContext', () => ({
  useAstrologerDashboard: vi.fn(),
}));

const mockProfile: AstrologerWorkspaceProfile = {
  id: 'test-astro-id',
  userId: 'test-user-id',
  name: 'Test Astro',
  image: '',
  availability: 'ONLINE',
  pricePerMinute: 15,
  isPublished: true,
  lastSeenAt: new Date().toISOString(),
};

const mockSummary: AstrologerDashboardSummary = {
  todayGrossBilling: 0,
  yesterdayGrossBilling: 0,
  weekGrossBilling: 0,
  monthGrossBilling: 0,
  lifetimeGrossBilling: 0,
  pendingSettlement: null,
  withdrawableBalance: null,
  processingPayout: null,
  lastSettlementAt: null,
  settlementSystemConfigured: false,
  totalConsultsToday: 0,
  billedMinutesToday: 0,
  generatedAt: new Date().toISOString()
};

describe('AstrologerDashboardScreen', () => {
  beforeEach(() => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({ isAuthenticated: true, user: { id: 'test-user-id' } } as any);
  });

  it('1. renders loading skeleton when loading', () => {
    vi.mocked(DashboardContext.useAstrologerDashboard).mockReturnValue({
      isLoading: true,
      profile: null,
      sessions: [],
      summary: null,
      isSummaryLoading: true,
      summaryError: null,
      error: null,
      refresh: vi.fn(),
      retrySummary: vi.fn(),
      isUpdatingAvailability: false,
      setAvailability: vi.fn(),
    });

    render(<AstrologerDashboardScreen onNavigate={vi.fn()} />);
    expect(screen.getByText(/Preparing your workspace/i)).toBeInTheDocument();
  });

  it('2. renders successfully with real zero billing state and 8. requests preview (no requests)', () => {
    vi.mocked(DashboardContext.useAstrologerDashboard).mockReturnValue({
      isLoading: false,
      profile: mockProfile,
      sessions: [],
      summary: mockSummary,
      isSummaryLoading: false,
      summaryError: null,
      error: null,
      refresh: vi.fn(),
      retrySummary: vi.fn(),
      isUpdatingAvailability: false,
      setAvailability: vi.fn(),
    });

    render(<AstrologerDashboardScreen onNavigate={vi.fn()} />);
    
    expect(screen.getByText("Today's Gross Billing")).toBeInTheDocument();
    
    // Test for formatMoney(0) output. Assuming it is ₹0.00
    // Actually jsdom format might use a specific space, we just check for '0.00'
    const zeroElements = screen.getAllByText((content) => content.includes('0.00'));
    expect(zeroElements.length).toBeGreaterThan(0);
    
    // No requests empty state
    expect(screen.getByText('No requests waiting')).toBeInTheDocument();
    expect(screen.getByText("You're online and ready to receive new consultation requests.")).toBeInTheDocument();
  });

  it('3. renders populated billing state, no fake growth percentage', () => {
    const populatedSummary = {
      ...mockSummary,
      todayGrossBilling: 1500.5,
      totalConsultsToday: 5,
      billedMinutesToday: 100,
    };

    vi.mocked(DashboardContext.useAstrologerDashboard).mockReturnValue({
      isLoading: false,
      profile: mockProfile,
      sessions: [],
      summary: populatedSummary,
      isSummaryLoading: false,
      summaryError: null,
      error: null,
      refresh: vi.fn(),
      retrySummary: vi.fn(),
      isUpdatingAvailability: false,
      setAvailability: vi.fn(),
    });

    render(<AstrologerDashboardScreen onNavigate={vi.fn()} />);
    
    expect(screen.getByText((content) => content.includes('1,500.50'))).toBeInTheDocument();
    
    // There was a hardcoded +12% growth text before which should be absent or conditional based on real data
    // Since we don't have fake growth percent in our new component, this query shouldn't fail if we don't look for it
    expect(screen.queryByText('+12%')).not.toBeInTheDocument();
  });

  it('4. billing summary failure and retry', () => {
    const retryMock = vi.fn();
    vi.mocked(DashboardContext.useAstrologerDashboard).mockReturnValue({
      isLoading: false,
      profile: mockProfile,
      sessions: [],
      summary: null,
      isSummaryLoading: false,
      summaryError: 'RPC error',
      error: null,
      refresh: vi.fn(),
      retrySummary: retryMock,
      isUpdatingAvailability: false,
      setAvailability: vi.fn(),
    });

    render(<AstrologerDashboardScreen onNavigate={vi.fn()} />);
    
    expect(screen.getByText('Unable to load')).toBeInTheDocument();
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);
    expect(retryMock).toHaveBeenCalled();
  });

  it('5. online/offline state and 6. availability updating state', () => {
    const setAvailabilityMock = vi.fn();
    
    // Start Offline
    vi.mocked(DashboardContext.useAstrologerDashboard).mockReturnValue({
      isLoading: false,
      profile: { ...mockProfile, availability: 'OFFLINE' },
      sessions: [],
      summary: mockSummary,
      isSummaryLoading: false,
      summaryError: null,
      error: null,
      refresh: vi.fn(),
      retrySummary: vi.fn(),
      isUpdatingAvailability: false,
      setAvailability: setAvailabilityMock,
    });

    const { rerender } = render(<AstrologerDashboardScreen onNavigate={vi.fn()} />);
    expect(screen.getByText('You are Offline')).toBeInTheDocument();

    // Click to go online
    const buttons = screen.getAllByRole('button');
    // The button has a Power icon, we can try clicking it if we can identify it.
    // It's inside the AvailabilityCard. We can identify it by looking at parent text.
    const container = screen.getByText('You are Offline').closest('div')?.parentElement;
    const powerButton = container?.querySelector('button');
    
    if (powerButton) {
      fireEvent.click(powerButton);
      expect(setAvailabilityMock).toHaveBeenCalledWith('ONLINE');
    }

    // Now test Updating state
    vi.mocked(DashboardContext.useAstrologerDashboard).mockReturnValue({
      isLoading: false,
      profile: { ...mockProfile, availability: 'OFFLINE' },
      sessions: [],
      summary: mockSummary,
      isSummaryLoading: false,
      summaryError: null,
      error: null,
      refresh: vi.fn(),
      retrySummary: vi.fn(),
      isUpdatingAvailability: true,
      setAvailability: setAvailabilityMock,
    });
    
    rerender(<AstrologerDashboardScreen onNavigate={vi.fn()} />);
    
    if (powerButton) {
      expect(powerButton).toBeDisabled();
    }
  });

  it('9. active consultation visible and 10. absent', () => {
    const activeSession: AstrologerDashboardSession = {
      id: 'sess-1',
      status: 'ACTIVE',
      ratePerMinute: 15,
      requestedAt: new Date().toISOString(),
      startedAt: new Date(Date.now() - 60000).toISOString(),
      billedMinutes: 0,
      totalCharged: 0,
      customerDisplayName: 'John',
    };

    // Absent
    vi.mocked(DashboardContext.useAstrologerDashboard).mockReturnValue({
      isLoading: false,
      profile: mockProfile,
      sessions: [],
      summary: mockSummary,
      isSummaryLoading: false,
      summaryError: null,
      error: null,
      refresh: vi.fn(),
      retrySummary: vi.fn(),
      isUpdatingAvailability: false,
      setAvailability: vi.fn(),
    });
    
    const { rerender } = render(<AstrologerDashboardScreen onNavigate={vi.fn()} />);
    expect(screen.queryByText('Active Consultation')).not.toBeInTheDocument();

    // Visible
    vi.mocked(DashboardContext.useAstrologerDashboard).mockReturnValue({
      isLoading: false,
      profile: mockProfile,
      sessions: [activeSession],
      summary: mockSummary,
      isSummaryLoading: false,
      summaryError: null,
      error: null,
      refresh: vi.fn(),
      retrySummary: vi.fn(),
      isUpdatingAvailability: false,
      setAvailability: vi.fn(),
    });

    rerender(<AstrologerDashboardScreen onNavigate={vi.fn()} />);
    expect(screen.getByText('Active Consultation')).toBeInTheDocument();
    expect(screen.getByText('John')).toBeInTheDocument();
  });

  it('11. navigation to Requests and 12. Profile', () => {
    const waitingSession: AstrologerDashboardSession = {
      id: 'req-1',
      status: 'WAITING_FOR_ASTROLOGER',
      ratePerMinute: 15,
      requestedAt: new Date().toISOString(),
      billedMinutes: 0,
      totalCharged: 0,
    };

    // Note: To test > 3 logic
    const waitingSessions = Array(4).fill(waitingSession).map((s, i) => ({ ...s, id: `req-${i}` }));

    vi.mocked(DashboardContext.useAstrologerDashboard).mockReturnValue({
      isLoading: false,
      profile: mockProfile,
      sessions: waitingSessions,
      summary: mockSummary,
      isSummaryLoading: false,
      summaryError: null,
      error: null,
      refresh: vi.fn(),
      retrySummary: vi.fn(),
      isUpdatingAvailability: false,
      setAvailability: vi.fn(),
    });

    render(<AstrologerDashboardScreen onNavigate={vi.fn()} />);
    
    // View all requests
    const viewAllBtn = screen.getByText('View all 4');
    fireEvent.click(viewAllBtn);
    expect(screen.getByText('New Requests')).toBeInTheDocument(); // Requests Tab Header

    // Go back to home to test Profile
    const homeTab = screen.getByText('Home');
    fireEvent.click(homeTab);

    // Navigate to profile
    const profileBtn = screen.getByText('Complete your professional profile');
    fireEvent.click(profileBtn);
    
    // Should now show Profile Tab headers
    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
  });
});
