import React from 'react';
import { render, waitFor, screen, fireEvent } from '@testing-library/react';
import { expect, describe, it, vi, beforeEach } from 'vitest';
import NovaKundliScreen from '../NovaKundliScreen';
import { RepositoryProvider } from '../../repositories/repositoryProvider';
import { AstrologyApi } from '../../services/api/astrologyApi';
import * as pdfService from '../../services/kundliPdfService';

vi.mock('../../services/api/astrologyApi', () => ({
  AstrologyApi: {
    getKundli: vi.fn(),
    getDasha: vi.fn(),
    getDoshaAnalysis: vi.fn(),
    getYogaAnalysis: vi.fn(),
    getDetailedKundliReport: vi.fn(),
  }
}));

vi.mock('../../services/kundliPdfService', () => ({
  generateKundliPdf: vi.fn(),
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
  { id: '1', name: 'John Doe', relation: 'self', gender: 'male', birth_city: 'Delhi', birth_state: 'Delhi' },
  { id: '2', name: 'Jane Doe', relation: 'spouse', gender: 'female', birth_city: 'Mumbai', birth_state: 'Maharashtra' }
];

const mockChartData = {
  schemaVersion: '1.0',
  provider: 'navamsha',
  providerVersion: 'v1',
  calculatedAt: '2026-07-21T00:00:00Z',
  input: {
    profileId: '1',
    name: 'John Doe',
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

const mockDashaData = {
  profileId: '1',
  currentMahadasha: { planet: 'Venus', startDate: '2020-01-01', endDate: '2040-01-01' },
  mahadashaTimeline: []
};

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <RepositoryProvider repositories={mockRepositories as any}>
      {component}
    </RepositoryProvider>
  );
};

describe('NovaKundliScreen Stage 7 PDF Download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepositories.kundliProfile.getAllProfiles.mockResolvedValue(mockProfiles);
    vi.mocked(AstrologyApi.getKundli).mockResolvedValue(mockChartData as any);
    vi.mocked(AstrologyApi.getDasha).mockResolvedValue(mockDashaData as any);
    vi.mocked(pdfService.generateKundliPdf).mockResolvedValue({
      pdfBlobUrl: 'blob:url',
      pdfBase64: 'base64',
      download: vi.fn(),
    });
  });

  it('PDF action receives normalized chart and Dasha, omitting unavailable data securely without fake insights', async () => {
    renderWithProviders(<NovaKundliScreen onNavigate={() => {}} />);
    
    await waitFor(() => {
      expect(AstrologyApi.getKundli).toHaveBeenCalledWith('1');
    });

    const downloadBtn = await screen.findByText('Save PDF');
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(pdfService.generateKundliPdf).toHaveBeenCalled();
    });

    const payload = vi.mocked(pdfService.generateKundliPdf).mock.calls[0][0];
    
    // Validates normalized data format
    expect(payload.chart).toEqual(mockChartData);
    
    // Missing sections are null
    expect(payload.dasha).toBeNull(); // Because we didn't visit Dasha tab, it hasn't loaded!
    expect(payload.dosha).toBeNull();
    expect(payload.yoga).toBeNull();
    expect(payload.detailedReport).toBeNull();
    
    // No fake life insights present in the payload
    expect((payload as any).lifeInsights).toBeUndefined();
  });

  it('Download is disabled when required report data (chart) is unavailable', async () => {
    // Delay getKundli to simulate loading
    vi.mocked(AstrologyApi.getKundli).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockChartData as any), 100)));
    
    renderWithProviders(<NovaKundliScreen onNavigate={() => {}} />);
    
    // Before chart loads, button is not even rendered (screen returns null early)
    expect(screen.queryByText('Save PDF')).not.toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Save PDF')).toBeInTheDocument();
    });
  });

  it('Profile change clears stale data for PDF', async () => {
    const { container } = renderWithProviders(<NovaKundliScreen onNavigate={() => {}} />);
    
    await waitFor(() => {
      expect(AstrologyApi.getKundli).toHaveBeenCalledWith('1');
    });

    // Simulate clicking Dasha tab to load dasha data
    const dashaTab = screen.getByText('Vimshottari Dasha');
    fireEvent.click(dashaTab);
    
    await waitFor(() => {
      expect(AstrologyApi.getDasha).toHaveBeenCalledWith('1');
    });

    // Switch tab back to charts so it doesn't auto-fetch Dasha for profile 2
    const chartsTab = screen.getByText('Lagna Chart');
    fireEvent.click(chartsTab);

    // Change profile
    const select = container.querySelector('select');
    fireEvent.change(select!, { target: { value: '2' } });

    await waitFor(() => {
      expect(AstrologyApi.getKundli).toHaveBeenCalledWith('2');
    });

    const downloadBtn = await screen.findByText('Save PDF');
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(pdfService.generateKundliPdf).toHaveBeenCalled();
    });

    const payload = vi.mocked(pdfService.generateKundliPdf).mock.calls[0][0];
    
    // Dasha should be null again because we just switched profile and it clears lazy states
    expect(payload.dasha).toBeNull();
  });
});
