import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { KundliCalculationService } from '../services/kundliCalculationService';
import { supabaseAdmin } from '../config/supabase';
import { ProviderError } from '../errors/ProviderError';
import { AstrologyCalculationProvider, KundliNovaCalcInput, KundliNovaCompatibilityAnalysis } from '../types/astrologyProvider';
import { KundliProfile } from '../../types';

vi.mock('../config/supabase', () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null })
    },
    from: vi.fn()
  }
}));

const mockProfileA: any = {
  id: 'profileA',
  name: 'Test Profile A',
  dob: '1990-01-01',
  tob: '12:00',
  latitude: 28.6139,
  longitude: 77.209,
  timezone: 'Asia/Kolkata',
  gender: 'MALE',
  is_default: true,
  user_id: 'test-user-id',
  owner_id: 'test-user-id',
  created_at: '',
  updated_at: ''
};

const mockProfileB: any = {
  id: 'profileB',
  name: 'Test Profile B',
  dob: '1992-02-02',
  tob: '14:00',
  latitude: 19.0760,
  longitude: 72.8777,
  timezone: 'Asia/Kolkata',
  gender: 'FEMALE',
  is_default: false,
  user_id: 'test-user-id',
  owner_id: 'test-user-id',
  created_at: '',
  updated_at: ''
};

const mockCompatibilityResult: KundliNovaCompatibilityAnalysis = {
  schemaVersion: '1.0',
  provider: 'navamsha',
  providerVersion: '1.0',
  calculatedAt: new Date().toISOString(),
  profileAId: 'profileA',
  profileBId: 'profileB',
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
};

