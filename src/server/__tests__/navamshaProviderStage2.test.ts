import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NavamshaProvider } from '../providers/navamshaProvider';
import { ProviderError } from '../errors/ProviderError';
import { KundliNovaCalcInput } from '../types/astrologyProvider';
import { getUTCOffsetHours } from '../utils/timezoneHelper';

describe('Stage 2: Navamsha Natal Calculation POC', () => {
  const originalEnv = { ...process.env };
  const mockFetch = vi.fn();

  const validInput: KundliNovaCalcInput = {
    profileId: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Aarav Sharma',
    dateOfBirth: '1995-08-20',
    timeOfBirth: '14:30:00',
    latitude: 28.6139,
    longitude: 77.209,
    timezone: 'Asia/Kolkata',
  };

  const sampleNavamshaPlanetOutput = {
    statusCode: 200,
    output: {
      Ascendant: {
        fullDegree: 215.4,
        normDegree: 5.4,
        isRetro: 'false',
        house_number: 1,
        localized_name: 'Ascendant',
        zodiac_sign_name: 'Scorpio',
        zodiac_sign_lord: 'Mars',
        nakshatra_name: 'Anuradha',
        nakshatra_pada: 2,
      },
      Sun: {
        fullDegree: 140.2,
        normDegree: 20.2,
        isRetro: 'false',
        house_number: 10,
        localized_name: 'Sun',
        zodiac_sign_name: 'Leo',
        zodiac_sign_lord: 'Sun',
        nakshatra_name: 'Purva Phalguni',
        nakshatra_pada: 3,
      },
      Moon: {
        fullDegree: 42.8,
        normDegree: 12.8,
        isRetro: 'false',
        house_number: 7,
        localized_name: 'Moon',
        zodiac_sign_name: 'Taurus',
        zodiac_sign_lord: 'Venus',
        nakshatra_name: 'Rohini',
        nakshatra_pada: 1,
      },
    },
  };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NAVAMSHA_API_KEY = 'secret_test_navamsha_key_12345';
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  describe('Timezone & Input Validation', () => {
    it('converts Asia/Kolkata IANA timezone string to numeric 5.5 offset', () => {
      const offset = getUTCOffsetHours('Asia/Kolkata', '1995-08-20', '14:30:00');
      expect(offset).toBe(5.5);
    });

    it('rejects out of bound latitude', async () => {
      const provider = new NavamshaProvider();
      await expect(
        provider.getNatalChart({ ...validInput, latitude: 95 })
      ).rejects.toThrow();
    });

    it('rejects out of bound longitude', async () => {
      const provider = new NavamshaProvider();
      await expect(
        provider.getNatalChart({ ...validInput, longitude: -190 })
      ).rejects.toThrow();
    });

    it('rejects invalid date format', async () => {
      const provider = new NavamshaProvider();
      await expect(
        provider.getNatalChart({ ...validInput, dateOfBirth: '20-08-1995' })
      ).rejects.toThrow();
    });
  });

  describe('Missing API Key Check', () => {
    it('throws PROVIDER_NOT_CONFIGURED with status 503 only when invoked', async () => {
      delete process.env.NAVAMSHA_API_KEY;
      const provider = new NavamshaProvider();

      let thrownError: ProviderError | null = null;
      try {
        await provider.getNatalChart(validInput);
      } catch (err: any) {
        thrownError = err;
      }

      expect(thrownError).toBeInstanceOf(ProviderError);
      expect(thrownError?.errorCode).toBe('PROVIDER_NOT_CONFIGURED');
      expect(thrownError?.statusCode).toBe(503);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Successful Response Normalization', () => {
    it('sends correct request payload to Navamsha and returns normalized chart without UNKNOWN defaults', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => sampleNavamshaPlanetOutput,
      });

      const provider = new NavamshaProvider({ timeoutMs: 3000 });
      const chart = await provider.getNatalChart(validInput);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.navamsha.in/api/v1/planets/extended');
      expect(init.headers['X-API-Key']).toBe('secret_test_navamsha_key_12345');

      const body = JSON.parse(init.body);
      expect(body.year).toBe(1995);
      expect(body.month).toBe(8);
      expect(body.date).toBe(20);
      expect(body.hours).toBe(14);
      expect(body.minutes).toBe(30);
      expect(body.timezone).toBe(5.5);

      // Verify normalized output contract
      expect(chart.schemaVersion).toBe('1.0');
      expect(chart.provider).toBe('navamsha');
      expect(chart.providerVersion).toBe('v1');
      expect(chart.houseSystem).toBe('whole-sign');
      expect(chart.ascendant.sign).toBe('SCORPIO');
      expect(chart.moonSign).toBe('TAURUS');
      expect(chart.sunSign).toBe('LEO');
      expect(chart.nakshatra).toBe('Rohini');
      expect(chart.pada).toBe(1);

      // Verify house cusps are derived whole-sign signs starting from SCORPIO
      expect(chart.houses).toBeDefined();
      expect(chart.houses).toHaveLength(12);
      expect(chart.houses![0].sign).toBe('SCORPIO');
      expect(chart.houses![1].sign).toBe('SAGITTARIUS');
      expect(chart.houses![2].sign).toBe('CAPRICORN');
      expect(chart.houses![11].sign).toBe('LIBRA');

      // Confirm no fake or ambiguous house degree is returned
      chart.houses?.forEach((h) => {
        expect(h.sign).not.toBe('UNKNOWN');
        expect(h.degree).toBeUndefined();
      });

      // Confirm raw internal vendor response is not attached
      expect((chart as any).output).toBeUndefined();
      expect((chart as any).statusCode).toBeUndefined();
    });

    it('throws PROVIDER_BAD_RESPONSE if Ascendant is missing in provider output', async () => {
      const missingAscOutput = {
        statusCode: 200,
        output: {
          Sun: sampleNavamshaPlanetOutput.output.Sun,
          Moon: sampleNavamshaPlanetOutput.output.Moon,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => missingAscOutput,
      });

      const provider = new NavamshaProvider();
      await expect(provider.getNatalChart(validInput)).rejects.toThrow(
        'Provider response missing Ascendant placement'
      );
    });
  });

  describe('HTTP Error Code Mappings & Retryability', () => {
    it('maps HTTP 400 to PROVIDER_BAD_REQUEST (400, non-retryable)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Invalid year parameter',
      });

      const provider = new NavamshaProvider();
      let err: ProviderError | null = null;
      try {
        await provider.getNatalChart(validInput);
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeInstanceOf(ProviderError);
      expect(err?.errorCode).toBe('PROVIDER_BAD_REQUEST');
      expect(err?.statusCode).toBe(400);
      expect(err?.isRetryable()).toBe(false);
    });

    it('maps HTTP 401/403 to PROVIDER_AUTH_ERROR (503, non-retryable)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized API key',
      });

      const provider = new NavamshaProvider();
      let err: ProviderError | null = null;
      try {
        await provider.getNatalChart(validInput);
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeInstanceOf(ProviderError);
      expect(err?.errorCode).toBe('PROVIDER_AUTH_ERROR');
      expect(err?.statusCode).toBe(503);
      expect(err?.isRetryable()).toBe(false);
    });

    it('maps HTTP 429 to PROVIDER_RATE_LIMITED (503, retryable) with Retry-After', async () => {
      const headers = new Headers();
      headers.set('retry-after', '15');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers,
        text: async () => 'Rate limit exceeded',
      });

      const provider = new NavamshaProvider();
      let err: ProviderError | null = null;
      try {
        await provider.getNatalChart(validInput);
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeInstanceOf(ProviderError);
      expect(err?.errorCode).toBe('PROVIDER_RATE_LIMITED');
      expect(err?.statusCode).toBe(503);
      expect(err?.retryAfterSeconds).toBe(15);
      expect(err?.isRetryable()).toBe(true);
    });

    it('maps AbortError / timeout to PROVIDER_TIMEOUT (504, retryable)', async () => {
      mockFetch.mockImplementationOnce(() => {
        const abortErr = new Error('The operation was aborted');
        abortErr.name = 'AbortError';
        return Promise.reject(abortErr);
      });

      const provider = new NavamshaProvider();
      let err: ProviderError | null = null;
      try {
        await provider.getNatalChart(validInput);
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeInstanceOf(ProviderError);
      expect(err?.errorCode).toBe('PROVIDER_TIMEOUT');
      expect(err?.statusCode).toBe(504);
      expect(err?.isRetryable()).toBe(true);
    });

    it('maps HTTP 500 to PROVIDER_UNAVAILABLE (503, retryable)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const provider = new NavamshaProvider();
      let err: ProviderError | null = null;
      try {
        await provider.getNatalChart(validInput);
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeInstanceOf(ProviderError);
      expect(err?.errorCode).toBe('PROVIDER_UNAVAILABLE');
      expect(err?.statusCode).toBe(503);
      expect(err?.isRetryable()).toBe(true);
    });

    it('maps malformed JSON response to PROVIDER_BAD_RESPONSE (502, non-retryable)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ statusCode: 200, output: 'not an object' }),
      });

      const provider = new NavamshaProvider();
      let err: ProviderError | null = null;
      try {
        await provider.getNatalChart(validInput);
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeInstanceOf(ProviderError);
      expect(err?.errorCode).toBe('PROVIDER_BAD_RESPONSE');
      expect(err?.statusCode).toBe(502);
      expect(err?.isRetryable()).toBe(false);
    });
  });

  describe('Key & Header Sanitization', () => {
    it('sanitizes API keys in thrown error messages', () => {
      const sensitiveMsg = 'Error with key secret_test_navamsha_key_12345 in x-api-key: secret_test_navamsha_key_12345';
      const sanitized = ProviderError.sanitize(sensitiveMsg);

      expect(sanitized).not.toContain('secret_test_navamsha_key_12345');
      expect(sanitized).toContain('[REDACTED]');
    });
  });

  describe('Stage 5B: Vimshottari Dasha', () => {
    it('throws PROVIDER_NOT_CONFIGURED for getVimshottariDasha safely', async () => {
      const provider = new NavamshaProvider();
      await expect(provider.getVimshottariDasha(validInput))
        .rejects.toEqual(expect.objectContaining({ errorCode: 'PROVIDER_NOT_CONFIGURED', statusCode: 503 }));
    });
  });
});
