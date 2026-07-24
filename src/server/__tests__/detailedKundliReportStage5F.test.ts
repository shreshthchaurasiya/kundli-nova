import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { KundliCalculationService } from '../services/kundliCalculationService';
import { ProviderError } from '../errors/ProviderError';
import { AstrologyCalculationProvider, KundliNovaDetailedReport } from '../types/astrologyProvider';

vi.mock('../middleware/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id' };
    next();
  }
}));

import { supabaseAdmin } from '../config/supabase';

const mockDetailedReportResult: KundliNovaDetailedReport = {
  schemaVersion: '1.0',
  provider: 'navamsha',
  providerVersion: '1.0',
  calculatedAt: new Date().toISOString(),
  profileId: 'test-profile-id',
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
  birthSummary: {
    profileName: 'Test',
    dateOfBirth: '2000-01-01',
    timeOfBirth: '12:00',
    placeOfBirth: 'Test City',
    latitude: 0,
    longitude: 0,
    timezone: 'UTC'
  },
  ascendant: { sign: 'Aries', degree: 10, nakshatra: 'Ashwini', pada: 1, summary: 'Test', calculationStatus: 'calculated' },
  planetaryPositions: { planets: [] },
  houseAnalysis: { houses: [{ houseNumber: 1, sign: 'Aries', lord: 'Mars', occupants: [], summary: 'Test', calculationStatus: 'calculated' }] },
  nakshatraAnalysis: { moonNakshatra: 'Ashwini', moonPada: 1, nakshatraLord: 'Ketu', deity: 'Ashvins', gana: 'Deva', symbol: 'Horse', summary: 'Test', calculationStatus: 'calculated' },
  dashaSummary: { currentMahadasha: 'Ketu', currentAntardasha: 'Venus', mahadashaStartDate: '2020-01-01', mahadashaEndDate: '2027-01-01', calculationStatus: 'calculated' },
  doshaSummary: { doshas: [] },
  yogaSummary: { yogas: [] }
};

describe('Detailed Kundli Report Validation (Stage 5F)', () => {
  describe('KundliCalculationService', () => {
    let service: KundliCalculationService;
    let mockProvider: AstrologyCalculationProvider;

    beforeEach(() => {
      vi.resetAllMocks();
      
      const chainableMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: '11111111-1111-4111-a111-111111111111',
            owner_id: 'test-user-id',
            name: 'Test Profile',
            dob: '2000-01-01',
            tob: '12:00',
            latitude: 0,
            longitude: 0,
            timezone: 'UTC'
          },
          error: null
        })
      };
      
      vi.spyOn(supabaseAdmin, 'from').mockReturnValue(chainableMock as any);

      mockProvider = {
        getNatalChart: vi.fn(),
        getPlanets: vi.fn(),
        getVimshottariDasha: vi.fn(),
        getDoshas: vi.fn(),
        getDoshaAnalysis: vi.fn(),
        getYogas: vi.fn(),
        getYogaAnalysis: vi.fn(),
        getPanchang: vi.fn(),
        getMatching: vi.fn(),
        getCompatibilityAnalysis: vi.fn(),
        getManglikCompatibility: vi.fn(),
        getDetailedKundliReport: vi.fn().mockResolvedValue(mockDetailedReportResult),
        getCurrentDasha: vi.fn()
      };
      
      service = new KundliCalculationService(mockProvider);
    });

    it('should successfully validate a complete normalized report', async () => {
      const result = await service.getDetailedKundliReport('11111111-1111-4111-a111-111111111111', 'test-user-id');
      expect(result.reportStatus).toBe('complete');
      expect(result.availableSections.length).toBe(8);
      expect(result.unavailableSections.length).toBe(0);
    });

    it('should throw PROVIDER_BAD_RESPONSE if available/unavailable sections do not equal 8', async () => {
      const badMock = {
        ...mockDetailedReportResult,
        unavailableSections: ['BIRTH_SUMMARY'] as any
      };
      (mockProvider.getDetailedKundliReport as any).mockResolvedValueOnce(badMock);
      await expect(service.getDetailedKundliReport('11111111-1111-4111-a111-111111111111', 'test-user-id')).rejects.toThrow('Report must account for exactly 8 sections');
    });

    it('should throw PROVIDER_BAD_RESPONSE if reportStatus does not match available sections', async () => {
      const badMock = {
        ...mockDetailedReportResult,
        reportStatus: 'partial'
      };
      (mockProvider.getDetailedKundliReport as any).mockResolvedValueOnce(badMock);
      await expect(service.getDetailedKundliReport('11111111-1111-4111-a111-111111111111', 'test-user-id')).rejects.toThrow('Status must be complete if all sections are available');
    });

    it('should throw PROVIDER_BAD_RESPONSE if house validation fails (invalid house number)', async () => {
      const badMock = {
        ...mockDetailedReportResult,
        houseAnalysis: { houses: [{ houseNumber: 13, sign: 'Aries', lord: 'Mars', occupants: [], summary: 'Test', calculationStatus: 'calculated' }] }
      };
      (mockProvider.getDetailedKundliReport as any).mockResolvedValueOnce(badMock);
      await expect(service.getDetailedKundliReport('11111111-1111-4111-a111-111111111111', 'test-user-id')).rejects.toThrow('Invalid house number: 13');
    });

    it('should map PROVIDER_NOT_CONFIGURED to 503 error in route', async () => {
      (mockProvider.getDetailedKundliReport as any).mockRejectedValueOnce(
        new ProviderError('navamsha', 'PROVIDER_NOT_CONFIGURED', 'Not configured')
      );
      
      // Monkey patch the service in the controller temporarily to test route response mapping
      vi.spyOn(KundliCalculationService.prototype, 'getDetailedKundliReport').mockRejectedValueOnce(
        new ProviderError('navamsha', 'PROVIDER_NOT_CONFIGURED', 'Not configured')
      );

      const response = await request(app).get('/api/v1/astrology/kundli/11111111-1111-4111-a111-111111111111/detailed-report').set('Authorization', 'Bearer fake-token');
      expect(response.status).toBe(503);
      expect(response.body.code).toBe('DETAILED_REPORT_SERVICE_NOT_CONFIGURED');
    });
  });
});
