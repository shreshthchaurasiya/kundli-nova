import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { dailyHoroscopeService } from '../services/dailyHoroscopeService';
import { ApiNinjasHoroscopeProvider } from '../providers/apiNinjasHoroscopeProvider';
import { ProviderError, ProviderErrorCode } from '../errors/ProviderError';

describe('Stage 4A: Daily Horoscope Service', () => {
  const sampleHoroscope = {
    schemaVersion: '1.0' as const,
    provider: 'api-ninjas',
    providerVersion: 'v1',
    zodiacSign: 'virgo' as const,
    period: 'today' as const,
    date: '2026-07-21',
    overview: 'Your methodical attention to detail pays off today.',
    generatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    dailyHoroscopeService.clearCache();
    vi.clearAllMocks();
    
    // Mock the date to ensure consistent business date
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-21T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetches from provider on cache miss', async () => {
    const mockGetDailyHoroscope = vi.spyOn(ApiNinjasHoroscopeProvider.prototype, 'getDailyHoroscope')
      .mockResolvedValue(sampleHoroscope);

    const result = await dailyHoroscopeService.getDailyHoroscope('virgo');

    expect(mockGetDailyHoroscope).toHaveBeenCalledTimes(1);
    expect(mockGetDailyHoroscope).toHaveBeenCalledWith('virgo', '2026-07-21');
    expect(result).toEqual(sampleHoroscope);
  });

  it('returns cached result on subsequent calls for same day', async () => {
    const mockGetDailyHoroscope = vi.spyOn(ApiNinjasHoroscopeProvider.prototype, 'getDailyHoroscope')
      .mockResolvedValue(sampleHoroscope);

    await dailyHoroscopeService.getDailyHoroscope('virgo');
    const result2 = await dailyHoroscopeService.getDailyHoroscope('virgo');

    expect(mockGetDailyHoroscope).toHaveBeenCalledTimes(1); // Only called once
    expect(result2).toEqual(sampleHoroscope);
  });

  it('single-flight: collapses concurrent requests into one provider call', async () => {
    let resolveProvider!: (val: any) => void;
    const mockGetDailyHoroscope = vi.spyOn(ApiNinjasHoroscopeProvider.prototype, 'getDailyHoroscope')
      .mockImplementation(() => {
        return new Promise(resolve => {
          resolveProvider = resolve;
        });
      });

    // Fire 3 concurrent requests
    const promises = [
      dailyHoroscopeService.getDailyHoroscope('virgo'),
      dailyHoroscopeService.getDailyHoroscope('virgo'),
      dailyHoroscopeService.getDailyHoroscope('virgo')
    ];

    resolveProvider(sampleHoroscope);
    const results = await Promise.all(promises);

    expect(mockGetDailyHoroscope).toHaveBeenCalledTimes(1);
    expect(results[0]).toEqual(sampleHoroscope);
    expect(results[1]).toEqual(sampleHoroscope);
    expect(results[2]).toEqual(sampleHoroscope);
  });

  it('serves stale fallback if provider fails with RETRYABLE error but same-day cache exists', async () => {
    // 1. Initial successful fetch
    const mockGetDailyHoroscope = vi.spyOn(ApiNinjasHoroscopeProvider.prototype, 'getDailyHoroscope')
      .mockResolvedValueOnce(sampleHoroscope);
    await dailyHoroscopeService.getDailyHoroscope('virgo');

    // 2. Force a failure on second call by deleting cache and bypassing inflight, but since we can't easily mock cache bypass,
    // we just manipulate the service internal cache for testing
    const cacheMap = (dailyHoroscopeService as any).cache as Map<string, any>;
    const cachedEntry = cacheMap.get(`api-ninjas:virgo:2026-07-21`);
    
    // Setup provider to fail with retryable error
    mockGetDailyHoroscope.mockRejectedValueOnce(
      new ProviderError('api-ninjas', 'PROVIDER_TIMEOUT', 'Timeout')
    );
    
    // Call private fetchFromProvider directly to simulate a failure when same-day cache exists
    const result = await (dailyHoroscopeService as any).fetchFromProvider('virgo', '2026-07-21', `api-ninjas:virgo:2026-07-21`);

    expect(result.isStaleFallback).toBe(true);
    expect(result.warning).toBe("Today's horoscope is temporarily updating. Serving cached data.");
  });

  it('does NOT serve stale fallback for NON-RETRYABLE errors (e.g., AUTH_ERROR)', async () => {
    // 1. Initial successful fetch
    const mockGetDailyHoroscope = vi.spyOn(ApiNinjasHoroscopeProvider.prototype, 'getDailyHoroscope')
      .mockResolvedValueOnce(sampleHoroscope);
    await dailyHoroscopeService.getDailyHoroscope('virgo');

    // 2. Setup provider to fail with non-retryable error
    mockGetDailyHoroscope.mockRejectedValueOnce(
      new ProviderError('api-ninjas', 'PROVIDER_AUTH_ERROR', 'Auth failed')
    );
    
    let err: any;
    try {
      await (dailyHoroscopeService as any).fetchFromProvider('virgo', '2026-07-21', `api-ninjas:virgo:2026-07-21`);
    } catch (e) {
      err = e;
    }

    expect(err).toBeInstanceOf(ProviderError);
    expect(err.errorCode).toBe('PROVIDER_AUTH_ERROR');
  });

  it('throws 503 ProviderError if provider fails and no cache exists', async () => {
    const mockGetDailyHoroscope = vi.spyOn(ApiNinjasHoroscopeProvider.prototype, 'getDailyHoroscope')
      .mockRejectedValue(new ProviderError('api-ninjas', 'PROVIDER_UNAVAILABLE', 'Network error'));

    let err: any;
    try {
      await dailyHoroscopeService.getDailyHoroscope('virgo');
    } catch (e) {
      err = e;
    }

    expect(err).toBeInstanceOf(ProviderError);
    expect(err.errorCode).toBe('PROVIDER_UNAVAILABLE');
    expect(err.statusCode).toBe(503);
  });

  it('removes inflight entry after success', async () => {
    vi.spyOn(ApiNinjasHoroscopeProvider.prototype, 'getDailyHoroscope').mockResolvedValue(sampleHoroscope);
    await dailyHoroscopeService.getDailyHoroscope('virgo');
    
    const inflightMap = (dailyHoroscopeService as any).inflight as Map<string, any>;
    expect(inflightMap.size).toBe(0);
  });

  it('removes inflight entry after failure and does not permanently block later requests', async () => {
    const mockGetDailyHoroscope = vi.spyOn(ApiNinjasHoroscopeProvider.prototype, 'getDailyHoroscope')
      .mockRejectedValueOnce(new ProviderError('api-ninjas', 'PROVIDER_UNAVAILABLE', 'First fail'))
      .mockResolvedValueOnce(sampleHoroscope);
      
    // First request fails
    await expect(dailyHoroscopeService.getDailyHoroscope('virgo')).rejects.toThrow();
    
    const inflightMap = (dailyHoroscopeService as any).inflight as Map<string, any>;
    expect(inflightMap.size).toBe(0); // Removed after failure
    
    // Second request succeeds (does not block)
    const result = await dailyHoroscopeService.getDailyHoroscope('virgo');
    expect(result).toEqual(sampleHoroscope);
  });
});
