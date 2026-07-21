import {
  HoroscopeContentProvider,
  ZodiacSign,
  KundliNovaDailyHoroscope,
} from '../types/astrologyProvider';
import { ProviderError } from '../errors/ProviderError';
import {
  zodiacSignSchema,
  apiNinjasHoroscopeResponseSchema,
} from '../validation/astrologySchemas';

export interface ApiNinjasProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export class ApiNinjasHoroscopeProvider implements HoroscopeContentProvider {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config?: ApiNinjasProviderConfig) {
    this.baseUrl = config?.baseUrl || 'https://api.api-ninjas.com';
    this.timeoutMs = config?.timeoutMs || 5000;
  }

  private getApiKey(): string {
    const key = process.env.API_NINJAS_API_KEY?.trim();
    if (!key) {
      throw new ProviderError(
        'api-ninjas',
        'PROVIDER_NOT_CONFIGURED',
        'API_NINJAS_API_KEY is not configured in environment',
        503
      );
    }
    return key;
  }

  public async getDailyHoroscope(
    zodiac: ZodiacSign,
    _dateContext?: string
  ): Promise<KundliNovaDailyHoroscope> {
    // 1. Validate API Key presence first
    const apiKey = this.getApiKey();

    // 2. Validate zodiac sign strictly
    const validatedZodiac = zodiacSignSchema.parse(zodiac);

    // 3. Prepare HTTP request with AbortController timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      const url = `${this.baseUrl}/v1/horoscope?zodiac=${encodeURIComponent(validatedZodiac)}`;
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Api-Key': apiKey,
        },
        signal: controller.signal,
      });
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        throw new ProviderError(
          'api-ninjas',
          'PROVIDER_TIMEOUT',
          `Request timed out after ${this.timeoutMs}ms`,
          504
        );
      }
      throw new ProviderError(
        'api-ninjas',
        'PROVIDER_UNAVAILABLE',
        `Network error: ${err.message || 'Failed to reach API Ninjas API'}`,
        503
      );
    } finally {
      clearTimeout(timeoutId);
    }

    // 4. Handle HTTP Status Codes & Error Mapping
    if (!response.ok) {
      const status = response.status;
      let errorText = '';
      try {
        errorText = await response.text();
      } catch {
        // ignore
      }

      if (status === 400) {
        throw new ProviderError(
          'api-ninjas',
          'PROVIDER_BAD_REQUEST',
          `Invalid zodiac sign or query parameters: ${errorText || 'Bad request'}`,
          400
        );
      }

      if (status === 401 || status === 403) {
        throw new ProviderError(
          'api-ninjas',
          'PROVIDER_AUTH_ERROR',
          `Authentication failed with API Ninjas (${status})`,
          503
        );
      }

      if (status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;
        throw new ProviderError(
          'api-ninjas',
          'PROVIDER_RATE_LIMITED',
          'API Ninjas rate limit exceeded',
          503,
          isNaN(retrySeconds!) ? undefined : retrySeconds
        );
      }

      throw new ProviderError(
        'api-ninjas',
        'PROVIDER_UNAVAILABLE',
        `API Ninjas server error (${status}): ${errorText || 'Service unavailable'}`,
        503
      );
    }

    // 5. Parse and Validate Response JSON
    let responseData: unknown;
    try {
      responseData = await response.json();
    } catch {
      throw new ProviderError(
        'api-ninjas',
        'PROVIDER_BAD_RESPONSE',
        'Failed to parse API Ninjas response JSON',
        502
      );
    }

    const validatedResponse = apiNinjasHoroscopeResponseSchema.safeParse(responseData);
    if (!validatedResponse.success) {
      throw new ProviderError(
        'api-ninjas',
        'PROVIDER_BAD_RESPONSE',
        `API Ninjas response schema mismatch: ${validatedResponse.error.message}`,
        502
      );
    }

    // 6. Return Normalized Daily Horoscope Contract
    const data = validatedResponse.data;
    return {
      schemaVersion: '1.0',
      provider: 'api-ninjas',
      providerVersion: 'v1',
      zodiacSign: validatedZodiac,
      period: 'today',
      date: data.date || new Date().toISOString().split('T')[0],
      overview: data.horoscope,
      generatedAt: new Date().toISOString(),
    };
  }
}
