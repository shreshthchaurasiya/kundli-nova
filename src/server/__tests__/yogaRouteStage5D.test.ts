import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { getYoga } from '../controllers/astrology';
import { NavamshaProvider } from '../providers/navamshaProvider';
import { supabaseAdmin } from '../config/supabase';

vi.mock('../config/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
  },
}));

describe('Stage 5D Route: GET /api/v1/astrology/yoga/:profileId', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());

    // Mock authentication middleware
    app.use((req: any, res, next) => {
      req.user = { id: 'user-123', email: 'test@example.com', role: 'user', created_at: '' };
      next();
    });

    (supabaseAdmin.from as any)().select().eq().maybeSingle.mockResolvedValue({
      data: {
        id: 'prof-1',
        owner_id: 'user-123',
        dob: '1990-01-01',
        tob: '12:00:00',
        latitude: 28.6,
        longitude: 77.2,
        timezone: 'Asia/Kolkata'
      },
      error: null
    });

    app.get('/api/v1/astrology/yoga/:profileId', getYoga);
  });

  it('rejects if profile does not belong to user', async () => {
    (supabaseAdmin.from as any)().select().eq().maybeSingle.mockResolvedValueOnce({
      data: { id: 'prof-1', owner_id: 'other-user' },
      error: null
    });

    const res = await request(app).get('/api/v1/astrology/yoga/prof-1');
    expect(res.status).toBe(403);
  });

  it('returns 503 PROVIDER_NOT_CONFIGURED from provider correctly', async () => {
    const res = await request(app).get('/api/v1/astrology/yoga/prof-1');
    
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('YOGA_SERVICE_NOT_CONFIGURED');
    expect(res.body.message).toBe('Yoga analysis will be available after the astrology service is configured.');
  });
});

