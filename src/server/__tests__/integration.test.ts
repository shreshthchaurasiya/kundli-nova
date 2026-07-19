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
vi.mock('../config/supabase', () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

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

    it('POST /api/v1/wallet/recharge allows recharge and prevents duplicate (idempotency)', async () => {
      const token = mockValidToken();
      (supabaseAdmin.rpc as any).mockResolvedValue({ data: { balance: 250 }, error: null });

      // First request (Success)
      const res1 = await request(app)
        .post('/api/v1/wallet/recharge')
        .set('Authorization', token)
        .send({ amount: 100, title: 'Test', idempotencyKey: 'idemp-1' });

      expect(res1.status).toBe(200);

      // Second request with same key (Conflict)
      const res2 = await request(app)
        .post('/api/v1/wallet/recharge')
        .set('Authorization', token)
        .send({ amount: 100, title: 'Test', idempotencyKey: 'idemp-1' });

      expect(res2.status).toBe(409); // Idempotency conflict
    });

    it('POST /api/v1/wallet/recharge rejects unauthorized mutation', async () => {
      const res = await request(app)
        .post('/api/v1/wallet/recharge')
        .send({ amount: 100, title: 'Test', idempotencyKey: 'idemp-2' });

      expect(res.status).toBe(401); // Unauthorized
    });
  });

  describe('Consultation Endpoints', () => {
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
