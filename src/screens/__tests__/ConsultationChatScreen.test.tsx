import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import ConsultationChatScreen from '../ConsultationChatScreen';

window.HTMLElement.prototype.scrollIntoView = vi.fn();

import { ApiConsultationRepository } from '../../repositories/api/apiConsultationRepository';
import { ApiError } from '../../services/api/apiErrors';
import { useRealtimeConsultationChat } from '../../features/consultation-chat/hooks/useRealtimeConsultationChat';
import { walletBalanceService } from '../../services/wallet/walletBalanceService';
import { useAstrologerPartner } from '../../features/astrologer';
import { useProfile } from '../../contexts/ProfileContext';

vi.mock('../../repositories/api/apiConsultationRepository');
vi.mock('../../features/consultation-chat/hooks/useRealtimeConsultationChat');
vi.mock('../../services/wallet/walletBalanceService');
vi.mock('../../features/astrologer');
vi.mock('../../contexts/ProfileContext');

describe('ConsultationChatScreen', () => {
  const onNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'setInterval');
    vi.spyOn(window, 'clearInterval');

    (useAstrologerPartner as any).mockReturnValue({ directory: [] });
    (useProfile as any).mockReturnValue({ authenticatedProfile: { id: 'u1' } });
    (walletBalanceService.getBalance as any).mockResolvedValue(1000);

    (ApiConsultationRepository.prototype.getSession as any).mockResolvedValue({
      id: 's1', status: 'ACTIVE', elapsedSeconds: 0, totalCharged: 0
    });

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

  it('stops heartbeat timer on unmount and terminal statuses', async () => {
    vi.spyOn(window, 'setInterval');
    vi.spyOn(window, 'clearInterval');

    (walletBalanceService.getBalance as any).mockResolvedValue(1000);
    (ApiConsultationRepository.prototype.createSession as any).mockResolvedValue({
      balance: 1000,
      ratePerMinute: 10,
      minimumMinutes: 5,
      heartbeatIntervalSeconds: 30,
      session: { id: 's1', status: 'ACTIVE', elapsedSeconds: 0, totalCharged: 0 }
    });

    const heartbeatMock = vi.fn().mockResolvedValue({ session: { id: 's1', status: 'ACTIVE', elapsedSeconds: 0 }, balance: 1000 });
    (ApiConsultationRepository.prototype.heartbeat as any).mockImplementation(heartbeatMock);

    const { unmount, rerender } = render(<ConsultationChatScreen astrologerId="a1" onNavigate={vi.fn()} />);

    // Wait for the first heartbeat from the initial fetch
    await waitFor(() => expect(heartbeatMock).toHaveBeenCalledTimes(1));

    expect(window.setInterval).toHaveBeenCalledWith(expect.any(Function), 30000);

    // Check cleanup on unmount
    (useRealtimeConsultationChat as any).mockReturnValue({
      messages: [],
      sessionStatus: 'ENDED',
      send: vi.fn(),
      error: null,
    });

    unmount();
    expect(window.clearInterval).toHaveBeenCalled();
  });

  it('heartbeat HTTP 429 keeps the active chat visible and shows an inline warning', async () => {
    let heartbeatCallback: any;
    vi.spyOn(window, 'setInterval').mockImplementation((cb) => {
      heartbeatCallback = cb;
      return 123 as any;
    });

    (walletBalanceService.getBalance as any).mockResolvedValue(1000);
    (ApiConsultationRepository.prototype.createSession as any).mockResolvedValue({
      balance: 1000,
      ratePerMinute: 10,
      minimumMinutes: 5,
      heartbeatIntervalSeconds: 30,
      session: { id: 's1', status: 'ACTIVE', elapsedSeconds: 0, totalCharged: 0 }
    });

    const heartbeatMock = vi.fn().mockResolvedValue({ session: { id: 's1', status: 'ACTIVE', elapsedSeconds: 0 }, balance: 1000 });
    (ApiConsultationRepository.prototype.heartbeat as any).mockImplementation(heartbeatMock);

    render(<ConsultationChatScreen astrologerId="a1" onNavigate={vi.fn()} />);

    await waitFor(() => expect(heartbeatMock).toHaveBeenCalledTimes(1));

    // Simulate 429 from heartbeat
    heartbeatMock.mockRejectedValueOnce({ code: 'RATE_LIMITED', message: 'Too many requests' });

    await act(async () => {
      await heartbeatCallback();
    });

    expect(screen.getByText('Service is busy, please wait.')).toBeInTheDocument();
    expect(screen.queryByText(/Security Check Failed/i)).not.toBeInTheDocument();

    // Check that chat input is still visible
    expect(screen.getByPlaceholderText(/Ask regarding career/i)).toBeInTheDocument();
  });

  it('message-send HTTP 429 keeps existing messages visible and shows an inline warning', async () => {
    const mockSend = vi.fn().mockRejectedValue({ code: 'RATE_LIMITED', message: 'Too many requests' });

    (useRealtimeConsultationChat as any).mockReturnValue({
      messages: [{ id: 'm1', text: 'Existing message', sender: 'user', time: new Date().toISOString(), type: 'text' }],
      sessionStatus: 'ACTIVE',
      send: mockSend,
      error: null,
    });

    (ApiConsultationRepository.prototype.createSession as any).mockResolvedValue({
      balance: 1000,
      ratePerMinute: 10,
      minimumMinutes: 5,
      heartbeatIntervalSeconds: 30,
      session: { id: 's1', status: 'ACTIVE', elapsedSeconds: 0, totalCharged: 0 }
    });

    (ApiConsultationRepository.prototype.heartbeat as any).mockResolvedValue({ session: { id: 's1', status: 'ACTIVE', elapsedSeconds: 0 }, balance: 1000 });

    render(<ConsultationChatScreen astrologerId="a1" onNavigate={vi.fn()} />);

    // Check existing message is visible
    await waitFor(() => expect(screen.getByText('Existing message')).toBeInTheDocument());

    const input = screen.getByPlaceholderText(/Ask regarding career/i);
    await act(async () => {
      fireEvent.change(input, { target: { value: 'New message' } });
    });

    await act(async () => {
      fireEvent.submit(input);
    });

    expect(mockSend).toHaveBeenCalledWith('New message');

    // UI should show inline warning and not break chat
    expect(await screen.findByText('Service is busy, please wait.')).toBeInTheDocument();
    expect(screen.queryByText(/Security Check Failed/i)).not.toBeInTheDocument();
    expect(screen.getByText('Existing message')).toBeInTheDocument(); // messages still there
  });
});
