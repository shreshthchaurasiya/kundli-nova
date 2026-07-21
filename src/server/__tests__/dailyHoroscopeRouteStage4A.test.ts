import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../app';
import { dailyHoroscopeService } from '../services/dailyHoroscopeService';
import { ApiNinjasHoroscopeProvider } from '../providers/apiNinjasHoroscopeProvider';

// Mock Auth Middleware
vi.mock('../middleware/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    if (req.headers.authorization) {
      req.user = { id: '11111111-1111-1111-1111-111111111111' };
      return next();
    }
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
}));

describe('Stage 4A: GET /api/v1/astrology/horoscope/daily', () => {
  const token = 'mock-valid-token';

  const sampleHoroscope = {
    schemaVersion: '1.0' as const,
    provider: 'api-ninjas',
    providerVersion: 'v1',
    zodiacSign: 'virgo' as const,
    period: 'today' as const,
    date: '2026-07-21',
    overview: 'Integration test overview.',
    generatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    dailyHoroscopeService.clearCache();
    vi.clearAllMocks();
  });

  it('returns 401 if not authenticated', async () => {
    const res = await request(app).get('/api/v1/astrology/horoscope/daily?zodiac=virgo');
    expect(res.status).toBe(401);
  });

  it('returns 400 if zodiac is missing', async () => {
    const res = await request(app)
      .get('/api/v1/astrology/horoscope/daily')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Zodiac sign is required/);
  });

  it('returns 400 if zodiac is invalid', async () => {
    const res = await request(app)
      .get('/api/v1/astrology/horoscope/daily?zodiac=invalid_sign')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid zodiac sign/);
  });

  it('returns 200 and the horoscope data on success', async () => {
    vi.spyOn(ApiNinjasHoroscopeProvider.prototype, 'getDailyHoroscope').mockResolvedValue(sampleHoroscope);

    const res = await request(app)
      .get('/api/v1/astrology/horoscope/daily?zodiac=Virgo') // test case insensitivity
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data).toEqual(sampleHoroscope);
  });

  it('returns 503 if provider throws PROVIDER_UNAVAILABLE', async () => {
    vi.spyOn(ApiNinjasHoroscopeProvider.prototype, 'getDailyHoroscope').mockRejectedValue(new Error('Network failure'));

    const res = await request(app)
      .get('/api/v1/astrology/horoscope/daily?zodiac=virgo')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toMatch(/PROVIDER_UNAVAILABLE/);
  });
});
