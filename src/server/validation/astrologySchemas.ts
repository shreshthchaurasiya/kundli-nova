import { z } from 'zod';
import { ZODIAC_SIGNS } from '../types/astrologyProvider';

export const zodiacSignSchema = z.enum(ZODIAC_SIGNS);

export const kundliNovaCalcInputSchema = z.object({
  profileId: z.string().uuid(),
  name: z.string().min(1).max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD'),
  timeOfBirth: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Time of birth must be HH:MM or HH:MM:SS'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(1), // IANA timezone e.g. "Asia/Kolkata"
  ayanamsha: z.string().default('lahiri'),
});

// Schema for Navamsha's StandardBirthRequest format
export const navamshaStandardBirthRequestSchema = z.object({
  year: z.number().int().min(1800).max(2100),
  month: z.number().int().min(1).max(12),
  date: z.number().int().min(1).max(31),
  hours: z.number().int().min(0).max(23),
  minutes: z.number().int().min(0).max(59),
  seconds: z.number().int().min(0).max(59).default(0),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.number().min(-14).max(14), // UTC offset float e.g. 5.5
  settings: z.object({
    ayanamsha: z.string().default('lahiri'),
    node_type: z.enum(['mean', 'true']).default('mean'),
    observation_point: z.enum(['topocentric', 'geocentric']).default('topocentric'),
    language: z.string().default('en'),
  }).default(() => ({
    ayanamsha: 'lahiri',
    node_type: 'mean' as const,
    observation_point: 'topocentric' as const,
    language: 'en',
  })),
});

// Schema for API Ninjas GET /v1/horoscope response
export const apiNinjasHoroscopeResponseSchema = z.object({
  date: z.string(),
  sign: z.string().optional(),
  zodiac: z.string().optional(),
  horoscope: z.string().min(1),
}).transform(data => ({
  ...data,
  zodiac: data.zodiac || data.sign || 'unknown',
}));

// Schema for KundliNovaDailyHoroscope validation
export const kundliNovaDailyHoroscopeSchema = z.object({
  schemaVersion: z.literal('1.0'),
  provider: z.string().min(1),
  providerVersion: z.string().min(1),
  zodiacSign: zodiacSignSchema,
  period: z.literal('today'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  overview: z.string().min(1),
  generatedAt: z.string(),
  isStaleFallback: z.boolean().optional(),
  warning: z.string().optional(),
});
