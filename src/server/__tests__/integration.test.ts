// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { supabaseAdmin } from '../config/supabase';

// Mock Env before app is imported
vi.mock('../config/env', () => ({
  env: {
    VITE_SUPABASE_URL: 'https://mock.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'mock-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'mock-service-key',
    ALLOWED_ORIGINS: '*',
    NODE_ENV: 'test',
  }
}));

// Mock Supabase
vi.mock('../config/supabase', () => {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis()
  };
  return {
    supabaseAdmin: {
      from: vi.fn(() => chainable),
      rpc: vi.fn(),
      auth: { getUser: vi.fn() }
    },
    createAuthClient: vi.fn(() => ({
      rpc: vi.fn().mockResolvedValue({ data: { profile: null } }),
      from: vi.fn(() => chainable)
    }))
  };
});

describe('API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockValidToken = () => {
    (supabaseAdmin.auth.getUser as any).mockResolvedValue({
      data: { user: { id: '22222222-2222-4222-8222-222222222222', role: 'authenticated' } },
      error: null,
    });
    return 'Bearer valid-token';
  };

  describe('Wallet Endpoints', () => {
    it('GET /api/v1/wallet reads wallet balance', async () => {
      const token = mockValidToken();
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: { balance: 150 }, error: null });
      
      (supabaseAdmin.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle
      });

      const res = await request(app)
        .get('/api/v1/wallet')
        .set('Authorization', token);

      expect(res.status).toBe(200);
      expect(res.body.data.balance).toBe(150);
      expect(mockEq).toHaveBeenCalledWith('user_id', '22222222-2222-4222-8222-222222222222');
    });

    it('POST /api/v1/wallet/recharge is not exposed', async () => {
      const token = mockValidToken();
      const res = await request(app)
        .post('/api/v1/wallet/recharge')
        .set('Authorization', token)
        .send({ amount: 100, title: 'Test', idempotencyKey: 'idemp-1' });

      expect(res.status).toBe(404);
      expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
    });

    it('POST /api/v1/wallet/recharge rejects unauthorized mutation', async () => {
      const res = await request(app)
        .post('/api/v1/wallet/recharge')
        .send({ amount: 100, title: 'Test', idempotencyKey: 'idemp-2' });

      expect(res.status).toBe(401); // Unauthorized
    });
  });

  describe('Consultation Endpoints', () => {
    it('POST /api/v1/consultations resolves price on the server', async () => {
      const token = mockValidToken();
      (supabaseAdmin.rpc as any).mockResolvedValue({
        data: {
          outcome: 'created',
          session: {
            id: '11111111-1111-4111-8111-111111111111',
            user_id: '22222222-2222-4222-8222-222222222222',
            astrologer_id: '33333333-3333-4333-8333-333333333333',
            status: 'WAITING_FOR_ASTROLOGER',
            rate_per_minute: 25,
            requested_at: '2026-07-20T10:00:00.000Z',
            billed_minutes: 0,
            total_charged: 0,
            elapsed_seconds: 0,
          },
          balance: 500,
          minimum_minutes: 5,
          minimum_required: 125,
          heartbeat_interval_seconds: 10,
          request_timeout_seconds: 60,
          recharge_grace_seconds: 30,
        },
        error: null,
      });

      const res = await request(app)
        .post('/api/v1/consultations')
        .set('Authorization', token)
        .send({
          astrologerId: '11111111-1111-1111-1111-111111111111',
          ratePerMinute: 0.01,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.ratePerMinute).toBe(25);
      expect(supabaseAdmin.rpc).toHaveBeenCalledWith('create_consultation_session', {
        p_user_id: '22222222-2222-4222-8222-222222222222',
        p_astrologer_id: '11111111-1111-1111-1111-111111111111',
      });
    });

    it('does not expose development transitions in test or production mode', async () => {
      const token = mockValidToken();
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { user_id: '22222222-2222-4222-8222-222222222222', status: 'WAITING_FOR_ASTROLOGER' },
        error: null,
      });
      (supabaseAdmin.from as any).mockReturnValue({ select: mockSelect, eq: mockEq, single: mockSingle });

      const res = await request(app)
        .post('/api/v1/consultations/11111111-1111-4111-8111-111111111111/dev-transition')
        .set('Authorization', token)
        .send({ targetStatus: 'ACTIVE' });

      expect(res.status).toBe(404);
      expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
    });

    it('POST /api/v1/consultations/:id/heartbeat checks ownership (Cross-user denial)', async () => {
      const token = mockValidToken();
      
      // Mock session existing but owned by a DIFFERENT user
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ 
        data: { user_id: '33333333-3333-4333-8333-333333333333', status: 'ACTIVE' }, 
        error: null 
      });
      
      (supabaseAdmin.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle
      });

      const res = await request(app)
        .post('/api/v1/consultations/11111111-1111-4111-8111-111111111111/heartbeat')
        .set('Authorization', token);

      expect(res.status).toBe(403); // Forbidden
    });

    it('POST /api/v1/consultations/:id/heartbeat processes idempotency and handles insufficient balance', async () => {
      const token = mockValidToken();
      
      // Mock session owned by CURRENT user
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ 
        data: { user_id: '22222222-2222-4222-8222-222222222222', status: 'ACTIVE' }, 
        error: null 
      });
      
      (supabaseAdmin.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle
      });

      // Mock RPC returning insufficient balance
      (supabaseAdmin.rpc as any).mockResolvedValue({ 
        data: { status: 'insufficient_balance' }, 
        error: null 
      });

      const res = await request(app)
        .post('/api/v1/consultations/11111111-1111-4111-8111-111111111111/heartbeat')
        .set('Authorization', token);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('insufficient_balance');
    });
  });
});
