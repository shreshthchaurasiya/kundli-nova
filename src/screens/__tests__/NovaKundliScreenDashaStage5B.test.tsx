import React from 'react';
import { render, waitFor, screen, fireEvent, act } from '@testing-library/react';
import { expect, describe, it, vi, beforeEach } from 'vitest';
import NovaKundliScreen from '../NovaKundliScreen';
import { RepositoryProvider } from '../../repositories/repositoryProvider';
import { AstrologyApi } from '../../services/api/astrologyApi';

vi.mock('../../services/api/astrologyApi', () => ({
  AstrologyApi: {
    getKundli: vi.fn(),
    getDasha: vi.fn(),
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
  { id: 'profile-A', name: 'Profile A', relation: 'self', gender: 'male', birth_city: 'Delhi', birth_state: 'Delhi' },
  { id: 'profile-B', name: 'Profile B', relation: 'spouse', gender: 'female', birth_city: 'Mumbai', birth_state: 'Maharashtra' }
];

const mockKundliData = {
  schemaVersion: '1.0',
  provider: 'navamsha',
  providerVersion: 'v1',
  calculatedAt: '2026-07-21T00:00:00Z',
  input: {
    profileId: 'profile-A',
    name: 'Profile A',
    dateOfBirth: '1990-01-01',
    timeOfBirth: '12:00',
    latitude: 28.6139,
    longitude: 77.209,
    timezone: 'Asia/Kolkata',
  },
  houseSystem: 'whole-sign',
  ascendant: { sign: 'ARIES', degree: 10, nakshatra: 'Ashwini' },
  planets: [],
  houses: [],
  moonSign: 'ARIES',
  sunSign: 'ARIES',
  nakshatra: 'Ashwini',
  pada: 1,
};

const mockDashaProfileA = {
  schemaVersion: '1.0',
  provider: 'navamsha',
  providerVersion: 'v1',
  calculatedAt: '2026-07-22T00:00:00Z',
  currentMahadasha: {
    planet: 'Sun',
    startDate: '2020-01-01T00:00:00Z',
    endDate: '2030-01-01T00:00:00Z',
    isCurrent: true,
    remainingDays: 1200,
  },
  currentAntardasha: {
    planet: 'Moon',
    startDate: '2023-01-01T00:00:00Z',
    endDate: '2024-01-01T00:00:00Z',
    isCurrent: true,
    remainingDays: 0,
  },
  mahadashaTimeline: [
    { planet: 'Sun', startDate: '2020-01-01T00:00:00Z', endDate: '2030-01-01T00:00:00Z', isCurrent: true },
  ]
};

const mockDashaProfileB = {
  schemaVersion: '1.0',
  provider: 'navamsha',
  providerVersion: 'v1',
  calculatedAt: '2026-07-22T00:00:00Z',
  currentMahadasha: {
    planet: 'Jupiter',
    startDate: '2021-01-01T00:00:00Z',
    endDate: '2037-01-01T00:00:00Z',
    isCurrent: true,
    remainingDays: 3800,
  },
  currentAntardasha: null,
  mahadashaTimeline: [
    { planet: 'Jupiter', startDate: '2021-01-01T00:00:00Z', endDate: '2037-01-01T00:00:00Z', isCurrent: true },
  ]
};

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <RepositoryProvider repositories={mockRepositories as any}>
      {component}
    </RepositoryProvider>
  );
};

describe('NovaKundliScreen Stage 5B Frontend Dasha UI & Race Conditions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepositories.kundliProfile.getAllProfiles.mockResolvedValue(mockProfiles);
    vi.mocked(AstrologyApi.getKundli).mockResolvedValue(mockKundliData as any);
  });

  it('opening basic Kundli does not call getDasha until Dasha tab is selected', async () => {
    vi.mocked(AstrologyApi.getDasha).mockResolvedValue(mockDashaProfileA as any);

    renderWithProviders(<NovaKundliScreen onNavigate={() => {}} />);

    await waitFor(() => {
      expect(AstrologyApi.getKundli).toHaveBeenCalledWith('profile-A');
    });

    // Dasha API should NOT be called initially
    expect(AstrologyApi.getDasha).not.toHaveBeenCalled();

    // Click Dasha tab
    const dashaTab = screen.getByRole('button', { name: /dasha/i });
    fireEvent.click(dashaTab);

    // Now Dasha API should be called lazily
    await waitFor(() => {
      expect(AstrologyApi.getDasha).toHaveBeenCalledWith('profile-A');
    });
  });

  it('displays Dasha content correctly including null currentAntardasha and Mahadasha timeline', async () => {
    vi.mocked(AstrologyApi.getDasha).mockResolvedValue(mockDashaProfileB as any);

    renderWithProviders(<NovaKundliScreen onNavigate={() => {}} />);

    await waitFor(() => {
      expect(AstrologyApi.getKundli).toHaveBeenCalled();
    });

    const dashaTab = screen.getByRole('button', { name: /dasha/i });
    fireEvent.click(dashaTab);

    await waitFor(() => {
      expect(AstrologyApi.getDasha).toHaveBeenCalledWith('profile-A');
    });

    expect((await screen.findAllByText('Jupiter'))[0]).toBeInTheDocument();
    expect(screen.getByText('Unavailable')).toBeInTheDocument();

    // Does not render AI/predictions/remedies/PDF in Dasha tab
    expect(screen.queryByText(/Explain Vimshottari Dasha with AI/i)).not.toBeInTheDocument();
  });

  it('race condition protection: request A starts for profile A, user switches to profile B, request B resolves first, request A resolves later -> profile B Dasha remains displayed', async () => {
    let resolveDashaA: (val: any) => void = () => {};
    let resolveDashaB: (val: any) => void = () => {};

    vi.mocked(AstrologyApi.getDasha).mockImplementation((profileId) => {
      if (profileId === 'profile-A') {
        return new Promise((resolve) => { resolveDashaA = resolve; });
      }
      if (profileId === 'profile-B') {
        return new Promise((resolve) => { resolveDashaB = resolve; });
      }
      return Promise.resolve(mockDashaProfileA as any);
    });

    renderWithProviders(<NovaKundliScreen onNavigate={() => {}} />);

    await waitFor(() => {
      expect(AstrologyApi.getKundli).toHaveBeenCalledWith('profile-A');
    });

    // Switch to Dasha tab (triggers request A for profile-A)
    const dashaTab = screen.getByRole('button', { name: /dasha/i });
    fireEvent.click(dashaTab);

    await waitFor(() => {
      expect(AstrologyApi.getDasha).toHaveBeenCalledWith('profile-A');
    });

    // User switches profile to profile-B while request A is pending
    const selectElement = screen.getByRole('combobox');
    fireEvent.change(selectElement, { target: { value: 'profile-B' } });

    await waitFor(() => {
      expect(AstrologyApi.getDasha).toHaveBeenCalledWith('profile-B');
    });

    // Request B resolves first
    await act(async () => {
      resolveDashaB(mockDashaProfileB);
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(screen.getAllByText('Jupiter')[0]).toBeInTheDocument();

    // Request A resolves later (out of order)
    await act(async () => {
      resolveDashaA(mockDashaProfileA);
      await new Promise((r) => setTimeout(r, 0));
    });

    // Profile B (Jupiter) MUST remain displayed, NOT overwritten by Profile A (Sun)
    expect(screen.getAllByText('Jupiter')[0]).toBeInTheDocument();
    expect(screen.queryByText('Sun')).not.toBeInTheDocument();
  });
});
