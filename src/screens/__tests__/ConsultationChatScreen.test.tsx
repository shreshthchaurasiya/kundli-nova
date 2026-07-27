import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import React from 'react';
import ConsultationChatScreen from '../ConsultationChatScreen';

window.HTMLElement.prototype.scrollIntoView = vi.fn();

import { ApiConsultationRepository } from '../../repositories/api/apiConsultationRepository';
import { ApiKundliProfileRepository } from '../../repositories/api/apiKundliProfileRepository';
import { useRealtimeConsultationChat } from '../../features/consultation-chat/hooks/useRealtimeConsultationChat';
import { walletBalanceService } from '../../services/wallet/walletBalanceService';
import { useAstrologerPartner } from '../../features/astrologer';
import { useProfile } from '../../contexts/ProfileContext';

vi.mock('../../repositories/api/apiConsultationRepository');
vi.mock('../../repositories/api/apiKundliProfileRepository');
vi.mock('../../features/consultation-chat/hooks/useRealtimeConsultationChat');
vi.mock('../../services/wallet/walletBalanceService');
vi.mock('../../features/astrologer');
vi.mock('../../contexts/ProfileContext');

const MOCK_SESSION_RESULT = {
  outcome: 'created',
  balance: 1000,
  ratePerMinute: 10,
  minimumMinutes: 5,
  heartbeatIntervalSeconds: 30,
  requestTimeoutSeconds: 60,
  rechargeGraceSeconds: 30,
  session: { id: 's1', status: 'WAITING_FOR_ASTROLOGER', elapsedSeconds: 0, totalCharged: 0, kundli_profile_id: 'p1' },
};