describe('Stage 5E: Compatibility Backend Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/astrology/compatibility', () => {
    it('rejects request if profileAId or profileBId is missing', async () => {
      const response = await request(app).get('/api/v1/astrology/compatibility?profileAId=profileA').set('Authorization', 'Bearer fake-token');
      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_COMPATIBILITY_PROFILES');
    });

    it('rejects request if both profiles are the same', async () => {
      // The controller passes to the service, and the service should throw SAME_PROFILE_NOT_ALLOWED
      // Let's mock the service to throw this if passed same profiles
      vi.spyOn(KundliCalculationService.prototype, 'getCompatibilityAnalysis').mockImplementation(async (a, b) => {
        if (a === b) {
          const err: any = new Error('Please select two different profiles');
          err.statusCode = 400;
          err.code = 'SAME_PROFILE_NOT_ALLOWED';
          throw err;
        }
        return mockCompatibilityResult;
      });

      const response = await request(app).get('/api/v1/astrology/compatibility?profileAId=profileA&profileBId=profileA').set('Authorization', 'Bearer fake-token');
      expect(response.status).toBe(400);
      expect(response.body.code).toBe('SAME_PROFILE_NOT_ALLOWED');
    });

    const mockManglikResult = {
      schemaVersion: '1.0' as const,
      provider: 'navamsha',
      providerVersion: 'v1',
      calculatedAt: new Date().toISOString(),
      profileAId: 'profileA',
      profileBId: 'profileB',
      profileAManglik: true,
      profileBManglik: false,
      profileACancellation: 'not_evaluated',
      profileBCancellation: 'fully_cancelled',
      compatibility: 'manglik_non_manglik'
    };

    it('returns unified compatibility data successfully (Ashtakoot + Manglik)', async () => {
      const compSpy = vi.spyOn(KundliCalculationService.prototype, 'getCompatibilityAnalysis').mockResolvedValueOnce(mockCompatibilityResult);
      const manglikSpy = vi.spyOn(KundliCalculationService.prototype, 'getManglikCompatibility').mockResolvedValueOnce(mockManglikResult);
      
      const response = await request(app).get('/api/v1/astrology/compatibility?profileAId=profileA&profileBId=profileB').set('Authorization', 'Bearer fake-token');
      expect(response.status).toBe(200);
      expect(response.body.data.compatibility.totalScore).toBe(28.5);
      expect(response.body.data.manglik.profileAManglik).toBe(true);
      expect(response.body.data.manglik.compatibility).toBe('manglik_non_manglik');
      
      // Both service methods were called with the same parameters
      expect(compSpy).toHaveBeenCalledWith('profileA', 'profileB', 'test-user-id');
      expect(manglikSpy).toHaveBeenCalledWith('profileA', 'profileB', 'test-user-id');
      
      // Ensure no raw fields leak
      expect(response.body.data.compatibility.reference_longitudes).toBeUndefined();
      expect(response.body.data.manglik.reference_longitudes).toBeUndefined();
    });

    it('handles PROVIDER_NOT_CONFIGURED properly if Ashtakoot fails', async () => {
      vi.spyOn(KundliCalculationService.prototype, 'getCompatibilityAnalysis').mockRejectedValueOnce(
        new ProviderError('navamsha', 'PROVIDER_NOT_CONFIGURED', 'Not ready')
      );
      vi.spyOn(KundliCalculationService.prototype, 'getManglikCompatibility').mockResolvedValueOnce(mockManglikResult);
      
      const response = await request(app).get('/api/v1/astrology/compatibility?profileAId=profileA&profileBId=profileB').set('Authorization', 'Bearer fake-token');
      expect(response.status).toBe(503);
      expect(response.body.code).toBe('COMPATIBILITY_SERVICE_NOT_CONFIGURED');
      expect(response.body.data).toBeUndefined();
    });

    it('handles PROVIDER_BAD_RESPONSE properly if Manglik fails', async () => {
      vi.spyOn(KundliCalculationService.prototype, 'getCompatibilityAnalysis').mockResolvedValueOnce(mockCompatibilityResult);
      vi.spyOn(KundliCalculationService.prototype, 'getManglikCompatibility').mockRejectedValueOnce(
        new ProviderError('navamsha', 'PROVIDER_BAD_RESPONSE', 'Invalid payload')
      );
      
      const response = await request(app).get('/api/v1/astrology/compatibility?profileAId=profileA&profileBId=profileB').set('Authorization', 'Bearer fake-token');
      expect(response.status).toBe(502);
      expect(response.body.code).toBe('COMPATIBILITY_CALCULATION_FAILED');
      expect(response.body.data).toBeUndefined();
    });
  });

  describe('KundliCalculationService.getCompatibilityAnalysis', () => {
    let service: KundliCalculationService;
    let mockProvider: AstrologyCalculationProvider;

    beforeEach(() => {
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
        getCompatibilityAnalysis: vi.fn().mockResolvedValue(mockCompatibilityResult),
        getManglikCompatibility: vi.fn(),
        getDetailedKundliReport: vi.fn()
      };
      // Reset the service mock to use real implementation for these tests
      vi.restoreAllMocks();
      
      vi.spyOn(supabaseAdmin, 'from').mockImplementation(() => {
        return {
          select: () => ({
            eq: (field: string, val: string) => ({
              maybeSingle: async () => {
                if (val === 'profileA') return { data: mockProfileA, error: null };
                if (val === 'profileB') return { data: mockProfileB, error: null };
                return { data: null, error: { message: 'Not found' } };
              }
            })
          })
        } as any;
      });

      service = new KundliCalculationService(mockProvider);
    });

    it('validates response has exactly 8 factors', async () => {
      vi.mocked(mockProvider.getCompatibilityAnalysis).mockResolvedValue({
        ...mockCompatibilityResult,
        factors: [] // Missing factors
      });

      await expect(service.getCompatibilityAnalysis('profileA', 'profileB', 'test-user-id')).rejects.toThrow('exactly 8 factors');
    });

    it('validates factor codes are unique and strictly matched', async () => {
      vi.mocked(mockProvider.getCompatibilityAnalysis).mockResolvedValue({
        ...mockCompatibilityResult,
        factors: [
          { code: 'VARNA', name: 'Varna', score: 1, maximumScore: 1, summary: 'Good', calculationStatus: 'calculated' },
          { code: 'VARNA', name: 'Varna', score: 1, maximumScore: 1, summary: 'Good', calculationStatus: 'calculated' },
          // Missing others
        ]
      });

      await expect(service.getCompatibilityAnalysis('profileA', 'profileB', 'test-user-id')).rejects.toThrow();
    });

    it('caches request directionally', async () => {
      const res1 = service.getCompatibilityAnalysis('profileA', 'profileB', 'test-user-id');
      const res2 = service.getCompatibilityAnalysis('profileA', 'profileB', 'test-user-id');
      
      await Promise.all([res1, res2]);
      
      expect(mockProvider.getCompatibilityAnalysis).toHaveBeenCalledTimes(1);

      // Now reverse order - should use a different cache key if directional! Wait, actually if it's directional, A->B is different from B->A.
      const res3 = service.getCompatibilityAnalysis('profileB', 'profileA', 'test-user-id');
      await res3;
      expect(mockProvider.getCompatibilityAnalysis).toHaveBeenCalledTimes(2);
    });
  });
});
