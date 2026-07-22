import {
  AstrologyCalculationProvider,
  KundliNovaCalcInput,
  KundliNovaNatalChart,
  PlanetData,
  HouseData,
  KundliNovaVimshottariDasha,
  KundliNovaDoshaResult,
  KundliNovaYogaResult,
  KundliNovaPanchang,
  KundliNovaMatchResult,
} from '../types/astrologyProvider';
import { ProviderError } from '../errors/ProviderError';
import {
  kundliNovaCalcInputSchema,
  navamshaStandardBirthRequestSchema,
} from '../validation/astrologySchemas';
import { getUTCOffsetHours } from '../utils/timezoneHelper';
import { z } from 'zod';

// Zod schema for Navamsha planet output object
export const navamshaPlanetOutputSchema = z.object({
  current_sign: z.number().optional(),
  fullDegree: z.number(),
  normDegree: z.number(),
  isRetro: z.union([z.boolean(), z.string()]).transform((val) => {
    if (typeof val === 'boolean') return val;
    return val.toLowerCase() === 'true' || val.toLowerCase() === 'yes';
  }),
  degrees: z.number().optional(),
  minutes: z.number().optional(),
  seconds: z.number().optional(),
  house_number: z.number().int().min(1).max(12),
  localized_name: z.string(),
  zodiac_sign_name: z.string(),
  zodiac_sign_lord: z.string(),
  nakshatra_number: z.number().optional(),
  nakshatra_name: z.string(),
  nakshatra_pada: z.number().int().min(1).max(4),
  nakshatra_vimsottari_lord: z.string().optional(),
});

// Response schema for Navamsha POST /api/v1/planets/extended or /api/v1/kundali/basic
export const navamshaPlanetsResponseSchema = z.object({
  statusCode: z.number().optional(),
  output: z.record(z.string(), navamshaPlanetOutputSchema),
});

