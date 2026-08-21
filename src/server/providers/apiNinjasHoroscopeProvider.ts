import {
  KundliNovaDailyHoroscope,
  ZodiacSign,
  ZODIAC_SIGNS,
} from '../types/astrologyProvider';
import { apiNinjasHoroscopeResponseSchema } from '../validation/astrologySchemas';
import { ProviderError } from '../errors/ProviderError';

export class ApiNinjasHoroscopeProvider {
  private readonly baseUrl = 'https://api.api-ninjas.com/v1/horoscope';
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.API_NINJAS_API_KEY || '';
    if (!this.apiKey) {
      throw new ProviderError('api-ninjas', 'PROVIDER_NOT_CONFIGURED', 'API_NINJAS_API_KEY is missing in environment', 503);
    }
  }

  public async getDailyHoroscope(
    zodiac: ZodiacSign,
    targetDate?: string
  ): Promise<KundliNovaDailyHoroscope> {
    if (!ZODIAC_SIGNS.includes(zodiac)) {
      throw new ProviderError('api-ninjas', 'PROVIDER_BAD_RESPONSE', `Invalid zodiac sign: ${zodiac}`, 400);
    }

    try {
      // API Ninjas currently only supports today's horoscope effectively via sign parameter
      const url = new URL(this.baseUrl);
      url.searchParams.append('zodiac', zodiac);

      const response = await fetch(url.toString(), {
        headers: {
          'X-Api-Key': this.apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Ninjas Error:', errorText);
        throw new Error(`API Ninjas returned status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const parsed = apiNinjasHoroscopeResponseSchema.parse(data);

      return {
        schemaVersion: '1.0',
        provider: 'api-ninjas',
        providerVersion: 'v1',
        zodiacSign: zodiac,
        period: 'today',
        date: parsed.date,
        overview: parsed.horoscope,
        generatedAt: new Date().toISOString()
      };
    } catch (error: any) {
      throw new ProviderError('api-ninjas', 'PROVIDER_UNAVAILABLE', `Horoscope fetch failed: ${error.message}`, 502);
    }
  }
}