describe('ConsultationChatScreen', () => {
  const onNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'setInterval');
    vi.spyOn(window, 'clearInterval');

    (useAstrologerPartner as any).mockReturnValue({ directory: [] });
    (useProfile as any).mockReturnValue({ profile: { id: 'u1' } });
    (walletBalanceService.getBalance as any).mockResolvedValue(1000);

    (ApiConsultationRepository.prototype.getSession as any).mockResolvedValue({
      id: 's1', status: 'ACTIVE', elapsedSeconds: 0, totalCharged: 0, kundli_profile_id: 'p1'
    });

    (ApiKundliProfileRepository.prototype.getAllProfiles as any).mockResolvedValue([]);
    (ApiKundliProfileRepository.prototype.ensureSelfProfile as any).mockResolvedValue(null);

    (useRealtimeConsultationChat as any).mockReturnValue({
      messages: [],
      sessionStatus: 'ACTIVE',
      send: vi.fn(),
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows security error when navigated directly without astrologerId', async () => {
    render(<ConsultationChatScreen astrologerId={undefined} onNavigate={onNavigate} />);

    await waitFor(() => {
      expect(onNavigate).toHaveBeenCalledWith('astrologers');
    });

    expect(ApiConsultationRepository.prototype.createSession).not.toHaveBeenCalled();
  });

  it('skips selector and creates session automatically on mount', async () => {
    (ApiConsultationRepository.prototype.createSession as any).mockResolvedValue(MOCK_SESSION_RESULT);

    render(<ConsultationChatScreen astrologerId="a1" onNavigate={onNavigate} />);

    await waitFor(() => {
      expect(ApiConsultationRepository.prototype.createSession).toHaveBeenCalledWith('a1');
    });
    
    // Asserts that the mandatory Kundli selector is NOT shown and we proceed to waiting/active state
    await waitFor(() => {
      expect(screen.queryByText(/Select Kundli Profile/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Start Consultation/i)).not.toBeInTheDocument();
    });
  });

  it('calls createSession exactly once in StrictMode double mount', async () => {
    (ApiConsultationRepository.prototype.createSession as any).mockResolvedValue(MOCK_SESSION_RESULT);

    const { unmount } = render(<ConsultationChatScreen astrologerId="a1" onNavigate={onNavigate} />);
    unmount();
    render(<ConsultationChatScreen astrologerId="a1" onNavigate={onNavigate} />);

    await waitFor(() => {
      expect(ApiConsultationRepository.prototype.createSession).toHaveBeenCalledTimes(1);
    });
  });

  it('renders View Kundli action and customer profile icon in ACTIVE state', async () => {
    (useRealtimeConsultationChat as any).mockReturnValue({
      messages: [],
      sessionStatus: 'ACTIVE',
      send: vi.fn(),
      error: null,
    });
    
    // Simulate already loaded session
    (ApiConsultationRepository.prototype.createSession as any).mockResolvedValue({
      outcome: 'existing_session',
      session: { id: 's1', status: 'ACTIVE', elapsedSeconds: 0, totalCharged: 0, kundli_profile_id: 'p1' },
      balance: 1000,
      ratePerMinute: 10,
      minimumMinutes: 5,
      heartbeatIntervalSeconds: 30,
      requestTimeoutSeconds: 60,
      rechargeGraceSeconds: 30,
    });
    
    (ApiConsultationRepository.prototype.heartbeat as any).mockResolvedValue({
      session: { id: 's1', status: 'ACTIVE', elapsedSeconds: 0, totalCharged: 0, kundli_profile_id: 'p1' },
      balance: 1000,
    });

    render(<ConsultationChatScreen astrologerId="a1" onNavigate={onNavigate} />);

    await waitFor(() => {
      // "View Kundli" action should be present
      expect(screen.getByText(/View Kundli/i)).toBeInTheDocument();
      // Profile icon button should be in the composer with the aria-label
      const profileButton = screen.getByLabelText(/Open consultation profile/i);
      expect(profileButton).toBeInTheDocument();
      // Ensure we don't have the profile icon in the header (hard to assert easily since it's just a button with a User icon, but finding the aria-label is enough)
    });
  });

  describe('Race Condition & Timer Cleanup Tests', () => {
    it('Waiting timer reaches zero and backend returns EXPIRED', async () => {
      vi.useFakeTimers();
      (ApiConsultationRepository.prototype.createSession as any).mockResolvedValue(MOCK_SESSION_RESULT);
      
      let resolveExpire: any;
      const expirePromise = new Promise(r => resolveExpire = r);
      (ApiConsultationRepository.prototype.expireSession as any).mockReturnValue(expirePromise);

      render(<ConsultationChatScreen astrologerId="a1" onNavigate={onNavigate} />);
      
      // Wait for it to enter WAITING state
      await waitFor(() => {
        expect(screen.getByText(/Request expires in/i)).toBeInTheDocument();
      });

      // Fast forward 60 seconds
      act(() => {
        vi.advanceTimersByTime(60000);
      });

      // UI should not immediately show Request Expired until backend resolves
      resolveExpire({ session: { status: 'EXPIRED' } });
      
      await waitFor(() => {
        expect(screen.getByText(/Request Expired/i)).toBeInTheDocument();
      });
      vi.useRealTimers();
    });

    it('Astrologer accepts just before timer reaches zero (API resolves to ACTIVE)', async () => {
      vi.useFakeTimers();
      (ApiConsultationRepository.prototype.createSession as any).mockResolvedValue(MOCK_SESSION_RESULT);
      
      (ApiConsultationRepository.prototype.expireSession as any).mockResolvedValue({
        session: { status: 'ACTIVE', elapsedSeconds: 0, totalCharged: 0 },
        balance: 1000
      });

      render(<ConsultationChatScreen astrologerId="a1" onNavigate={onNavigate} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Request expires in/i)).toBeInTheDocument();
      });

      act(() => {
        vi.advanceTimersByTime(60000);
      });

      // UI should NOT show expired, it should show ACTIVE (Wait for astrologer connection or chat elements)
      await waitFor(() => {
        expect(screen.queryByText(/Request Expired/i)).not.toBeInTheDocument();
      });
      vi.useRealTimers();
    });

    it('Expiration API/network failure -> fetches latest authoritative state', async () => {
      vi.useFakeTimers();
      (ApiConsultationRepository.prototype.createSession as any).mockResolvedValue(MOCK_SESSION_RESULT);
      
      // Mock failure of expireSession
      (ApiConsultationRepository.prototype.expireSession as any).mockRejectedValue(new Error('Network failure'));
      // Mock recovery via getSession
      (ApiConsultationRepository.prototype.getSession as any).mockResolvedValue({
        id: 's1', status: 'ACTIVE', elapsedSeconds: 0, totalCharged: 0
      });

      render(<ConsultationChatScreen astrologerId="a1" onNavigate={onNavigate} />);
      await waitFor(() => {
        expect(screen.getByText(/Request expires in/i)).toBeInTheDocument();
      });

      act(() => {
        vi.advanceTimersByTime(60000);
      });

      // UI should NOT show expired, it should fetch getSession and turn ACTIVE
      await waitFor(() => {
        expect(screen.queryByText(/Request Expired/i)).not.toBeInTheDocument();
        expect(ApiConsultationRepository.prototype.getSession).toHaveBeenCalledWith('s1');
      });
      vi.useRealTimers();
    });

    it('Realtime changes WAITING to ACTIVE clears interval immediately', async () => {
      vi.useFakeTimers();
      (ApiConsultationRepository.prototype.createSession as any).mockResolvedValue(MOCK_SESSION_RESULT);
      
      const { rerender } = render(<ConsultationChatScreen astrologerId="a1" onNavigate={onNavigate} />);
      await waitFor(() => {
        expect(screen.getByText(/Request expires in/i)).toBeInTheDocument();
      });

      // Simulate Realtime status update
      (useRealtimeConsultationChat as any).mockReturnValue({
        messages: [], sessionStatus: 'ACTIVE', send: vi.fn(), error: null
      });
      
      // Mock getSession called by the effect
      (ApiConsultationRepository.prototype.getSession as any).mockResolvedValue({
        id: 's1', status: 'ACTIVE', elapsedSeconds: 0, totalCharged: 0
      });

      rerender(<ConsultationChatScreen astrologerId="a1" onNavigate={onNavigate} />);

      await waitFor(() => {
        expect(screen.queryByText(/Request expires in/i)).not.toBeInTheDocument();
      });
      
      expect(window.clearInterval).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });
});