export interface NavamshaProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export class NavamshaProvider implements AstrologyCalculationProvider {
  private static readonly ZODIAC_ORDER = [
    'ARIES',
    'TAURUS',
    'GEMINI',
    'CANCER',
    'LEO',
    'VIRGO',
    'LIBRA',
    'SCORPIO',
    'SAGITTARIUS',
    'CAPRICORN',
    'AQUARIUS',
    'PISCES',
  ];

  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config?: NavamshaProviderConfig) {
    this.baseUrl = config?.baseUrl || 'https://api.navamsha.in';
    this.timeoutMs = config?.timeoutMs || 5000;
  }

  private getApiKey(): string {
    const key = process.env.NAVAMSHA_API_KEY?.trim();
    if (!key) {
      throw new ProviderError(
        'navamsha',
        'PROVIDER_NOT_CONFIGURED',
        'NAVAMSHA_API_KEY is not configured in environment',
        503
      );
    }
    return key;
  }

  public async getNatalChart(input: KundliNovaCalcInput): Promise<KundliNovaNatalChart> {
    // 1. Check API Key configuration first
    const apiKey = this.getApiKey();

    if (process.env.NODE_ENV !== 'test') {
      throw new ProviderError(
        'navamsha',
        'PROVIDER_NOT_CONFIGURED',
        'Navamsha Natal Chart endpoint is not verified/configured yet.',
        503
      );
    }

    // 2. Validate input strictly against Zod schema
    const parsedInput = kundliNovaCalcInputSchema.parse(input);

    // 3. Compute numeric UTC offset from IANA timezone string
    const utcOffset = getUTCOffsetHours(
      parsedInput.timezone,
      parsedInput.dateOfBirth,
      parsedInput.timeOfBirth
    );

    // 4. Construct Navamsha StandardBirthRequest payload
    const [yearStr, monthStr, dateStr] = parsedInput.dateOfBirth.split('-');
    const [hoursStr, minutesStr, secondsStr] = parsedInput.timeOfBirth.split(':');

    const rawPayload = {
      year: parseInt(yearStr, 10),
      month: parseInt(monthStr, 10),
      date: parseInt(dateStr, 10),
      hours: parseInt(hoursStr, 10),
      minutes: parseInt(minutesStr, 10),
      seconds: secondsStr ? parseInt(secondsStr, 10) : 0,
      latitude: parsedInput.latitude,
      longitude: parsedInput.longitude,
      timezone: utcOffset,
      settings: {
        ayanamsha: parsedInput.ayanamsha || 'lahiri',
        node_type: 'mean' as const,
        observation_point: 'topocentric' as const,
        language: 'en',
      },
    };

    const validatedPayload = navamshaStandardBirthRequestSchema.parse(rawPayload);

    // 5. Execute HTTP Request with AbortController timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/v1/planets/extended`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(validatedPayload),
        signal: controller.signal,
      });
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        throw new ProviderError(
          'navamsha',
          'PROVIDER_TIMEOUT',
          `Request timed out after ${this.timeoutMs}ms`,
          504
        );
      }
      throw new ProviderError(
        'navamsha',
        'PROVIDER_UNAVAILABLE',
        `Network error: ${err.message || 'Failed to reach Navamsha API'}`,
        503
      );
    } finally {
      clearTimeout(timeoutId);
    }

    // 6. Handle HTTP Status Codes & Error Mapping
    if (!response.ok) {
      const status = response.status;
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch {
        // ignore body parse error
      }

      if (status === 400) {
        throw new ProviderError(
          'navamsha',
          'PROVIDER_BAD_REQUEST',
          `Bad request parameters: ${errorBody || 'Invalid payload'}`,
          400
        );
      }

      if (status === 401 || status === 403) {
        throw new ProviderError(
          'navamsha',
          'PROVIDER_AUTH_ERROR',
          `Authentication failed with Navamsha API (${status})`,
          503
        );
      }

      if (status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;
        throw new ProviderError(
          'navamsha',
          'PROVIDER_RATE_LIMITED',
          'Navamsha API rate limit exceeded',
          503,
          isNaN(retrySeconds!) ? undefined : retrySeconds
        );
      }

      throw new ProviderError(
        'navamsha',
        'PROVIDER_UNAVAILABLE',
        `Navamsha server error (${status}): ${errorBody || 'Service unavailable'}`,
        503
      );
    }

    // 7. Parse and Validate Response JSON
    let responseData: unknown;
    try {
      responseData = await response.json();
    } catch {
      throw new ProviderError(
        'navamsha',
        'PROVIDER_BAD_RESPONSE',
        'Failed to parse Navamsha response JSON',
        502
      );
    }

    const validatedResponse = navamshaPlanetsResponseSchema.safeParse(responseData);
    if (!validatedResponse.success) {
      throw new ProviderError(
        'navamsha',
        'PROVIDER_BAD_RESPONSE',
        `Navamsha response schema mismatch: ${validatedResponse.error.message}`,
        502
      );
    }

    // 8. Remap Raw Navamsha Data -> Normalized KundliNovaNatalChart
    return this.normalizeNatalChart(parsedInput, validatedResponse.data.output);
  }

  private normalizeNatalChart(
    input: KundliNovaCalcInput,
    output: Record<string, z.infer<typeof navamshaPlanetOutputSchema>>
  ): KundliNovaNatalChart {
    const planetsList: PlanetData[] = [];
    let ascendantData: { sign: string; degree: number; nakshatra: string } | null = null;
    let moonData: { sign: string; nakshatra: string; pada: number } | null = null;
    let sunSign = '';

    for (const [key, planet] of Object.entries(output)) {
      const name = planet.localized_name || key;
      const signUpper = planet.zodiac_sign_name.toUpperCase();

      if (name.toLowerCase() === 'ascendant' || key.toLowerCase() === 'ascendant') {
        ascendantData = {
          sign: signUpper,
          degree: planet.fullDegree,
          nakshatra: planet.nakshatra_name,
        };
      } else {
        planetsList.push({
          name,
          sign: signUpper,
          degreeInSign: planet.normDegree,
          degree: planet.fullDegree,
          house: planet.house_number,
          nakshatra: planet.nakshatra_name,
          pada: planet.nakshatra_pada,
          isRetrograde: planet.isRetro,
          signLord: planet.zodiac_sign_lord,
        });
      }

      if (name.toLowerCase() === 'moon' || key.toLowerCase() === 'moon') {
        moonData = {
          sign: signUpper,
          nakshatra: planet.nakshatra_name,
          pada: planet.nakshatra_pada,
        };
      }

      if (name.toLowerCase() === 'sun' || key.toLowerCase() === 'sun') {
        sunSign = signUpper;
      }
    }

    if (!ascendantData) {
      throw new ProviderError(
        'navamsha',
        'PROVIDER_BAD_RESPONSE',
        'Provider response missing Ascendant placement',
        502
      );
    }

    if (!moonData) {
      throw new ProviderError(
        'navamsha',
        'PROVIDER_BAD_RESPONSE',
        'Provider response missing Moon placement',
        502
      );
    }

    // Compute Whole-Sign Houses from Ascendant sign
    const ascSignIndex = NavamshaProvider.ZODIAC_ORDER.indexOf(ascendantData.sign);
    const houses: HouseData[] = Array.from({ length: 12 }, (_, i) => {
      const houseNum = i + 1;
      const signIndex = ascSignIndex >= 0 ? (ascSignIndex + i) % 12 : 0;
      const signName = NavamshaProvider.ZODIAC_ORDER[signIndex];
      return {
        number: houseNum,
        sign: signName,
        // degree omitted for derived whole-sign houses to avoid ambiguous values
      };
    });

    return {
      schemaVersion: '1.0',
      provider: 'navamsha',
      providerVersion: 'v1',
      houseSystem: 'whole-sign',
      calculatedAt: new Date().toISOString(),
      input,
      ascendant: ascendantData,
      planets: planetsList,
      houses,
      moonSign: moonData.sign,
      sunSign: sunSign || moonData.sign,
      nakshatra: moonData.nakshatra,
      pada: moonData.pada,
    };
  }

  // Stubs for future Stage 5 features
  public async getPlanets(input: KundliNovaCalcInput): Promise<PlanetData[]> {
    const chart = await this.getNatalChart(input);
    return chart.planets;
  }

  public async getVimshottariDasha(_input: KundliNovaCalcInput): Promise<import('../types/astrologyProvider').KundliNovaVimshottariDasha> {
    throw new ProviderError(
      'navamsha',
      'PROVIDER_NOT_CONFIGURED',
      'Navamsha Vimshottari Dasha endpoint is not verified/configured yet.',
      503
    );
  }

  public async getDoshas(_input: KundliNovaCalcInput): Promise<import('../types/astrologyProvider').LegacyKundliNovaDoshaResult> {
    throw new ProviderError(
      'navamsha',
      'PROVIDER_NOT_CONFIGURED',
      'Navamsha Dosha analysis endpoint is not verified/configured yet.',
      503
    );
  }

  public async getYogas(_input: KundliNovaCalcInput): Promise<import('../types/astrologyProvider').LegacyKundliNovaYogaResult> {
    throw new ProviderError(
      'navamsha',
      'PROVIDER_NOT_CONFIGURED',
      'Navamsha legacy Yoga endpoint is not verified/configured yet.',
      503
    );
  }

  public async getYogaAnalysis(_input: KundliNovaCalcInput): Promise<import('../types/astrologyProvider').KundliNovaYogaAnalysis> {
    throw new ProviderError(
      'navamsha',
      'PROVIDER_NOT_CONFIGURED',
      'Navamsha Yoga analysis endpoint is not verified/configured yet.',
      503
    );
  }

  public async getDoshaAnalysis(_input: KundliNovaCalcInput): Promise<import('../types/astrologyProvider').KundliNovaDoshaAnalysis> {
    throw new ProviderError(
      'navamsha',
      'PROVIDER_NOT_CONFIGURED',
      'Navamsha Dosha analysis endpoint is not verified/configured yet.',
      503
    );
  }



  public async getPanchang(_input: KundliNovaCalcInput): Promise<KundliNovaPanchang> {
    throw new Error('Method getPanchang not implemented in Stage 2.');
  }

  public async getMatching(_b: KundliNovaCalcInput, _g: KundliNovaCalcInput): Promise<KundliNovaMatchResult> {
    throw new Error('Method getMatching not implemented in Stage 2.');
  }

  public async getCompatibilityAnalysis(_inputA: KundliNovaCalcInput, _inputB: KundliNovaCalcInput): Promise<import('../types/astrologyProvider').KundliNovaCompatibilityAnalysis> {
    throw new ProviderError(
      'navamsha',
      'PROVIDER_NOT_CONFIGURED',
      'Navamsha Compatibility analysis endpoint is not verified/configured yet.'
    );
  }

  async getDetailedKundliReport(input: KundliNovaCalcInput): Promise<any> {
    throw new ProviderError('navamsha', 'PROVIDER_NOT_CONFIGURED', 'Detailed Kundli Report calculation is not configured for the Navamsha provider yet.');
  }
}
