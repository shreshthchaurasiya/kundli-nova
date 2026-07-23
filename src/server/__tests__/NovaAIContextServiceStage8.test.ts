import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NovaAIContextService } from '../../server/services/ai/NovaAIContextService';
import { KundliCalculationService } from '../../server/services/kundliCalculationService';

// Mock dependencies
vi.mock('../../server/services/kundliCalculationService', () => {
  return {
    KundliCalculationService: class {
      getKundli = vi.fn();
      getVimshottariDasha = vi.fn();
      getDoshaAnalysis = vi.fn();
      getYogaAnalysis = vi.fn();
      getDetailedKundliReport = vi.fn();
    }
  };
});

vi.mock('../../server/config/supabase', () => {
  const mockSupa = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };
  return {
    supabase: mockSupa,
    supabaseAdmin: mockSupa,
  };
});

// Import after mocking
import { supabaseAdmin } from '../../server/config/supabase';

describe('Stage 8.2 - NovaAIContextService Identity & Caching Verification', () => {
  let contextService: NovaAIContextService;
  let mockKundliService: any;
  let mockSupabase: any;
  const mockMemory: any = {};

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = supabaseAdmin;
    mockKundliService = new KundliCalculationService(null as any);
    contextService = new NovaAIContextService(mockKundliService);
  });

  const getProfileMock = (id: string, name: string) => ({
    id,
    owner_id: 'user-1',
    name,
    gender: 'male',
    dob: '1990-01-01',
    tob: '12:00',
    birth_city: 'Delhi',
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: 'Asia/Kolkata'
  });

  it('rejects an unauthorized profile (validates ownership)', async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });
    
    await expect(contextService.loadContext('user-1', 'prof-unauth', mockMemory))
      .rejects.toThrow(/Profile not found or unauthorized/);
      
    expect(mockKundliService.getKundli).not.toHaveBeenCalled();
  });

  it('loads cached normalized astrology data if fingerprint matches', async () => {
    const profile = getProfileMock('prof-cache', 'Cache User');
    mockSupabase.single.mockResolvedValueOnce({ data: profile });
    
    // Exact fingerprint generation logic from service: crypto.createHash('sha256').update(data).digest('hex')
    // We can just spy on createFingerprint or use the exact string. Let's spy on it.
    vi.spyOn(contextService as any, 'createFingerprint').mockReturnValue('mock-hash');

    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: {
        profile_id: 'prof-cache',
        report_json: {
          fingerprint: 'mock-hash',
          data: { natalChart: { lagna: 'Aries' } }
        }
      }
    });

    const context = await contextService.loadContext('user-1', 'prof-cache', mockMemory);
    
    expect(context.astrology.natalChart.lagna).toBe('Aries');
    expect(mockKundliService.getKundli).not.toHaveBeenCalled();
  });

  it('regenerates on cache miss or fingerprint mismatch', async () => {
    const profile = getProfileMock('prof-miss', 'New User');
    mockSupabase.single.mockResolvedValueOnce({ data: profile });

    // Cache miss
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    
    mockSupabase.delete.mockResolvedValueOnce({ error: null });
    mockSupabase.insert.mockResolvedValueOnce({ error: null });

    mockKundliService.getKundli.mockResolvedValueOnce({ lagna: 'Taurus' });
    mockKundliService.getVimshottariDasha.mockResolvedValueOnce({});
    mockKundliService.getDoshaAnalysis.mockResolvedValueOnce({});
    mockKundliService.getYogaAnalysis.mockResolvedValueOnce({});
    mockKundliService.getDetailedKundliReport.mockResolvedValueOnce({});

    const context = await contextService.loadContext('user-1', 'prof-miss', mockMemory);
    
    // Note: getKundli receives (profileId, userId)
    expect(mockKundliService.getKundli).toHaveBeenCalledWith('prof-miss', 'user-1');
    expect(context.astrology.natalChart.lagna).toBe('Taurus');
  });

  it('never trusts a frontend-provided name and uses validated DB name', async () => {
    const profile = getProfileMock('prof-name', 'Database Name');
    mockSupabase.single.mockResolvedValueOnce({ data: profile });
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null }); 
    
    mockKundliService.getKundli.mockResolvedValueOnce({});

    const context = await contextService.loadContext('user-1', 'prof-name', mockMemory);
    
    expect(context.selectedProfile.name).toBe('Database Name');
  });

  it('does not persist partial data if primary astrology provider fails', async () => {
    const profile = getProfileMock('prof-fail', 'Fail User');
    mockSupabase.single.mockResolvedValueOnce({ data: profile });
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    
    mockKundliService.getKundli.mockRejectedValueOnce(new Error('Provider timeout'));
    
    // The service catches getKundli errors and console.warns them without throwing.
    const context = await contextService.loadContext('user-1', 'prof-fail', mockMemory);
    
    expect(context.astrology.natalChart).toBeNull();
    // Should NOT have attempted to save partial payload (delete/insert)
    expect(mockSupabase.delete).not.toHaveBeenCalled();
    expect(mockSupabase.insert).not.toHaveBeenCalled();
  });
});
