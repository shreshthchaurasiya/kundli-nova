import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KundliCalculationService } from '../services/kundliCalculationService';
import { AstrologyCalculationProvider, KundliNovaCalcInput, KundliNovaVimshottariDasha } from '../types/astrologyProvider';
import { supabaseAdmin } from '../config/supabase';

vi.mock('../config/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
  },
}));

describe('Stage 5B: Vimshottari Dasha Service', () => {
  const mockProvider = {
    getNatalChart: vi.fn(),
    getPlanets: vi.fn(),
    getVimshottariDasha: vi.fn(),
    getDoshas: vi.fn(),
    getYogas: vi.fn(),
    getPanchang: vi.fn(),
    getMatching: vi.fn(),
  } as unknown as AstrologyCalculationProvider;

  const service = new KundliCalculationService(mockProvider);

  const mockProfile = {
    id: 'profile-1',
    owner_id: 'user-1',
    name: 'Test Profile',
    dob: '1990-01-01',
    tob: '12:00:00',
    latitude: 28.6,
    longitude: 77.2,
    timezone: 'Asia/Kolkata',
  };

  const mockDashaResponse: KundliNovaVimshottariDasha = {
    schemaVersion: '1.0',
    provider: 'navamsha',
    providerVersion: 'v1',
    calculatedAt: new Date().toISOString(),
    currentMahadasha: {
      planet: 'Rahu',
      startDate: '2020-01-01T00:00:00Z',
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(), // Ends in 30 days
      isCurrent: true,
    },
    currentAntardasha: {
      planet: 'Jupiter',
      startDate: '2024-01-01T00:00:00Z',
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString(), // Ends in 10 days
      isCurrent: true,
    },
    mahadashaTimeline: [
      {
        planet: 'Mars',
        startDate: '2013-01-01T00:00:00Z',
        endDate: '2020-01-01T00:00:00Z',
        isCurrent: false,
      },
      {
        planet: 'Rahu',
        startDate: '2020-01-01T00:00:00Z',
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
        isCurrent: true,
      }
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (supabaseAdmin.from as any)().select().eq().maybeSingle.mockResolvedValue({
      data: mockProfile,
      error: null,
    });
    // Create a new service instance to clear cache
    (service as any).dashaCache.clear();
    (service as any).dashaInflight.clear();
  });

  it('loads authorized calculation input safely and throws on missing profile', async () => {
    (supabaseAdmin.from as any)().select().eq().maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(service.getVimshottariDasha('invalid-id', 'user-1'))
      .rejects.toEqual(expect.objectContaining({ code: 'PROFILE_NOT_FOUND' }));
  });

  it('calculates remainingDays correctly based on server time and clamps to 0', async () => {
    const expiredDasha = {
      ...mockDashaResponse,
      currentMahadasha: {
        ...mockDashaResponse.currentMahadasha,
        endDate: '2010-01-01T00:00:00Z', // Past date
      }
    };
    (mockProvider.getVimshottariDasha as any).mockResolvedValueOnce(expiredDasha);

    const result = await service.getVimshottariDasha('profile-1', 'user-1');
    expect(result.currentMahadasha.remainingDays).toBe(0); // clamped to 0
  });

  it('calculates future remainingDays correctly', async () => {
    (mockProvider.getVimshottariDasha as any).mockResolvedValueOnce(mockDashaResponse);

    const result = await service.getVimshottariDasha('profile-1', 'user-1');
    expect(result.currentMahadasha.remainingDays).toBeGreaterThan(25);
    expect(result.currentMahadasha.remainingDays).toBeLessThanOrEqual(31);
    expect(result.currentAntardasha?.remainingDays).toBeGreaterThan(5);
  });

  it('caches dasha requests with single-flight capability separated from kundli', async () => {
    (mockProvider.getVimshottariDasha as any).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockDashaResponse), 50))
    );

    // Trigger concurrently
    const p1 = service.getVimshottariDasha('profile-1', 'user-1');
    const p2 = service.getVimshottariDasha('profile-1', 'user-1');
    
    await Promise.all([p1, p2]);

    expect(mockProvider.getVimshottariDasha).toHaveBeenCalledTimes(1);

    // Next request should hit cache
    await service.getVimshottariDasha('profile-1', 'user-1');
    expect(mockProvider.getVimshottariDasha).toHaveBeenCalledTimes(1);
    expect(mockProvider.getNatalChart).not.toHaveBeenCalled();
  });
});
