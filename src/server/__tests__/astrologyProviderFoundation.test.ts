import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ZODIAC_SIGNS } from '../types/astrologyProvider';
import { ProviderError } from '../errors/ProviderError';
import {
  zodiacSignSchema,
  kundliNovaCalcInputSchema,
  navamshaStandardBirthRequestSchema,
  apiNinjasHoroscopeResponseSchema,
  kundliNovaDailyHoroscopeSchema,
} from '../validation/astrologySchemas';
import {
  getAstrologyEnvStatus,
  validateNavamshaConfig,
  validateApiNinjasConfig,
} from '../config/astrologyEnv';

describe('Stage 1: Dual-Provider Foundation & Architecture', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Zodiac Signs & Domain Definitions', () => {
    it('contains all 12 standard zodiac signs', () => {
      expect(ZODIAC_SIGNS).toHaveLength(12);
      expect(ZODIAC_SIGNS).toContain('aries');
      expect(ZODIAC_SIGNS).toContain('virgo');
      expect(ZODIAC_SIGNS).toContain('pisces');
    });

    it('validates zodiac sign schema', () => {
      expect(zodiacSignSchema.safeParse('virgo').success).toBe(true);
      expect(zodiacSignSchema.safeParse('ophiuchus').success).toBe(false);
    });
  });

  describe('Zod Schema Validation', () => {
    it('validates KundliNovaCalcInput with IANA timezone', () => {
      const validPayload = {
        profileId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        name: 'Test User',
        dateOfBirth: '1995-08-20',
        timeOfBirth: '14:30:00',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
      };

      const result = kundliNovaCalcInputSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('fails invalid lat/lng in KundliNovaCalcInput', () => {
      const invalidPayload = {
        profileId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        name: 'Test User',
        dateOfBirth: '1995-08-20',
        timeOfBirth: '14:30:00',
        latitude: 120, // invalid (>90)
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
      };

      const result = kundliNovaCalcInputSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('validates Navamsha StandardBirthRequest with numeric UTC offset', () => {
      const validNavamshaPayload = {
        year: 1995,
        month: 8,
        date: 20,
        hours: 14,
        minutes: 30,
        seconds: 0,
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 5.5, // numeric offset
        settings: {
          ayanamsha: 'lahiri',
          node_type: 'mean',
          observation_point: 'topocentric',
          language: 'en',
        },
      };

      const result = navamshaStandardBirthRequestSchema.safeParse(validNavamshaPayload);
      expect(result.success).toBe(true);
    });

    it('validates API Ninjas Horoscope response schema', () => {
      const validResponse = {
        date: '2026-07-21',
        zodiac: 'virgo',
        horoscope: 'Analytical thinking brings clarity today.',
      };

      const result = apiNinjasHoroscopeResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.zodiac).toBe('virgo');
      }
    });

    it('validates normalized KundliNovaDailyHoroscope model', () => {
      const validNormalized = {
        schemaVersion: '1.0',
        provider: 'api-ninjas',
        providerVersion: 'v1',
        zodiacSign: 'virgo' as const,
        period: 'today' as const,
        date: '2026-07-21',
        overview: 'Analytical thinking brings clarity today.',
        generatedAt: '2026-07-21T10:00:00.000Z',
      };

      const result = kundliNovaDailyHoroscopeSchema.safeParse(validNormalized);
      expect(result.success).toBe(true);
    });
  });

  describe('Provider Error Mapping & Retry Logic', () => {
    it('correctly maps PROVIDER_BAD_REQUEST as non-retryable', () => {
      const err = new ProviderError('navamsha', 'PROVIDER_BAD_REQUEST', 'Invalid date parameter', 400);
      expect(err.statusCode).toBe(400);
      expect(err.errorCode).toBe('PROVIDER_BAD_REQUEST');
      expect(err.isRetryable()).toBe(false);
    });

    it('correctly maps PROVIDER_AUTH_ERROR as non-retryable', () => {
      const err = new ProviderError('api-ninjas', 'PROVIDER_AUTH_ERROR', 'Invalid API Key', 503);
      expect(err.errorCode).toBe('PROVIDER_AUTH_ERROR');
      expect(err.isRetryable()).toBe(false);
    });

    it('correctly maps PROVIDER_RATE_LIMITED as retryable with Retry-After header support', () => {
      const err = new ProviderError('api-ninjas', 'PROVIDER_RATE_LIMITED', 'Rate limit exceeded', 429, 30);
      expect(err.errorCode).toBe('PROVIDER_RATE_LIMITED');
      expect(err.retryAfterSeconds).toBe(30);
      expect(err.isRetryable()).toBe(true);
    });

    it('correctly maps PROVIDER_TIMEOUT as retryable', () => {
      const err = new ProviderError('navamsha', 'PROVIDER_TIMEOUT', 'Request timed out after 5000ms', 503);
      expect(err.errorCode).toBe('PROVIDER_TIMEOUT');
      expect(err.isRetryable()).toBe(true);
    });

    it('correctly maps PROVIDER_UNAVAILABLE as retryable', () => {
      const err = new ProviderError('navamsha', 'PROVIDER_UNAVAILABLE', 'Server 500 error', 503);
      expect(err.errorCode).toBe('PROVIDER_UNAVAILABLE');
      expect(err.isRetryable()).toBe(true);
    });

    it('correctly maps PROVIDER_BAD_RESPONSE as non-retryable', () => {
      const err = new ProviderError('api-ninjas', 'PROVIDER_BAD_RESPONSE', 'Malformed JSON response', 502);
      expect(err.errorCode).toBe('PROVIDER_BAD_RESPONSE');
      expect(err.isRetryable()).toBe(false);
    });
  });

  describe('Environment Validation Helpers', () => {
    it('detects missing provider keys cleanly', () => {
      delete process.env.NAVAMSHA_API_KEY;
      delete process.env.API_NINJAS_API_KEY;

      const status = getAstrologyEnvStatus();
      expect(status.hasNavamshaKey).toBe(false);
      expect(status.hasApiNinjasKey).toBe(false);

      expect(() => validateNavamshaConfig()).toThrow('NAVAMSHA_API_KEY is not configured');
      expect(() => validateApiNinjasConfig()).toThrow('API_NINJAS_API_KEY is not configured');
    });

    it('validates present provider keys cleanly', () => {
      process.env.NAVAMSHA_API_KEY = 'test_navamsha_key_123';
      process.env.API_NINJAS_API_KEY = 'test_ninjas_key_456';

      const status = getAstrologyEnvStatus();
      expect(status.hasNavamshaKey).toBe(true);
      expect(status.hasApiNinjasKey).toBe(true);
      expect(validateNavamshaConfig()).toBe('test_navamsha_key_123');
      expect(validateApiNinjasConfig()).toBe('test_ninjas_key_456');
    });
  });
});
