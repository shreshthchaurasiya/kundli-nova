import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NovaKundliScreen from '../NovaKundliScreen';
import { useRepositories } from '../../repositories/repositoryProvider';
import { AstrologyApi } from '../../services/api/astrologyApi';

vi.mock('../../repositories/repositoryProvider', () => ({
  useRepositories: vi.fn(),
}));

vi.mock('../../services/api/astrologyApi', () => ({
  AstrologyApi: {
    getKundli: vi.fn(),
    getCompatibility: vi.fn()
  }
}));

const mockProfiles = [
  { id: 'profile1', name: 'Profile One', is_default: true, gender: 'MALE', dob: '1990-01-01', tob: '12:00:00' },
  { id: 'profile2', name: 'Profile Two', is_default: false, gender: 'FEMALE', dob: '1992-02-02', tob: '14:00:00' }
];

const mockCompatibilityResponse = {
  compatibility: {
    totalScore: 28.5,
    maximumScore: 36,
    compatibilityPercentage: 79,
    factors: [
      { code: 'VARNA', name: 'Varna', score: 1, maximumScore: 1, summary: 'Good', calculationStatus: 'calculated' },
      { code: 'VASHYA', name: 'Vashya', score: 2, maximumScore: 2, summary: 'Good', calculationStatus: 'calculated' },
      { code: 'TARA', name: 'Tara', score: 3, maximumScore: 3, summary: 'Good', calculationStatus: 'calculated' },
      { code: 'YONI', name: 'Yoni', score: 4, maximumScore: 4, summary: 'Good', calculationStatus: 'calculated' },
      { code: 'GRAHA_MAITRI', name: 'Graha Maitri', score: 5, maximumScore: 5, summary: 'Good', calculationStatus: 'calculated' },
      { code: 'GANA', name: 'Gana', score: 6, maximumScore: 6, summary: 'Good', calculationStatus: 'calculated' },
      { code: 'BHAKOOT', name: 'Bhakoot', score: 7, maximumScore: 7, summary: 'Good', calculationStatus: 'calculated' },
      { code: 'NADI', name: 'Nadi', score: 0.5, maximumScore: 8, summary: 'Low', calculationStatus: 'calculated' },
    ]
  },
  manglik: {
    profileAManglik: true,
    profileBManglik: false,
    profileACancellation: 'not_evaluated',
    profileBCancellation: 'fully_cancelled',
    compatibility: 'manglik_non_manglik'
  }
};

describe('Stage 5E: NovaKundliScreen Compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRepositories).mockReturnValue({
      kundliProfile: {
        getAllProfiles: vi.fn().mockResolvedValue(mockProfiles),
      }
    } as any);
    vi.mocked(AstrologyApi.getKundli).mockResolvedValue({
      input: { dateOfBirth: '1990-01-01', timeOfBirth: '12:00:00', latitude: 0, longitude: 0, timezone: 'Asia/Kolkata', name: 'Test', profileId: 'profile1' },
      planets: [],
      ascendant: { sign: 'Aries', degree: 0, isRetrograde: false }
    } as any);
  });

  it('renders Compatibility tab and handles lazy loading with second profile', async () => {
    render(<NovaKundliScreen onNavigate={vi.fn()} />);

    // Wait for basic render
    await waitFor(() => {
      expect(screen.getByText('Kundli Match')).toBeInTheDocument();
    });

    // Ensure API was NOT called for compatibility initially
    expect(AstrologyApi.getCompatibility).not.toHaveBeenCalled();

    // Click tab
    fireEvent.click(screen.getByText('Kundli Match'));

    // Should prompt to select a partner profile
    await waitFor(() => {
      expect(screen.getByText('Select Partner Profile')).toBeInTheDocument();
    });

    expect(AstrologyApi.getCompatibility).not.toHaveBeenCalled();

    // Select partner profile
    const select = screen.getByRole('combobox', { name: /partner profile/i }) || screen.getByDisplayValue('Select a profile...');
    fireEvent.change(select, { target: { value: 'profile2' } });

    vi.mocked(AstrologyApi.getCompatibility).mockResolvedValueOnce(mockCompatibilityResponse as any);

    // Now it should fetch
    await waitFor(() => {
      expect(AstrologyApi.getCompatibility).toHaveBeenCalledWith('profile1', 'profile2');
    });

    // Wait for render of score
    await waitFor(() => {
      expect(screen.getByText('28.5')).toBeInTheDocument();
      expect(screen.getByText('79% Compatibility')).toBeInTheDocument();
    });

    // Check that all 8 factors are rendered
    expect(screen.getByText('Varna')).toBeInTheDocument();
    expect(screen.getByText('Nadi')).toBeInTheDocument();
    
    // Check Manglik values
    expect(screen.getByText('Manglik Match')).toBeInTheDocument();
    expect(screen.getByText('Manglik status differs')).toBeInTheDocument(); // compatibility status
    expect(screen.getByText('Manglik')).toBeInTheDocument(); // Profile A
    expect(screen.getByText('Non-Manglik')).toBeInTheDocument(); // Profile B
    expect(screen.getByText('Fully Cancelled')).toBeInTheDocument(); // cancellation for B
    expect(screen.queryByText('Not evaluated')).not.toBeInTheDocument(); // should be hidden
  });
});
