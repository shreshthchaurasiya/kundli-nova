import { ApiNinjasHoroscopeProvider } from '../providers/apiNinjasHoroscopeProvider';
import { KundliNovaDailyHoroscope, ZodiacSign, ZODIAC_SIGNS } from '../types/astrologyProvider';
import { ProviderError, ProviderErrorCode } from '../errors/ProviderError';

interface CacheEntry {
  data: KundliNovaDailyHoroscope;
  businessDate: string; // The date this data is valid for
}

export class DailyHoroscopeService {
  private cache: Map<string, CacheEntry> = new Map();
  private inflight: Map<string, Promise<KundliNovaDailyHoroscope>> = new Map();
  private provider: ApiNinjasHoroscopeProvider;
  
  // Cache for 24 hours
  private readonly CACHE_TTL_SECONDS = 24 * 60 * 60;

  constructor() {
    this.provider = new ApiNinjasHoroscopeProvider();
  }

  /**
   * Get current business date strictly in Asia/Kolkata timezone
   * Returns format: YYYY-MM-DD
   */
  public getBusinessDate(): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  }

  public async getDailyHoroscope(zodiac: ZodiacSign, targetDate?: string): Promise<KundliNovaDailyHoroscope> {
    if (!ZODIAC_SIGNS.includes(zodiac)) {
      throw new Error(`Invalid zodiac sign: ${zodiac}`);
    }

    const businessDate = targetDate || this.getBusinessDate();
    const cacheKey = `prokerala:${zodiac}:${businessDate}`;

    // 1. Check if we already have it in the cache for the requested date
    const existing = this.cache.get(cacheKey);
    if (existing && existing.businessDate === businessDate) {
      return existing.data;
    }

    // 2. Check if a request is already in flight for this exact key
    const existingPromise = this.inflight.get(cacheKey);
    if (existingPromise) {
      return existingPromise;
    }

    // 3. Create a new request and cache the promise
    const fetchPromise = this.fetchFromProvider(zodiac, businessDate, cacheKey);
    this.inflight.set(cacheKey, fetchPromise);

    try {
      const result = await fetchPromise;
      return result;
    } finally {
      this.inflight.delete(cacheKey);
    }
  }

  private async fetchFromProvider(zodiac: ZodiacSign, businessDate: string, cacheKey: string): Promise<KundliNovaDailyHoroscope> {
    try {
      const data = await this.provider.getDailyHoroscope(zodiac, businessDate);
      
      this.cache.set(cacheKey, { data, businessDate });
      return data;
    } catch (error) {
      // Only retryable provider errors (like timeouts, rate limits, 5xx) should trigger stale fallback
      // Critical errors like AUTH_ERROR or BAD_RESPONSE should NOT be hidden.
      const isRetryable = error instanceof ProviderError && error.isRetryable();

      if (isRetryable) {
        const existing = this.cache.get(cacheKey);
        if (existing && existing.businessDate === businessDate) {
          return {
            ...existing.data,
            isStaleFallback: true,
            warning: "Today's horoscope is temporarily updating. Serving cached data."
          };
        }
      }
      
      // If no same-day cache exists or error is not retryable, throw error
      if (error instanceof ProviderError) {
        throw error;
      }
      
      throw new ProviderError(
        'prokerala',
        'PROVIDER_UNAVAILABLE',
        `Horoscope provider unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // For testing purposes
  public clearCache() {
    this.cache.clear();
    this.inflight.clear();
  }
}

export const dailyHoroscopeService = new DailyHoroscopeService();
