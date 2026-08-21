import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import HoroscopeScreen from '../HoroscopeScreen';
import { AstrologyApi } from '../../services/api/astrologyApi';
import { useProfile } from '../../contexts/ProfileContext';
import { ApiError } from '../../services/api/apiErrors';

vi.mock('../../services/api/astrologyApi');
vi.mock('../../contexts/ProfileContext', () => ({
  useProfile: vi.fn(),
}));

const mockOnNavigate = vi.fn();

const sampleHoroscope = {
  schemaVersion: '1.0',
  provider: 'api-ninjas',
  providerVersion: 'v1',
  zodiacSign: 'taurus',
  period: 'today',
  date: '2026-07-21',
  overview: 'Test overview.',
  generatedAt: new Date().toISOString(),
};

describe('HoroscopeScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useProfile as Mock).mockReturnValue({ profile: null });
    (AstrologyApi.getDailyHoroscope as Mock).mockResolvedValue(sampleHoroscope);
  });

  it('renders default sign (Aries) when no DOB is available', async () => {
    render(<HoroscopeScreen onNavigate={mockOnNavigate} />);
    
    // Header should say Daily Horoscope
    expect(screen.getByText('Daily Horoscope')).toBeInTheDocument();
    
    // Should call API for aries
    await waitFor(() => {
      expect(AstrologyApi.getDailyHoroscope).toHaveBeenCalledWith('aries');
    });
  });

  it('derives Western Sun Sign from DOB', async () => {
    (useProfile as Mock).mockReturnValue({ profile: { dateOfBirth: '1990-05-15' } }); // Taurus
    
    render(<HoroscopeScreen onNavigate={mockOnNavigate} />);
    
    await waitFor(() => {
      expect(AstrologyApi.getDailyHoroscope).toHaveBeenCalledWith('taurus');
    });
  });

  it('switches sign when a different zodiac is selected', async () => {
    render(<HoroscopeScreen onNavigate={mockOnNavigate} />);
    
    await waitFor(() => {
      expect(AstrologyApi.getDailyHoroscope).toHaveBeenCalledWith('aries');
    });
    
    (AstrologyApi.getDailyHoroscope as Mock).mockClear();
    
    const geminiButton = screen.getByRole('tab', { name: /gemini/i });
    fireEvent.click(geminiButton);
    
    await waitFor(() => {
      expect(AstrologyApi.getDailyHoroscope).toHaveBeenCalledWith('gemini');
    });
  });

  it('disables Tomorrow and Month tabs and does not make API calls when clicked', async () => {
    render(<HoroscopeScreen onNavigate={mockOnNavigate} />);
    
    const tomorrowTab = screen.getByRole('button', { name: /Tomorrow/i });
    expect(tomorrowTab).toBeDisabled();
    
    fireEvent.click(tomorrowTab);
    
    // No new API calls
    await waitFor(() => {
      expect(AstrologyApi.getDailyHoroscope).toHaveBeenCalledTimes(1); // Only the initial load
    });
  });

  it('displays loading state, then success state', async () => {
    (AstrologyApi.getDailyHoroscope as Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(sampleHoroscope), 50))
    );
    
    render(<HoroscopeScreen onNavigate={mockOnNavigate} />);
    
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText("Today's Overview")).toBeInTheDocument();
      expect(screen.getByText('Test overview.')).toBeInTheDocument();
    });
  });

  it('displays stale fallback warning if isStaleFallback is true', async () => {
    (AstrologyApi.getDailyHoroscope as Mock).mockResolvedValue({
      ...sampleHoroscope,
      isStaleFallback: true
    });
    
    render(<HoroscopeScreen onNavigate={mockOnNavigate} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Showing today's last available horoscope/i)).toBeInTheDocument();
    });
  });

  it('displays generic error state on 503', async () => {
    (AstrologyApi.getDailyHoroscope as Mock).mockRejectedValue(new ApiError(503, 'Unavailable', 'PROVIDER_UNAVAILABLE'));
    
    render(<HoroscopeScreen onNavigate={mockOnNavigate} />);
    
    await waitFor(() => {
      expect(screen.getByText(/temporarily updating/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });
  });

  it('no unsupported cards (fake percentages, lucky numbers) are rendered', async () => {
    render(<HoroscopeScreen onNavigate={mockOnNavigate} />);
    
    await waitFor(() => {
      expect(screen.queryByText(/Lucky Number/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Love: [0-9]+%/i)).not.toBeInTheDocument();
    });
  });
});
