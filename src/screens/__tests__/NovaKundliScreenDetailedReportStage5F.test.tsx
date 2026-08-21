import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NovaKundliScreen from '../NovaKundliScreen';
import { AstrologyApi } from '../../services/api/astrologyApi';
import { KundliProfile } from '../../types/kundli';
import { DetailedKundliReportPanel } from '../../components/astrology/DetailedKundliReportPanel';

import { useRepositories } from '../../repositories/repositoryProvider';

// Mock dependencies
vi.mock('../../services/api/astrologyApi');
vi.mock('../../repositories/repositoryProvider', () => ({
  useRepositories: vi.fn(),
}));

const mockProfiles: any[] = [
  {
    id: 'profile-1',
    user_id: 'user-1',
    name: 'Primary Profile',
    date_of_birth: '1990-01-01',
    time_of_birth: '12:00',
    place_of_birth: 'New Delhi, India',
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: 'Asia/Kolkata',
    is_default: true,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  },
  {
    id: 'profile-2',
    user_id: 'user-1',
    name: 'Secondary Profile',
    date_of_birth: '1995-05-05',
    time_of_birth: '15:30',
    place_of_birth: 'Mumbai, India',
    latitude: 19.0760,
    longitude: 72.8777,
    timezone: 'Asia/Kolkata',
    is_default: false,
    created_at: '2023-01-02T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z'
  }
];

const mockDetailedReportResult = {
  schemaVersion: '1.0',
  provider: 'navamsha',
  providerVersion: '1.0',
  calculatedAt: new Date().toISOString(),
  profileId: 'profile-1',
  reportStatus: 'complete',
  availableSections: [
    'BIRTH_SUMMARY',
    'ASCENDANT',
    'PLANETARY_POSITIONS',
    'HOUSE_ANALYSIS',
    'NAKSHATRA_ANALYSIS',
    'DASHA_SUMMARY',
    'DOSHA_SUMMARY',
    'YOGA_SUMMARY'
  ],
  unavailableSections: [],
  birthSummary: { profileName: 'Test', dateOfBirth: '2000-01-01', timeOfBirth: '12:00', placeOfBirth: 'Test City', latitude: 0, longitude: 0, timezone: 'UTC' },
  ascendant: { sign: 'Aries', degree: 10, nakshatra: 'Ashwini', pada: 1, summary: 'Test', calculationStatus: 'calculated' },
  planetaryPositions: { planets: [{ planet: 'Sun', sign: 'Aries', house: 1, degree: 15, nakshatra: 'Bharani', pada: 1, retrograde: false, combust: false, calculationStatus: 'calculated' }] },
  houseAnalysis: { houses: [] },
  nakshatraAnalysis: { moonNakshatra: 'Ashwini', moonPada: 1, nakshatraLord: 'Ketu', deity: 'Ashvins', gana: 'Deva', symbol: 'Horse', summary: 'Test', calculationStatus: 'calculated' },
  dashaSummary: { currentMahadasha: 'Ketu', currentAntardasha: 'Venus', mahadashaStartDate: '2020-01-01', mahadashaEndDate: '2027-01-01', calculationStatus: 'calculated' },
  doshaSummary: { doshas: [] },
  yogaSummary: { yogas: [] }
};

