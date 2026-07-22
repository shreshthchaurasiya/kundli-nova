import React from 'react';
import { render, waitFor, screen, fireEvent, act } from '@testing-library/react';
import { expect, describe, it, vi, beforeEach } from 'vitest';
import NovaKundliScreen from '../NovaKundliScreen';
import { RepositoryProvider } from '../../repositories/repositoryProvider';
import { AstrologyApi } from '../../services/api/astrologyApi';

vi.mock('../../services/api/astrologyApi', () => ({
  AstrologyApi: {
    getKundli: vi.fn(),
    getYogaAnalysis: vi.fn(),
  }
}));

const mockRepositories = {
  kundliProfile: {
    getAllProfiles: vi.fn(),
  }
};

vi.mock('../../repositories/repositoryProvider', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as any),
    useRepositories: () => mockRepositories
  };
});

const mockProfiles = [
  { id: 'profile-A', name: 'Profile A', relation: 'self', gender: 'male', birth_city: 'Delhi', birth_state: 'Delhi' }
];

describe('Stage 5D: NovaKundliScreen Yoga Tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepositories.kundliProfile.getAllProfiles.mockResolvedValue(mockProfiles);
    
    (AstrologyApi.getKundli as any).mockResolvedValue({
      schemaVersion: '1.0',
      provider: 'test',
      providerVersion: '1',
      calculatedAt: '2023-01-01',
      profileId: 'profile-A',
      input: {
        dateOfBirth: '1990-01-01',
        timeOfBirth: '12:00:00',
        latitude: 28.6139,
        longitude: 77.2090,
        timezone: 'Asia/Kolkata'
      },
      houseSystem: 'whole-sign',
      ascendant: { sign: 'ARIES', degree: 10, nakshatra: 'Ashwini' },
      planets: [],
      houses: [],
    });
  });

  it('does not fetch Yoga data when Basic Kundli is loaded', async () => {
    await act(async () => {
      render(
        <RepositoryProvider>
          <NovaKundliScreen />
        </RepositoryProvider>
      );
    });
    
    await waitFor(() => {
      expect(AstrologyApi.getKundli).toHaveBeenCalled();
    });
    expect(AstrologyApi.getYogaAnalysis).not.toHaveBeenCalled();
  });

  it('fetches Yoga data only when Yoga tab is activated', async () => {
    (AstrologyApi.getYogaAnalysis as any).mockResolvedValue({
      schemaVersion: '1.0',
      provider: 'test',
      providerVersion: '1',
      calculatedAt: '2023-01-01',
      profileId: 'profile-A',
      results: [
        { code: 'GAJ_KESARI_YOGA', name: 'Gaj Kesari Yoga', detected: false, strength: 'none', summary: '', evidence: [], calculationStatus: 'calculated' },
        { code: 'BUDHA_ADITYA_YOGA', name: 'Budha Aditya Yoga', detected: false, strength: 'none', summary: '', evidence: [], calculationStatus: 'calculated' },
        { code: 'DHAN_YOGA', name: 'Dhan Yoga', detected: false, strength: 'none', summary: '', evidence: [], calculationStatus: 'calculated' },
        { code: 'RAJ_YOGA', name: 'Raj Yoga', detected: false, strength: 'none', summary: '', evidence: [], calculationStatus: 'calculated' },
        { code: 'NEECH_BHANG_RAJ_YOGA', name: 'Neech Bhang Raj Yoga', detected: false, strength: 'none', summary: '', evidence: [], calculationStatus: 'calculated' }
      ]
    });

    await act(async () => {
      render(
        <RepositoryProvider>
          <NovaKundliScreen />
        </RepositoryProvider>
      );
    });
    
    await waitFor(() => expect(AstrologyApi.getKundli).toHaveBeenCalled());
    expect(AstrologyApi.getYogaAnalysis).not.toHaveBeenCalled();

    const yogaTab = screen.getByRole('button', { name: /Yoga Analysis/i });
    fireEvent.click(yogaTab);

    await waitFor(() => {
      expect(AstrologyApi.getYogaAnalysis).toHaveBeenCalledWith('profile-A');
      expect(screen.getByText('Vedic Yoga Check')).toBeInTheDocument();
    });
    
    // Check exactly 5 cards rendered for Yoga
    expect(screen.getByText('Gaj Kesari Yoga')).toBeInTheDocument();
    expect(screen.getByText('Budha Aditya Yoga')).toBeInTheDocument();
    expect(screen.getByText('Dhan Yoga')).toBeInTheDocument();
    expect(screen.getByText('Raj Yoga')).toBeInTheDocument();
    expect(screen.getByText('Neech Bhang Raj Yoga')).toBeInTheDocument();
  });
});

