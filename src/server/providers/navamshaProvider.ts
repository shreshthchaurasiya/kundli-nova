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
  KundliNovaCurrentDasha,
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
  output: z.object({
    ascendant: navamshaPlanetOutputSchema,
    planets: z.record(z.string(), navamshaPlanetOutputSchema),
    reference_sign: z.string().optional(),
    julian_day_ut: z.number().optional(),
    utc_datetime: z.string().optional(),
    longitudes: z.record(z.string(), z.number()).optional(),
  }).passthrough(),
});

const ashtakootFactorSchema = z.object({
  score: z.number(),
  maximum: z.number(),
  source_rule: z.string().optional(),
}).passthrough();

export const navamshaCompatibilityResponseSchema = z.object({
  statusCode: z.number().optional(),
  output: z.object({
    total_score: z.number().optional(),
    effective_total_score: z.number().optional(),
    maximum_score: z.number(),
    breakdown: z.record(z.string(), ashtakootFactorSchema).optional(),
    effective_breakdown: z.record(z.string(), z.union([ashtakootFactorSchema, z.number()])).optional()
  }).passthrough()
});

export const navamshaManglikResponseSchema = z.object({
  statusCode: z.number().optional(),
  output: z.object({
    person_a: z.object({
      is_present: z.boolean(),
      cancellation: z.string().optional()
    }),
    person_b: z.object({
      is_present: z.boolean(),
      cancellation: z.string().optional()
    }),
    compatibility: z.string()
  })
});

