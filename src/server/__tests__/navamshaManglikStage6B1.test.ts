import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NavamshaProvider } from '../providers/navamshaProvider';
import { ProviderError } from '../errors/ProviderError';

describe('Stage 6B.1 - Navamsha Manglik Compatibility', () => {
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

  const mockManglikSuccessResponse = {
    statusCode: 200,
    output: {
      person_a: {
        is_present: true,
        triggered_references: ["Lagna"],
        checked_houses: { Lagna: 2, Moon: 10, Venus: 5 },
        rule_houses: [1, 2, 4, 7, 8, 12],
        severity: "not_evaluated",
        cancellation: "not_evaluated",
        calculation_input: "longitudes",
        reference_longitudes: { Lagna: 99.6, Moon: 214.5, Venus: 4.0 },
        mars_longitude: 121.7
      },
      person_b: {
        is_present: false,
        triggered_references: [],
        checked_houses: { Lagna: 11, Moon: 1, Venus: 4 },
        rule_houses: [1, 2, 4, 7, 8, 12],
        severity: "not_evaluated",
        cancellation: "fully_cancelled",
        calculation_input: "longitudes",
        reference_longitudes: { Lagna: 239.8, Moon: 159.9, Venus: 87.6 },
        mars_longitude: 161.5
      },
      compatibility: "manglik_non_manglik"
    }
  };

  it('uses exact Manglik endpoint and maps person_a / person_b payload (preventing 422)', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify(mockManglikSuccessResponse)));
    
    await provider.getManglikCompatibility(mockInputA as any, mockInputB as any);
    
    expect(fetchSpy).toHaveBeenCalledWith('https://api.navamsha.in/api/v1/compatibility/manglik', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'Authorization': 'Bearer test-key'
      })
    }));

    const callArgs = fetchSpy.mock.calls[0];
    const payload = JSON.parse(callArgs[1]?.body as string);
    
    // Ensure person_a and person_b are used (prevents 422)
    expect(payload.person_a).toBeDefined();
    expect(payload.person_b).toBeDefined();
    expect(payload.bride).toBeUndefined();
    expect(payload.groom).toBeUndefined();
    expect(payload.person_a.year).toBe(1995);
    expect(payload.person_b.year).toBe(1993);
  });

  it('maps profileAManglik, profileBManglik, cancellations, and compatibility accurately', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify(mockManglikSuccessResponse)));
    
    const res = await provider.getManglikCompatibility(mockInputA as any, mockInputB as any);
    
    expect(res.profileAId).toBe(mockInputA.profileId);
    expect(res.profileBId).toBe(mockInputB.profileId);
    expect(res.profileAManglik).toBe(true);
    expect(res.profileBManglik).toBe(false);
    expect(res.profileACancellation).toBe('not_evaluated');
    expect(res.profileBCancellation).toBe('fully_cancelled');
    expect(res.compatibility).toBe('manglik_non_manglik');
  });

  it('provides default string for missing cancellation fields', async () => {
    const missingCancellationResponse = JSON.parse(JSON.stringify(mockManglikSuccessResponse));
    delete missingCancellationResponse.output.person_a.cancellation;
    
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify(missingCancellationResponse)));
    
    const res = await provider.getManglikCompatibility(mockInputA as any, mockInputB as any);
    expect(res.profileACancellation).toBe('not_evaluated');
  });

  it('strips provider calculation traces and preserves only normalized fields', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify(mockManglikSuccessResponse)));
    
    const res = await provider.getManglikCompatibility(mockInputA as any, mockInputB as any);
    
    expect((res as any).reference_longitudes).toBeUndefined();
    expect((res as any).mars_longitude).toBeUndefined();
    expect((res as any).checked_houses).toBeUndefined();
  });

  it('rejects malformed payload', async () => {
    const malformedResponse = { statusCode: 200, output: { person_a: { is_present: "yes" } } };
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify(malformedResponse)));
    
    await expect(provider.getManglikCompatibility(mockInputA as any, mockInputB as any)).rejects.toThrowError(ProviderError);
  });

  it('maps existing provider errors (401 to PROVIDER_AUTH_ERROR)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));
    await expect(provider.getManglikCompatibility(mockInputA as any, mockInputB as any)).rejects.toThrowError('Authentication failed');
  });

  it('maps existing provider errors (422 to PROVIDER_BAD_RESPONSE)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response('Unprocessable Entity', { status: 422 }));
    await expect(provider.getManglikCompatibility(mockInputA as any, mockInputB as any)).rejects.toThrowError('Invalid request payload or validation failed upstream');
  });
});
