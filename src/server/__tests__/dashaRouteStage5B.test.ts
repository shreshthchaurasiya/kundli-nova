import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { getDasha } from '../controllers/astrology';
import { NavamshaProvider } from '../providers/navamshaProvider';
import { ProviderError } from '../errors/ProviderError';
import { supabaseAdmin } from '../config/supabase';
import { KundliNovaVimshottariDasha } from '../types/astrologyProvider';

vi.mock('../config/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
  },
}));

describe('Stage 5B Route: GET /api/v1/astrology/dasha/:profileId', () => {
  let app: express.Application;

  const validUserId = 'user-123';
  const mockProfile = {
    id: 'profile-123',
    owner_id: validUserId,
    name: 'John Doe',
    dob: '1990-01-01',
    tob: '12:00:00',
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: 'Asia/Kolkata',
  };

  const sampleDasha: KundliNovaVimshottariDasha = {
    schemaVersion: '1.0',
    provider: 'navamsha',
    providerVersion: 'v1',
    calculatedAt: '2026-07-22T00:00:00Z',
    currentMahadasha: {
      planet: 'Venus',
      startDate: '2020-01-01T00:00:00Z',
      endDate: '2040-01-01T00:00:00Z',
      isCurrent: true,
      remainingDays: 4900,
    },
    currentAntardasha: {
      planet: 'Jupiter',
      startDate: '2023-05-01T00:00:00Z',
      endDate: '2026-01-01T00:00:00Z',
      isCurrent: true,
      remainingDays: 0,
    },
    mahadashaTimeline: [
      {
        planet: 'Ketu',
        startDate: '2013-01-01T00:00:00Z',
        endDate: '2020-01-01T00:00:00Z',
        isCurrent: false,
      },
      {
        planet: 'Venus',
        startDate: '2020-01-01T00:00:00Z',
        endDate: '2040-01-01T00:00:00Z',
        isCurrent: true,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (supabaseAdmin.from as any)().select().eq().maybeSingle.mockResolvedValue({
      data: mockProfile,
      error: null,
    });

    app = express();
    app.use(express.json());
    
    // Auth Middleware mock
    app.use((req: any, res, next) => {
      if (req.headers.authorization === 'Bearer valid-token') {
        req.user = { id: validUserId };
        return next();
      }
      return res.status(401).json({ status: 'error', code: 'UNAUTHORIZED', message: 'Unauthorized access' });
    });

    app.get('/api/v1/astrology/dasha/:profileId', getDasha);
  });

  it('unauthenticated request returns 401 and provider is not called', async () => {
    const spy = vi.spyOn(NavamshaProvider.prototype, 'getVimshottariDasha');
    const res = await request(app).get('/api/v1/astrology/dasha/profile-unauth');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
    expect(spy).not.toHaveBeenCalled();
  });

  it('missing profile returns 404', async () => {
    (supabaseAdmin.from as any)().select().eq().maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const res = await request(app)
      .get('/api/v1/astrology/dasha/non-existent-profile')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('PROFILE_NOT_FOUND');
  });

  it('profile belonging to another user returns 403', async () => {
    (supabaseAdmin.from as any)().select().eq().maybeSingle.mockResolvedValueOnce({
      data: { ...mockProfile, id: 'profile-other-owner', owner_id: 'other-user-456' },
      error: null,
    });

    const res = await request(app)
      .get('/api/v1/astrology/dasha/profile-other-owner')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PROFILE_BELONGS_TO_ANOTHER_USER');
  });

  it('profile with incomplete birth details returns 400', async () => {
    (supabaseAdmin.from as any)().select().eq().maybeSingle.mockResolvedValueOnce({
      data: { ...mockProfile, id: 'profile-incomplete', latitude: null },
      error: null,
    });

    const res = await request(app)
      .get('/api/v1/astrology/dasha/profile-incomplete')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INCOMPLETE_BIRTH_DETAILS');
  });

  it('returns 200 and normalized Dasha data on success', async () => {
    (supabaseAdmin.from as any)().select().eq().maybeSingle.mockResolvedValue({
      data: { ...mockProfile, id: 'profile-success' },
      error: null,
    });
    vi.spyOn(NavamshaProvider.prototype, 'getVimshottariDasha').mockResolvedValue(sampleDasha);

    const res = await request(app)
      .get('/api/v1/astrology/dasha/profile-success')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data).toEqual(sampleDasha);
  });

  it('maps PROVIDER_NOT_CONFIGURED to 503 DASHA_SERVICE_NOT_CONFIGURED', async () => {
    (supabaseAdmin.from as any)().select().eq().maybeSingle.mockResolvedValue({
      data: { ...mockProfile, id: 'profile-not-config' },
      error: null,
    });
    vi.spyOn(NavamshaProvider.prototype, 'getVimshottariDasha').mockRejectedValue(
      new ProviderError('navamsha', 'PROVIDER_NOT_CONFIGURED', 'Navamsha API key not configured', 503)
    );

    const res = await request(app)
      .get('/api/v1/astrology/dasha/profile-not-config')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(503);
    expect(res.body.code).toBe('DASHA_SERVICE_NOT_CONFIGURED');
    expect(res.body.message).not.toContain('Navamsha API key');
  });

  it('maps PROVIDER_TIMEOUT / PROVIDER_UNAVAILABLE / PROVIDER_RATE_LIMITED to 503 DASHA_TEMPORARILY_UNAVAILABLE', async () => {
    (supabaseAdmin.from as any)().select().eq().maybeSingle.mockResolvedValue({
      data: { ...mockProfile, id: 'profile-timeout' },
      error: null,
    });
    vi.spyOn(NavamshaProvider.prototype, 'getVimshottariDasha').mockRejectedValue(
      new ProviderError('navamsha', 'PROVIDER_TIMEOUT', 'Upstream timed out at https://api.navamsha.com/secret-key', 504)
    );

    const res = await request(app)
      .get('/api/v1/astrology/dasha/profile-timeout')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(503);
    expect(res.body.code).toBe('DASHA_TEMPORARILY_UNAVAILABLE');
    expect(res.body.message).not.toContain('https://api.navamsha.com');
    expect(res.body.message).not.toContain('secret-key');
  });

  it('maps PROVIDER_BAD_RESPONSE to 502 DASHA_CALCULATION_FAILED', async () => {
    (supabaseAdmin.from as any)().select().eq().maybeSingle.mockResolvedValue({
      data: { ...mockProfile, id: 'profile-bad-resp' },
      error: null,
    });
    vi.spyOn(NavamshaProvider.prototype, 'getVimshottariDasha').mockRejectedValue(
      new ProviderError('navamsha', 'PROVIDER_BAD_RESPONSE', 'Malformed JSON payload from provider', 502)
    );

    const res = await request(app)
      .get('/api/v1/astrology/dasha/profile-bad-resp')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(502);
    expect(res.body.code).toBe('DASHA_CALCULATION_FAILED');
  });
});
