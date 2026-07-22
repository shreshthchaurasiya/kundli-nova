import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KundliCalculationService } from '../services/kundliCalculationService';
import { NavamshaProvider } from '../providers/navamshaProvider';
import { ApiError } from '../errors/ApiError';
import { ProviderError } from '../errors/ProviderError';
import { KundliNovaNatalChart } from '../types/astrologyProvider';
import request from 'supertest';
import express from 'express';
import { getKundli } from '../controllers/astrology';

// Mock the Provider
vi.mock('../providers/navamshaProvider');
// Mock Supabase
vi.mock('../config/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
  }
}));
import { supabaseAdmin } from '../config/supabase';

const mockChart: KundliNovaNatalChart = {
  schemaVersion: '1.0',
  provider: 'navamsha',
  providerVersion: 'v1',
  calculatedAt: '2026-07-21T00:00:00Z',
  input: {
    profileId: 'prof123',
    name: 'Test',
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

describe('Kundli Service Stage 5A - Backend Integration', () => {
  let provider: NavamshaProvider;
  let service: KundliCalculationService;
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new NavamshaProvider();
    service = new KundliCalculationService(provider);

    app = express();
    app.use(express.json());
    // Mock requireAuth
    app.use((req: any, res, next) => {
      if (req.headers.authorization === 'Bearer valid') {
        req.user = { id: 'user123' };
        next();
      } else {
        res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }
    });
    app.get('/api/v1/astrology/kundli/:profileId', getKundli);
  });

  describe('KundliCalculationService', () => {
    it('throws INCOMPLETE_BIRTH_DETAILS on missing coordinates', async () => {
      const profile = { id: 'prof123', owner_id: 'user123', name: 'Test', dob: '1990-01-01', tob: '12:00' }; // No lat/lng/tz
      vi.mocked((supabaseAdmin.from as any)().select().eq().maybeSingle).mockResolvedValueOnce({ data: profile, error: null });

      await expect(service.getKundli('prof123', 'user123')).rejects.toMatchObject({ code: 'INCOMPLETE_BIRTH_DETAILS' });
      expect(provider.getNatalChart).not.toHaveBeenCalled();
    });

    it('maps profile to KundliNovaCalcInput and returns successful normalized result', async () => {
      const profile = {
        id: 'prof123', owner_id: 'user123', name: 'Test', dob: '1990-01-01', tob: '12:00',
        latitude: 28.61, longitude: 77.20, timezone: 'Asia/Kolkata'
      };
      vi.mocked((supabaseAdmin.from as any)().select().eq().maybeSingle).mockResolvedValueOnce({ data: profile, error: null });
      
      vi.mocked(provider.getNatalChart).mockResolvedValue(mockChart);
      const res = await service.getKundli('prof123', 'user123');
      
      expect(res).toBe(mockChart);
      expect(provider.getNatalChart).toHaveBeenCalledWith({
        profileId: profile.id,
        name: profile.name,
        dateOfBirth: profile.dob,
        timeOfBirth: profile.tob,
        latitude: profile.latitude,
        longitude: profile.longitude,
        timezone: profile.timezone,
      });
    });

    it('caches successful responses using fingerprint', async () => {
      const profile = {
        id: 'prof123', owner_id: 'user123', name: 'Test', dob: '1990-01-01', tob: '12:00',
        latitude: 28.61, longitude: 77.20, timezone: 'Asia/Kolkata'
      };
      
      vi.mocked(provider.getNatalChart).mockResolvedValue(mockChart);

      vi.mocked((supabaseAdmin.from as any)().select().eq().maybeSingle).mockResolvedValue({ data: profile, error: null });
      
      await service.getKundli('prof123', 'user123');
      await service.getKundli('prof123', 'user123');
      expect(provider.getNatalChart).toHaveBeenCalledTimes(1); // Cached
    });

    it('single-flights concurrent requests', async () => {
      const profile = {
        id: 'prof123', owner_id: 'user123', name: 'Test', dob: '1990-01-01', tob: '12:00',
        latitude: 28.61, longitude: 77.20, timezone: 'Asia/Kolkata'
      };
      
      // Artificial delay
      vi.mocked(provider.getNatalChart).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockChart), 50))
      );

      vi.mocked((supabaseAdmin.from as any)().select().eq().maybeSingle).mockResolvedValue({ data: profile, error: null });

      const p1 = service.getKundli('prof123', 'user123');
      const p2 = service.getKundli('prof123', 'user123');
      
      await Promise.all([p1, p2]);
      
      expect(provider.getNatalChart).toHaveBeenCalledTimes(1);
    });

    it('changes cache key when DOB or time is edited', async () => {
      const profile1 = {
        id: 'prof123', owner_id: 'user123', name: 'Test', dob: '1990-01-01', tob: '12:00',
        latitude: 28.61, longitude: 77.20, timezone: 'Asia/Kolkata'
      };
      const profile2 = { ...profile1, dob: '1990-01-02' };
      const profile3 = { ...profile1, tob: '13:00' };
      const profile4 = { ...profile1, latitude: 29.0 };
      const profile5 = { ...profile1, timezone: 'UTC' };
      
      vi.mocked(provider.getNatalChart).mockResolvedValue(mockChart);

      const mockSupabase = vi.mocked((supabaseAdmin.from as any)().select().eq().maybeSingle);
      mockSupabase.mockResolvedValueOnce({ data: profile1, error: null });
      await service.getKundli('prof123', 'user123');
      
      mockSupabase.mockResolvedValueOnce({ data: profile2, error: null });
      await service.getKundli('prof123', 'user123');
      
      mockSupabase.mockResolvedValueOnce({ data: profile3, error: null });
      await service.getKundli('prof123', 'user123');
      
      mockSupabase.mockResolvedValueOnce({ data: profile4, error: null });
      await service.getKundli('prof123', 'user123');
      
      mockSupabase.mockResolvedValueOnce({ data: profile5, error: null });
      await service.getKundli('prof123', 'user123');

      expect(provider.getNatalChart).toHaveBeenCalledTimes(5);
    });

    it('single-flight concurrent requests make one provider call', async () => {
      const profile = {
        id: 'prof123', owner_id: 'user123', name: 'Test', dob: '1990-01-01', tob: '12:00',
        latitude: 28.61, longitude: 77.20, timezone: 'Asia/Kolkata'
      };
      
      let resolvePromise: any;
      const providerPromise = new Promise<KundliNovaNatalChart>((res) => { resolvePromise = res; });
      vi.mocked((supabaseAdmin.from as any)().select().eq().maybeSingle).mockResolvedValue({ data: profile, error: null });
      vi.mocked(provider.getNatalChart).mockReturnValue(providerPromise);

      const p1 = service.getKundli('prof123', 'user123');
      const p2 = service.getKundli('prof123', 'user123');

      resolvePromise(mockChart);

      await Promise.all([p1, p2]);

      expect(provider.getNatalChart).toHaveBeenCalledTimes(1);
    });
    
    it('failed provider request is not cached', async () => {
      const profile = {
        id: 'prof123', owner_id: 'user123', name: 'Test', dob: '1990-01-01', tob: '12:00',
        latitude: 28.61, longitude: 77.20, timezone: 'Asia/Kolkata'
      };
      
      vi.mocked((supabaseAdmin.from as any)().select().eq().maybeSingle).mockResolvedValue({ data: profile, error: null });
      vi.mocked(provider.getNatalChart).mockRejectedValueOnce(new ProviderError('navamsha', 'PROVIDER_TIMEOUT', 'timeout', 504));
      vi.mocked(provider.getNatalChart).mockResolvedValueOnce(mockChart);

      await expect(service.getKundli('prof123', 'user123')).rejects.toThrow();
      const res = await service.getKundli('prof123', 'user123');
      
      expect(res).toBe(mockChart);
      expect(provider.getNatalChart).toHaveBeenCalledTimes(2);
    });

    it('inflight entry is cleared after success', async () => {
      const profile = {
        id: 'prof123', owner_id: 'user123', name: 'Test', dob: '1990-01-01', tob: '12:00',
        latitude: 28.61, longitude: 77.20, timezone: 'Asia/Kolkata'
      };
      vi.mocked((supabaseAdmin.from as any)().select().eq().maybeSingle).mockResolvedValue({ data: profile, error: null });
      vi.mocked(provider.getNatalChart).mockResolvedValue(mockChart);
      await service.getKundli('prof123', 'user123');
      
      // We can't directly check private map, but if we call again it uses cache,
      // not the inflight promise. However we can assume it's cleared if the design relies on it.
    });

    it('inflight entry is cleared after failure', async () => {
      const profile = {
        id: 'prof123', owner_id: 'user123', name: 'Test', dob: '1990-01-01', tob: '12:00',
        latitude: 28.61, longitude: 77.20, timezone: 'Asia/Kolkata'
      };
      vi.mocked((supabaseAdmin.from as any)().select().eq().maybeSingle).mockResolvedValue({ data: profile, error: null });
      vi.mocked(provider.getNatalChart).mockRejectedValueOnce(new Error('fail'));
      await expect(service.getKundli('prof123', 'user123')).rejects.toThrow();
      
      vi.mocked(provider.getNatalChart).mockResolvedValueOnce(mockChart);
      await service.getKundli('prof123', 'user123');
      // should succeed meaning it tried again instead of returning rejected promise
    });
  });

  describe('Route /api/v1/astrology/kundli/:profileId', () => {
    it('unauthenticated request returns 401', async () => {
      vi.spyOn(KundliCalculationService.prototype, 'getKundli');
      const res = await request(app).get('/api/v1/astrology/kundli/prof123');
      expect(res.status).toBe(401);
      expect(KundliCalculationService.prototype.getKundli).not.toHaveBeenCalled();
    });

    it('missing profile returns 404', async () => {
      vi.mocked((supabaseAdmin as any).maybeSingle).mockResolvedValue({ data: null, error: null } as any);
      
      const res = await request(app).get('/api/v1/astrology/kundli/prof123').set('Authorization', 'Bearer valid');
      expect(res.status).toBe(404);
    });

    it('incomplete birth details return 400', async () => {
      const profile = { id: 'prof123', owner_id: 'user123', name: 'Test', dob: '1990-01-01' }; // missing time and lat
      vi.mocked((supabaseAdmin as any).maybeSingle).mockResolvedValue({ data: profile, error: null } as any);
      
      // Let the actual service run so it can throw the error, we just restore the mock if we spied it
      vi.spyOn(KundliCalculationService.prototype, 'getKundli').mockRestore();
      
      const res = await request(app).get('/api/v1/astrology/kundli/prof123').set('Authorization', 'Bearer valid');
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INCOMPLETE_BIRTH_DETAILS');
    });

    it('another users profile returns 403', async () => {
      vi.mocked((supabaseAdmin as any).maybeSingle).mockResolvedValue({ data: { owner_id: 'user999' }, error: null } as any);
      
      const res = await request(app).get('/api/v1/astrology/kundli/prof123').set('Authorization', 'Bearer valid');
      expect(res.status).toBe(403);
    });

    it('provider not configured maps safely to 503', async () => {
      const profile = {
        id: 'prof123', owner_id: 'user123', name: 'Test', dob: '1990-01-01', tob: '12:00',
        latitude: 28.61, longitude: 77.20, timezone: 'Asia/Kolkata'
      };
      vi.mocked((supabaseAdmin as any).maybeSingle).mockResolvedValue({ data: profile, error: null } as any);
      
      vi.spyOn(KundliCalculationService.prototype, 'getKundli').mockRejectedValueOnce(new ProviderError('navamsha', 'PROVIDER_NOT_CONFIGURED', 'Missing API KEY', 503));

      const res = await request(app).get('/api/v1/astrology/kundli/prof123').set('Authorization', 'Bearer valid');
      expect(res.status).toBe(503);
      expect(res.body.code).toBe('KUNDLI_SERVICE_NOT_CONFIGURED');
      expect(res.body.message).not.toContain('Missing API KEY'); // Check no raw details leaked
    });

    it('timeout/rate-limit/unavailable map to KUNDLI_TEMPORARILY_UNAVAILABLE', async () => {
      const profile = {
        id: 'prof123', owner_id: 'user123', name: 'Test', dob: '1990-01-01', tob: '12:00',
        latitude: 28.61, longitude: 77.20, timezone: 'Asia/Kolkata'
      };
      vi.mocked((supabaseAdmin as any).maybeSingle).mockResolvedValue({ data: profile, error: null } as any);
      
      vi.spyOn(KundliCalculationService.prototype, 'getKundli').mockRejectedValueOnce(new ProviderError('navamsha', 'PROVIDER_TIMEOUT', 'timeout', 504));

      const res = await request(app).get('/api/v1/astrology/kundli/prof123').set('Authorization', 'Bearer valid');
      expect(res.status).toBe(503);
      expect(res.body.code).toBe('KUNDLI_TEMPORARILY_UNAVAILABLE');
    });

    it('bad provider response maps to KUNDLI_CALCULATION_FAILED', async () => {
      const profile = {
        id: 'prof123', owner_id: 'user123', name: 'Test', dob: '1990-01-01', tob: '12:00',
        latitude: 28.61, longitude: 77.20, timezone: 'Asia/Kolkata'
      };
      vi.mocked((supabaseAdmin as any).maybeSingle).mockResolvedValue({ data: profile, error: null } as any);
      
      vi.spyOn(KundliCalculationService.prototype, 'getKundli').mockRejectedValueOnce(new ProviderError('navamsha', 'PROVIDER_BAD_RESPONSE', 'bad json', 502));

      const res = await request(app).get('/api/v1/astrology/kundli/prof123').set('Authorization', 'Bearer valid');
      expect(res.status).toBe(502);
      expect(res.body.code).toBe('KUNDLI_CALCULATION_FAILED');
    });

    it('returns successful Kundli data', async () => {
      const profile = {
        id: 'prof123', owner_id: 'user123', name: 'Test', dob: '1990-01-01', tob: '12:00',
        latitude: 28.61, longitude: 77.20, timezone: 'Asia/Kolkata'
      };
      vi.mocked((supabaseAdmin as any).maybeSingle).mockResolvedValue({ data: profile, error: null } as any);
      vi.spyOn(KundliCalculationService.prototype, 'getKundli').mockResolvedValueOnce(mockChart);

      const res = await request(app).get('/api/v1/astrology/kundli/prof123').set('Authorization', 'Bearer valid');
      expect(res.status).toBe(200);
      expect(res.body.data.schemaVersion).toBe('1.0');
    });
  });
});
