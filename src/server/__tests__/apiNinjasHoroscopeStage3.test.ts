import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApiNinjasHoroscopeProvider } from '../providers/apiNinjasHoroscopeProvider';
import { ProviderError } from '../errors/ProviderError';

describe('Stage 3: API Ninjas Daily Horoscope POC', () => {
  const originalEnv = { ...process.env };
  const mockFetch = vi.fn();

  const sampleHoroscopeResponse = {
    date: '2026-07-21',
    zodiac: 'virgo',
    horoscope: 'Your methodical attention to detail pays off today in surprising ways.',
  };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.API_NINJAS_API_KEY = 'secret_ninjas_test_key_999';
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  describe('Missing API Key Check', () => {
    it('throws PROVIDER_NOT_CONFIGURED with status 503 when invoked without key', async () => {
      delete process.env.API_NINJAS_API_KEY;
      const provider = new ApiNinjasHoroscopeProvider();

      let err: ProviderError | null = null;
      try {
        await provider.getDailyHoroscope('virgo');
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeInstanceOf(ProviderError);
      expect(err?.errorCode).toBe('PROVIDER_NOT_CONFIGURED');
      expect(err?.statusCode).toBe(503);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Zodiac Input Validation', () => {
    it('rejects invalid zodiac sign name', async () => {
      const provider = new ApiNinjasHoroscopeProvider();
      await expect(
        provider.getDailyHoroscope('ophiuchus' as any)
      ).rejects.toThrow();
    });
  });

  describe('Successful Horoscope Normalization', () => {
    it('calls GET /v1/horoscope?zodiac=virgo with X-Api-Key and normalizes contract', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => sampleHoroscopeResponse,
      });

      const provider = new ApiNinjasHoroscopeProvider();
      const horoscope = await provider.getDailyHoroscope('virgo');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.api-ninjas.com/v1/horoscope?zodiac=virgo');
      expect(init.method).toBe('GET');
      expect(init.headers['X-Api-Key']).toBe('secret_ninjas_test_key_999');

      expect(horoscope.schemaVersion).toBe('1.0');
      expect(horoscope.provider).toBe('api-ninjas');
      expect(horoscope.providerVersion).toBe('v1');
      expect(horoscope.zodiacSign).toBe('virgo');
      expect(horoscope.period).toBe('today');
      expect(horoscope.date).toBe('2026-07-21');
      expect(horoscope.overview).toBe('Your methodical attention to detail pays off today in surprising ways.');
      expect(horoscope.generatedAt).toBeDefined();
    });
  });

  describe('HTTP Error Code Mappings & Retryability', () => {
    it('maps HTTP 400 to PROVIDER_BAD_REQUEST (400, non-retryable)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Invalid zodiac parameter',
      });

      const provider = new ApiNinjasHoroscopeProvider();
      let err: ProviderError | null = null;
      try {
        await provider.getDailyHoroscope('virgo');
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
        text: async () => 'Invalid X-Api-Key',
      });

      const provider = new ApiNinjasHoroscopeProvider();
      let err: ProviderError | null = null;
      try {
        await provider.getDailyHoroscope('virgo');
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
      headers.set('retry-after', '20');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers,
        text: async () => 'Rate limit exceeded',
      });

      const provider = new ApiNinjasHoroscopeProvider();
      let err: ProviderError | null = null;
      try {
        await provider.getDailyHoroscope('virgo');
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeInstanceOf(ProviderError);
      expect(err?.errorCode).toBe('PROVIDER_RATE_LIMITED');
      expect(err?.statusCode).toBe(503);
      expect(err?.retryAfterSeconds).toBe(20);
      expect(err?.isRetryable()).toBe(true);
    });

    it('maps AbortError / timeout to PROVIDER_TIMEOUT (504, retryable)', async () => {
      mockFetch.mockImplementationOnce(() => {
        const abortErr = new Error('The operation was aborted');
        abortErr.name = 'AbortError';
        return Promise.reject(abortErr);
      });

      const provider = new ApiNinjasHoroscopeProvider();
      let err: ProviderError | null = null;
      try {
        await provider.getDailyHoroscope('virgo');
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

      const provider = new ApiNinjasHoroscopeProvider();
      let err: ProviderError | null = null;
      try {
        await provider.getDailyHoroscope('virgo');
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeInstanceOf(ProviderError);
      expect(err?.errorCode).toBe('PROVIDER_UNAVAILABLE');
      expect(err?.statusCode).toBe(503);
      expect(err?.isRetryable()).toBe(true);
    });

    it('maps malformed response payload to PROVIDER_BAD_RESPONSE (502, non-retryable)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ date: '2026-07-21' }), // missing horoscope string
      });

      const provider = new ApiNinjasHoroscopeProvider();
      let err: ProviderError | null = null;
      try {
        await provider.getDailyHoroscope('virgo');
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeInstanceOf(ProviderError);
      expect(err?.errorCode).toBe('PROVIDER_BAD_RESPONSE');
      expect(err?.statusCode).toBe(502);
      expect(err?.isRetryable()).toBe(false);
    });
  });
});