describe('Detailed Kundli Report Feature (Stage 5F)', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.resetAllMocks();
    vi.mocked(useRepositories).mockReturnValue({
      kundliProfile: {
        getAllProfiles: vi.fn().mockResolvedValue(mockProfiles),
        getProfileById: vi.fn(),
      }
    } as any);
    vi.mocked(AstrologyApi.getKundli).mockResolvedValue({
      input: { dateOfBirth: '1990-01-01', timeOfBirth: '12:00:00', latitude: 0, longitude: 0, timezone: 'Asia/Kolkata', name: 'Test', profileId: 'profile-1' },
      planets: [],
      ascendant: { sign: 'Aries', degree: 0, isRetrograde: false }
    } as any);
  });

  describe('DetailedKundliReportPanel Rendering', () => {
    it('renders loading state', () => {
      render(<DetailedKundliReportPanel report={null} loading={true} error={null} onRetry={() => {}} />);
      expect(screen.getByText('Generating Report...')).toBeInTheDocument();
    });

    it('renders provider unavailable error state', () => {
      render(<DetailedKundliReportPanel report={null} loading={false} error={{ code: 'DETAILED_REPORT_SERVICE_NOT_CONFIGURED' }} onRetry={() => {}} />);
      expect(screen.getByText('Report Unavailable')).toBeInTheDocument();
      expect(screen.getByText(/The Detailed Kundli Report feature is currently being integrated/i)).toBeInTheDocument();
    });

    it('renders report overview and available sections with data', () => {
      render(<DetailedKundliReportPanel report={mockDetailedReportResult as any} loading={false} error={null} onRetry={() => {}} />);
      expect(screen.getByText('Detailed Kundli')).toBeInTheDocument();
      expect(screen.getByText('8 Available')).toBeInTheDocument();
      expect(screen.getByText('BIRTH SUMMARY')).toBeInTheDocument();
      expect(screen.getByText('Name:')).toBeInTheDocument();
      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.getByText('PLANETARY POSITIONS')).toBeInTheDocument();
      expect(screen.getByText('Planets Recorded:')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('renders unavailable section message when appropriate', () => {
      const mockPartial = {
        ...mockDetailedReportResult,
        availableSections: ['BIRTH_SUMMARY'],
        unavailableSections: ['ASCENDANT', 'PLANETARY_POSITIONS', 'HOUSE_ANALYSIS', 'NAKSHATRA_ANALYSIS', 'DASHA_SUMMARY', 'DOSHA_SUMMARY', 'YOGA_SUMMARY']
      };
      render(<DetailedKundliReportPanel report={mockPartial as any} loading={false} error={null} onRetry={() => {}} />);
      expect(screen.getByText('1 Available')).toBeInTheDocument();
      expect(screen.getByText('7 Unavailable')).toBeInTheDocument();
      expect(screen.getAllByText('UNAVAILABLE').length).toBe(7);
      expect(screen.getAllByText('This section is currently unavailable from the calculation provider.').length).toBe(7);
    });
  });

  describe('NovaKundliScreen Lazy Loading and Race Protection', () => {
    it('should lazy load detailed report only when tab is active', async () => {
      let resolveReport: any;
      const reportPromise = new Promise((r) => { resolveReport = r; });
      (AstrologyApi.getDetailedKundliReport as any).mockReturnValue(reportPromise);

      render(<NovaKundliScreen onNavigate={vi.fn()} />);
      
      // Wait for initial profile and chart load
      await waitFor(() => {
        expect(screen.getByText('Janam Kundli')).toBeInTheDocument();
      });
      
      // Verify detailed report API not called yet
      expect(AstrologyApi.getDetailedKundliReport).not.toHaveBeenCalled();

      // Click the Detailed Report tab
      const reportTab = screen.getByText('Detailed Report');
      await user.click(reportTab);
      
      // Verify API is called
      expect(AstrologyApi.getDetailedKundliReport).toHaveBeenCalledWith('profile-1');
      
      // Verify loading state
      expect(screen.getByText('Generating Report...')).toBeInTheDocument();
      
      // Resolve report
      await act(async () => {
        resolveReport(mockDetailedReportResult);
      });

      // Verify report appears
      await waitFor(() => {
        expect(screen.getByText('Detailed Kundli')).toBeInTheDocument();
      });
    });

    it('protects against out of order responses on profile switch', async () => {
      // Setup slow response for profile-1, fast for profile-2
      let resolveProfile1: any;
      const promiseProfile1 = new Promise((r) => { resolveProfile1 = r; });
      const promiseProfile2 = Promise.resolve(mockDetailedReportResult);
      
      (AstrologyApi.getDetailedKundliReport as any)
        .mockReturnValueOnce(promiseProfile1)
        .mockReturnValueOnce(promiseProfile2);
        
      render(<NovaKundliScreen onNavigate={vi.fn()} />);
      await waitFor(() => expect(screen.getByText('Janam Kundli')).toBeInTheDocument());
      
      // Navigate to Detailed Report tab
      const reportTab = screen.getByText('Detailed Report');
      await user.click(reportTab);
      
      // Switch profile before first response completes
      const profileSelect = screen.getAllByRole('combobox')[0];
      await user.selectOptions(profileSelect, 'profile-2');
      
      // Wait for second profile to load
      await waitFor(() => {
        expect(screen.getByText('Detailed Kundli')).toBeInTheDocument(); // from promiseProfile2
      });
      
      // Resolve first profile's late response
      await act(async () => {
        resolveProfile1({ ...mockDetailedReportResult, profileId: 'profile-1', birthSummary: { profileName: 'Wrong Profile' } });
      });
      
      // Verify state wasn't corrupted
      expect(screen.queryByText('Wrong Profile')).not.toBeInTheDocument();
    });
  });
});
