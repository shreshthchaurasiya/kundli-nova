import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NavamshaProvider } from '../providers/navamshaProvider';
import { ProviderError } from '../errors/ProviderError';

describe('Stage 6B - Navamsha Compatibility', () => {
  let provider: NavamshaProvider;

  const mockInputA = {
    profileId: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Bride',
    dateOfBirth: '1995-05-15',
    timeOfBirth: '10:30:00',
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: 'Asia/Kolkata',
    ayanamsha: 'lahiri'
  };

  const mockInputB = {
    profileId: '987f6543-e21b-12d3-a456-426614174000',
    name: 'Groom',
    dateOfBirth: '1993-08-20',
    timeOfBirth: '14:45:00',
    latitude: 18.5204,
    longitude: 73.8567,
    timezone: 'Asia/Kolkata',
    ayanamsha: 'lahiri'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NAVAMSHA_API_KEY = 'test-key';
    process.env.NAVAMSHA_API_BASE_URL = 'https://api.navamsha.in';
    provider = new NavamshaProvider({ timeoutMs: 1000 });
  });

  const mockSuccessResponse = {
    statusCode: 200,
    output: {
      total_score: 25,
      effective_total_score: 26,
      maximum_score: 36,
      breakdown: {
        varna: { score: 1, maximum: 1, source_rule: 'Varna match' },
        vashya: { score: 2, maximum: 2 }, // Missing source_rule
        tara: { score: 3, maximum: 3, source_rule: 'Tara match' },
        yoni: { score: 4, maximum: 4, source_rule: 'Yoni match' },
        graha_maitri: { score: 5, maximum: 5, source_rule: 'Graha Maitri match' },
        gana: { score: 6, maximum: 6, source_rule: 'Gana match' },
        bhakoot: { score: 7, maximum: 7, source_rule: 'Bhakoot match' },
        nadi: { score: 8, maximum: 8, source_rule: 'Nadi match' }
      },
      effective_breakdown: {
        varna: 1,
        vashya: 2,
        tara: 1.5 // effective score changed
      }
    }
  };

  it('uses exact detailed Ashtakoot endpoint and Bearer auth', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify(mockSuccessResponse)));
    
    await provider.getCompatibilityAnalysis(mockInputA as any, mockInputB as any);
    
    expect(fetchSpy).toHaveBeenCalledWith('https://api.navamsha.in/api/v1/compatibility/ashtakoot/detailed', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'Authorization': 'Bearer test-key'
      })
    }));
  });

  it('maps bride and groom correctly in payload', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify(mockSuccessResponse)));
    await provider.getCompatibilityAnalysis(mockInputA as any, mockInputB as any);
    
    const callArgs = fetchSpy.mock.calls[0];
    const payload = JSON.parse(callArgs[1]?.body as string);
    
    expect(payload.bride.year).toBe(1995);
    expect(payload.groom.year).toBe(1993);
    expect(payload.bride.latitude).toBe(28.6139);
    expect(payload.groom.latitude).toBe(18.5204);
  });

  it('prefers effective_total_score and calculates percentage', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify(mockSuccessResponse)));
    const res = await provider.getCompatibilityAnalysis(mockInputA as any, mockInputB as any);
    
    expect(res.totalScore).toBe(26);
    expect(res.maximumScore).toBe(36);
    expect(res.compatibilityPercentage).toBe(parseFloat(((26 / 36) * 100).toFixed(2)));
  });

  it('falls back to total_score if effective_total_score is missing', async () => {
    const resWithoutEffective = JSON.parse(JSON.stringify(mockSuccessResponse));
    delete resWithoutEffective.output.effective_total_score;
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify(resWithoutEffective)));
    
    const res = await provider.getCompatibilityAnalysis(mockInputA as any, mockInputB as any);
    expect(res.totalScore).toBe(25);
  });

  it('handles zero maximum score safely', async () => {
    const resZeroMax = JSON.parse(JSON.stringify(mockSuccessResponse));
    resZeroMax.output.maximum_score = 0;
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify(resZeroMax)));
    
    const res = await provider.getCompatibilityAnalysis(mockInputA as any, mockInputB as any);
    expect(res.compatibilityPercentage).toBe(0);
  });

  it('maps 8 factors in fixed order and prefers effective_breakdown', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify(mockSuccessResponse)));
    const res = await provider.getCompatibilityAnalysis(mockInputA as any, mockInputB as any);
    
    expect(res.factors.length).toBe(8);
    expect(res.factors[0].code).toBe('VARNA');
    expect(res.factors[1].code).toBe('VASHYA');
    expect(res.factors[2].code).toBe('TARA');
    expect(res.factors[3].code).toBe('YONI');
    expect(res.factors[4].code).toBe('GRAHA_MAITRI');
    expect(res.factors[5].code).toBe('GANA');
    expect(res.factors[6].code).toBe('BHAKOOT');
    expect(res.factors[7].code).toBe('NADI');

    // Display name check for Graha Maitri
    expect(res.factors[4].name).toBe('Graha Maitri');

    // Effective breakdown preference (tara was 3 in breakdown, 1.5 in effective_breakdown)
    expect(res.factors[2].score).toBe(1.5);
    // Preserves maximum and source_rule from breakdown
    expect(res.factors[2].maximumScore).toBe(3);
    expect(res.factors[2].summary).toBe('Tara match');

    // Missing source_rule fallback to empty string
    expect(res.factors[1].summary).toBe('');
  });

  it('rejects malformed payload', async () => {
    const malformed = { statusCode: 200, output: { total_score: 'string instead of number', maximum_score: 36 } };
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify(malformed)));
    
    await expect(provider.getCompatibilityAnalysis(mockInputA as any, mockInputB as any)).rejects.toThrowError(ProviderError);
  });

  it('does not fabricate Manglik result', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify(mockSuccessResponse)));
    const res = await provider.getCompatibilityAnalysis(mockInputA as any, mockInputB as any);
    
    // Manglik / Doshas should not be anywhere in this contract. 
    // Just verifying the typescript shape here is exact KundliNovaCompatibilityAnalysis.
    expect((res as any).manglik).toBeUndefined();
    expect((res as any).dosha).toBeUndefined();
  });
});