function calculateSunTimesFallback(lat: number, lng: number, dateStr: string, tzOffset: number = 5.5): { sunrise: string; sunset: string } {
  try {
    const d = new Date(dateStr);
    const year = isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
    const month = isNaN(d.getTime()) ? new Date().getMonth() + 1 : d.getMonth() + 1;
    const day = isNaN(d.getTime()) ? new Date().getDate() : d.getDate();

    const dayOfYear = Math.floor((new Date(year, month - 1, day).getTime() - new Date(year, 0, 0).getTime()) / 86400000);
    const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * (Math.PI / 180));
    
    const latRad = lat * (Math.PI / 180);
    const decRad = declination * (Math.PI / 180);
    const cosH = (Math.sin(-0.833 * (Math.PI / 180)) - Math.sin(latRad) * Math.sin(decRad)) / (Math.cos(latRad) * Math.cos(decRad));
    
    let hourAngle = 90;
    if (cosH >= -1 && cosH <= 1) {
      hourAngle = Math.acos(cosH) * (180 / Math.PI);
    }
    
    const solarNoonHours = 12 - (lng / 15) + tzOffset;
    const sunriseHours = solarNoonHours - (hourAngle / 15);
    const sunsetHours = solarNoonHours + (hourAngle / 15);

    const pad = (n: number) => String(n).padStart(2, '0');
    const srH = Math.floor((sunriseHours + 24) % 24);
    const srM = Math.floor((((sunriseHours + 24) % 24) % 1) * 60);
    const ssH = Math.floor((sunsetHours + 24) % 24);
    const ssM = Math.floor((((sunsetHours + 24) % 24) % 1) * 60);

    const format12h = (h: number, m: number) => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${pad(h12)}:${pad(m)} ${ampm}`;
    };

    return {
      sunrise: format12h(srH, srM),
      sunset: format12h(ssH, ssM)
    };
  } catch {
    return { sunrise: '06:15 AM', sunset: '06:45 PM' };
  }
}

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

  private getProviderConfig(): { apiKey: string; baseUrl: string } {
    const apiKey = process.env.NAVAMSHA_API_KEY?.trim();
    const baseUrl = process.env.NAVAMSHA_API_BASE_URL?.trim();

    if (!apiKey || !baseUrl) {
      throw new ProviderError(
        'navamsha',
        'PROVIDER_NOT_CONFIGURED',
        'Navamsha API is not fully configured (missing key or base URL)',
        503
      );
    }
    return { apiKey, baseUrl };
  }

  private buildStandardBirthRequest(input: KundliNovaCalcInput) {
    const parsedInput = kundliNovaCalcInputSchema.parse(input);

    const utcOffset = getUTCOffsetHours(
      parsedInput.timezone,
      parsedInput.dateOfBirth,
      parsedInput.timeOfBirth
    );

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

    return navamshaStandardBirthRequestSchema.parse(rawPayload);
  }

  public async getNatalChart(input: KundliNovaCalcInput): Promise<KundliNovaNatalChart> {
    // 1. Check API configuration
    const { apiKey, baseUrl } = this.getProviderConfig();

    // 2. Validate input and construct Navamsha StandardBirthRequest payload
    const parsedInput = kundliNovaCalcInputSchema.parse(input);
    const validatedPayload = this.buildStandardBirthRequest(input);

    // 3. Execute HTTP Request with AbortController timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api/v1/kundali/basic`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
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

      if (status === 401 || status === 403) {
        throw new ProviderError(
          'navamsha',
          'PROVIDER_AUTH_ERROR',
          `Authentication failed with Navamsha API (${status})`,
          503
        );
      }

      if (status === 408) {
        throw new ProviderError(
          'navamsha',
          'PROVIDER_TIMEOUT',
          'Navamsha API request timed out',
          504
        );
      }

      if (status === 429) {
        throw new ProviderError(
          'navamsha',
          'PROVIDER_UNAVAILABLE',
          'Navamsha API rate limit exceeded',
          503
        );
      }

      if (status === 422 || status === 400) {
        throw new ProviderError(
          'navamsha',
          'PROVIDER_BAD_RESPONSE',
          'Invalid request payload or validation failed upstream',
          502
        );
      }

      throw new ProviderError(
        'navamsha',
        'PROVIDER_UNAVAILABLE',
        `Navamsha server error (${status})`,
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
    output: {
      ascendant: z.infer<typeof navamshaPlanetOutputSchema>;
      planets: Record<string, z.infer<typeof navamshaPlanetOutputSchema>>;
    }
  ): KundliNovaNatalChart {
    const planetsList: PlanetData[] = [];
    
    const asc = output.ascendant;
    const ascendantData = {
      sign: asc.zodiac_sign_name.toUpperCase(),
      degree: asc.fullDegree,
      nakshatra: asc.nakshatra_name,
    };
    
    let moonData: { sign: string; nakshatra: string; pada: number } | null = null;
    let sunSign = '';

    for (const [key, planet] of Object.entries(output.planets)) {
      const name = planet.localized_name || key;
      const signUpper = planet.zodiac_sign_name.toUpperCase();

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

  public async getVimshottariDasha(input: KundliNovaCalcInput): Promise<import('../types/astrologyProvider').KundliNovaVimshottariDasha> {
    const { apiKey, baseUrl } = this.getProviderConfig();
    const payload = this.buildStandardBirthRequest(input);
    const currentPayload = { ...payload, target: null };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const [timelineRes, currentRes] = await Promise.all([
        fetch(`${baseUrl}/api/v1/dasha/vimshottari`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }),
        fetch(`${baseUrl}/api/v1/dasha/current`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(currentPayload),
          signal: controller.signal,
        })
      ]);

      if (!timelineRes.ok) {
        throw new ProviderError('navamsha', 'PROVIDER_BAD_RESPONSE', `Failed to fetch dasha timeline: ${timelineRes.statusText}`, timelineRes.status);
      }
      if (!currentRes.ok) {
        throw new ProviderError('navamsha', 'PROVIDER_BAD_RESPONSE', `Failed to fetch current dasha: ${currentRes.statusText}`, currentRes.status);
      }

      const timelineData = await timelineRes.json();
      const currentData = await currentRes.json();

      const outTimeline = timelineData.output?.mahadashas || [];
      const outCurrent = currentData.output?.mahadasha;
      const outAntardasha = currentData.output?.antardasha;

      const timeline = outTimeline.map((m: any) => ({
        planet: m.lord,
        startDate: m.start,
        endDate: m.end,
        isCurrent: outCurrent?.lord === m.lord,
        remainingDays: outCurrent?.lord === m.lord ? outCurrent.duration_days : undefined,
      }));

      const currentMahadasha = {
        planet: outCurrent.lord,
        startDate: outCurrent.start,
        endDate: outCurrent.end,
        isCurrent: true,
        remainingDays: outCurrent.duration_days,
      };

      const currentAntardasha = outAntardasha ? {
        planet: outAntardasha.lord,
        startDate: outAntardasha.start,
        endDate: outAntardasha.end,
        isCurrent: true,
        remainingDays: outAntardasha.duration_days,
      } : null;

      return {
        schemaVersion: '1.0',
        provider: 'navamsha',
        providerVersion: 'v1',
        calculatedAt: new Date().toISOString(),
        currentMahadasha,
        currentAntardasha,
        mahadashaTimeline: timeline,
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new ProviderError('navamsha', 'PROVIDER_TIMEOUT', 'Request to Navamsha API timed out');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
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

  public async getPanchang(input: KundliNovaCalcInput, targetDateStr?: string): Promise<KundliNovaPanchang> {
    const { apiKey, baseUrl } = this.getProviderConfig();
    const parsedInput = kundliNovaCalcInputSchema.parse(input);
    
    let targetYear, targetMonth, targetDate, targetHours = 12, targetMinutes = 0, targetSeconds = 0;
    if (targetDateStr) {
      const dt = new Date(targetDateStr);
      if (!isNaN(dt.getTime())) {
         targetYear = dt.getFullYear();
         targetMonth = dt.getMonth() + 1;
         targetDate = dt.getDate();
         targetHours = dt.getHours();
         targetMinutes = dt.getMinutes();
         targetSeconds = dt.getSeconds();
      } else {
         const parts = targetDateStr.split('-');
         if (parts.length >= 3) {
            targetYear = parseInt(parts[0], 10);
            targetMonth = parseInt(parts[1], 10);
            targetDate = parseInt(parts[2], 10);
         }
      }
    } else {
      const now = new Date();
      targetYear = now.getFullYear();
      targetMonth = now.getMonth() + 1;
      targetDate = now.getDate();
      targetHours = now.getHours();
      targetMinutes = now.getMinutes();
    }

    const payload = {
      year: targetYear,
      month: targetMonth,
      date: targetDate,
      hours: targetHours,
      minutes: targetMinutes,
      seconds: targetSeconds,
      latitude: parsedInput.latitude,
      longitude: parsedInput.longitude,
      timezone: typeof parsedInput.timezone === 'number' ? parsedInput.timezone : 5.5
    };

    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    const fetchPanchang = async (endpoint: string) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const res = await fetch(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const [full, inauspicious, abhijit, choghadiya, hora, dishaShool] = await Promise.all([
      fetchPanchang('/api/v1/panchang/full'),
      fetchPanchang('/api/v1/panchang/inauspicious-periods'),
      fetchPanchang('/api/v1/panchang/abhijit-muhurat'),
      fetchPanchang('/api/v1/panchang/choghadiya'),
      fetchPanchang('/api/v1/panchang/hora'),
      fetchPanchang('/api/v1/panchang/disha-shool')
    ]);

    if (!full || !full.output) {
       throw new ProviderError('navamsha', 'PROVIDER_UNAVAILABLE', 'Primary Panchang data unavailable', 503);
    }

    const parseName = (item: any) => {
      if (!item) return null;
      if (typeof item === 'string') return item;
      return item.name || item.title || item.value || item.details?.name || null;
    };

    const parsePaksha = (item: any) => {
      if (!item) return null;
      if (typeof item === 'string') return null;
      return item.paksha || item.fortnight || null;
    };

    const parseTimeStr = (val: any): string | null => {
      if (!val) return null;
      if (typeof val === 'string') return val;
      if (typeof val === 'object') {
        return val.local_datetime || val.datetime || val.time || val.start || val.value || null;
      }
      return null;
    };

    const computedSun = calculateSunTimesFallback(payload.latitude, payload.longitude, targetDateStr || new Date().toISOString(), typeof payload.timezone === 'number' ? payload.timezone : 5.5);

    const rawSunrise = parseTimeStr(inauspicious?.output?.sunrise) 
      || parseTimeStr(full?.output?.sunrise) 
      || parseTimeStr(full?.output?.sun_rise) 
      || parseTimeStr(full?.output?.sun_rise_time) 
      || computedSun.sunrise;

    const rawSunset = parseTimeStr(inauspicious?.output?.sunset) 
      || parseTimeStr(full?.output?.sunset) 
      || parseTimeStr(full?.output?.sun_set) 
      || parseTimeStr(full?.output?.sun_set_time) 
      || computedSun.sunset;

    return {
      schemaVersion: '1.0',
      provider: 'navamsha',
      date: targetDateStr || new Date().toISOString(),
      timezone: String(payload.timezone),
      latitude: payload.latitude,
      longitude: payload.longitude,
      tithi: {
        name: parseName(full.output.tithi),
        paksha: parsePaksha(full.output.tithi),
        startTime: null,
        endTime: null
      },
      nakshatra: {
        name: parseName(full.output.nakshatra),
        pada: full.output.nakshatra?.pada || null,
        startTime: null,
        endTime: null
      },
      yoga: {
        name: parseName(full.output.yoga),
        startTime: null,
        endTime: null
      },
      karana: {
        name: parseName(full.output.karana),
        startTime: null,
        endTime: null
      },
      vara: parseName(full.output.weekday) || full.output.vara?.name || null,
      sunrise: rawSunrise,
      sunset: rawSunset,
      moonrise: null,
      moonset: null,
      rahuKaal: inauspicious?.output?.rahu_kaal ? {
        startTime: inauspicious.output.rahu_kaal.start,
        endTime: inauspicious.output.rahu_kaal.end
      } : null,
      abhijitMuhurat: abhijit?.output?.interval?.period?.[0] ? {
        startTime: abhijit.output.interval.period[0].start,
        endTime: abhijit.output.interval.period[0].end
      } : null,
      choghadiya: choghadiya?.output?.day ? choghadiya.output.day.map((c: any) => ({
        name: c.name,
        nature: null,
        startTime: c.start,
        endTime: c.end
      })) : [],
      hora: hora?.output?.day ? hora.output.day.map((h: any) => ({
        planet: h.lord,
        startTime: h.start,
        endTime: h.end
      })) : [],
      dishaShool: dishaShool?.output?.inauspicious_direction ? {
        direction: dishaShool.output.inauspicious_direction,
        remedy: null
      } : null,
      source: 'navamsha',
      calculatedAt: new Date().toISOString()
    };
  }

  public async getCurrentDasha(input: KundliNovaCalcInput, _targetDate?: string): Promise<KundliNovaCurrentDasha> {
    const { apiKey, baseUrl } = this.getProviderConfig();
    const payload = this.buildStandardBirthRequest(input);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api/v1/dasha/current`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ ...payload, target: null }),
        signal: controller.signal,
      });
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        throw new ProviderError('navamsha', 'PROVIDER_TIMEOUT', `Request timed out`, 504);
      }
      throw new ProviderError('navamsha', 'PROVIDER_UNAVAILABLE', `Network error: ${err.message}`, 503);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new ProviderError('navamsha', 'PROVIDER_UNAVAILABLE', `Navamsha error: ${response.status}`, 503);
    }

    const data = await response.json();
    return {
      mahadasha: data.output.mahadasha ? {
        planet: data.output.mahadasha.lord,
        startDate: data.output.mahadasha.start,
        endDate: data.output.mahadasha.end
      } : null,
      antardasha: data.output.antardasha ? {
        planet: data.output.antardasha.lord,
        startDate: data.output.antardasha.start,
        endDate: data.output.antardasha.end
      } : null,
      pratyantardasha: data.output.pratyantardasha ? {
        planet: data.output.pratyantardasha.lord,
        startDate: data.output.pratyantardasha.start,
        endDate: data.output.pratyantardasha.end
      } : null,
      asOf: new Date().toISOString(),
      source: 'navamsha'
    };
  }

  public async getMatching(_b: KundliNovaCalcInput, _g: KundliNovaCalcInput): Promise<KundliNovaMatchResult> {
    throw new Error('Method getMatching not implemented in Stage 2.');
  }

  public async getCompatibilityAnalysis(inputA: KundliNovaCalcInput, inputB: KundliNovaCalcInput): Promise<import('../types/astrologyProvider').KundliNovaCompatibilityAnalysis> {
    const { apiKey, baseUrl } = this.getProviderConfig();

    const bridePayload = this.buildStandardBirthRequest(inputA);
    const groomPayload = this.buildStandardBirthRequest(inputB);

    const requestPayload = {
      bride: bridePayload,
      groom: groomPayload
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api/v1/compatibility/ashtakoot/detailed`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestPayload),
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

    if (!response.ok) {
      const status = response.status;
      if (status === 401 || status === 403) throw new ProviderError('navamsha', 'PROVIDER_AUTH_ERROR', `Authentication failed with Navamsha API (${status})`, 503);
      if (status === 408) throw new ProviderError('navamsha', 'PROVIDER_TIMEOUT', 'Navamsha API request timed out', 504);
      if (status === 429) throw new ProviderError('navamsha', 'PROVIDER_UNAVAILABLE', 'Navamsha API rate limit exceeded', 503);
      if (status === 422 || status === 400) throw new ProviderError('navamsha', 'PROVIDER_BAD_RESPONSE', 'Invalid request payload or validation failed upstream', 502);
      throw new ProviderError('navamsha', 'PROVIDER_UNAVAILABLE', `Navamsha server error (${status})`, 503);
    }

    let responseData: unknown;
    try {
      responseData = await response.json();
    } catch {
      throw new ProviderError('navamsha', 'PROVIDER_BAD_RESPONSE', 'Failed to parse Navamsha response JSON', 502);
    }

    const validatedResponse = navamshaCompatibilityResponseSchema.safeParse(responseData);
    if (!validatedResponse.success) {
      throw new ProviderError(
        'navamsha',
        'PROVIDER_BAD_RESPONSE',
        `Navamsha response envelope schema mismatch: ${validatedResponse.error.message}`,
        502
      );
    }

    const out = validatedResponse.data.output;
    const totalScore = out.effective_total_score ?? out.total_score ?? 0;
    const maximumScore = out.maximum_score;
    const percentage = maximumScore > 0 ? (totalScore / maximumScore) * 100 : 0;

    const keys = [
      { id: 'varna', name: 'Varna' },
      { id: 'vashya', name: 'Vashya' },
      { id: 'tara', name: 'Tara' },
      { id: 'yoni', name: 'Yoni' },
      { id: 'graha_maitri', name: 'Graha Maitri' },
      { id: 'gana', name: 'Gana' },
      { id: 'bhakoot', name: 'Bhakoot' },
      { id: 'nadi', name: 'Nadi' },
    ];

    const factors: import('../types/astrologyProvider').AshtakootaFactor[] = keys.map(k => {
      // Prefer effective_breakdown when it contains the verified factor entries
      let factorData: any = out.effective_breakdown?.[k.id];
      // If it's just a number, we still need the source_rule and maximum from breakdown
      const fallbackData = out.breakdown?.[k.id];

      if (typeof factorData === 'number') {
        factorData = {
          score: factorData,
          maximum: fallbackData?.maximum ?? 0,
          source_rule: fallbackData?.source_rule
        };
      } else if (!factorData && fallbackData) {
        factorData = fallbackData;
      }

      return {
        code: k.id.toUpperCase() as import('../types/astrologyProvider').AshtakootaFactorCode,
        name: k.name,
        score: factorData?.score ?? 0,
        maximumScore: factorData?.maximum ?? 0,
        summary: factorData?.source_rule || '',
        calculationStatus: factorData ? 'calculated' : 'unavailable'
      };
    });

    return {
      schemaVersion: '1.0',
      provider: 'navamsha',
      providerVersion: 'v1',
      calculatedAt: new Date().toISOString(),
      profileAId: inputA.profileId,
      profileBId: inputB.profileId,
      totalScore,
      maximumScore,
      compatibilityPercentage: parseFloat(percentage.toFixed(2)),
      factors
    };
  }

  public async getManglikCompatibility(inputA: KundliNovaCalcInput, inputB: KundliNovaCalcInput): Promise<any> {
    const { apiKey, baseUrl } = this.getProviderConfig();

    const bridePayload = this.buildStandardBirthRequest(inputA);
    const groomPayload = this.buildStandardBirthRequest(inputB);

    const requestPayload = {
      person_a: bridePayload,
      person_b: groomPayload
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api/v1/compatibility/manglik`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestPayload),
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

    if (!response.ok) {
      const status = response.status;
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch {}
      console.error('NAVAMSHA ERROR BODY:', errorBody);

      if (status === 401 || status === 403) throw new ProviderError('navamsha', 'PROVIDER_AUTH_ERROR', `Authentication failed with Navamsha API (${status})`, 503);
      if (status === 408) throw new ProviderError('navamsha', 'PROVIDER_TIMEOUT', 'Navamsha API request timed out', 504);
      if (status === 429) throw new ProviderError('navamsha', 'PROVIDER_UNAVAILABLE', 'Navamsha API rate limit exceeded', 503);
      if (status === 422 || status === 400) throw new ProviderError('navamsha', 'PROVIDER_BAD_RESPONSE', 'Invalid request payload or validation failed upstream', 502);
      throw new ProviderError('navamsha', 'PROVIDER_UNAVAILABLE', `Navamsha server error (${status})`, 503);
    }

    let responseData: unknown;
    try {
      responseData = await response.json();
    } catch {
      throw new ProviderError('navamsha', 'PROVIDER_BAD_RESPONSE', 'Failed to parse Navamsha response JSON', 502);
    }

    const validatedResponse = navamshaManglikResponseSchema.safeParse(responseData);
    if (!validatedResponse.success) {
      throw new ProviderError(
        'navamsha',
        'PROVIDER_BAD_RESPONSE',
        `Navamsha manglik response envelope schema mismatch: ${validatedResponse.error.message}`,
        502
      );
    }

    const out = validatedResponse.data.output;

    return {
      schemaVersion: '1.0',
      provider: 'navamsha',
      providerVersion: 'v1',
      calculatedAt: new Date().toISOString(),
      profileAId: inputA.profileId,
      profileBId: inputB.profileId,
      profileAManglik: out.person_a.is_present,
      profileBManglik: out.person_b.is_present,
      profileACancellation: out.person_a.cancellation || 'not_evaluated',
      profileBCancellation: out.person_b.cancellation || 'not_evaluated',
      compatibility: out.compatibility
    };
  }

  async getDetailedKundliReport(input: KundliNovaCalcInput): Promise<any> {
    throw new ProviderError('navamsha', 'PROVIDER_NOT_CONFIGURED', 'Detailed Kundli Report calculation is not configured for the Navamsha provider yet.');
  }
}
