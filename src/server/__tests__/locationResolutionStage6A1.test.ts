import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { ApiNinjasLocationResolver } from '../providers/apiNinjasLocationResolver';
import { supabaseAdmin } from '../config/supabase';
import { env } from '../config/env';

// Mock dependencies
const mockDbFrom = vi.hoisted(() => ({
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
}));

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
      rpc: vi.fn()
    }
  };
});

vi.mock('../middleware/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { id: 'mock-user-id' };
    next();
  }
}));

describe('Stage 6A.1: Kundli Profile Location Enrichment', () => {
  const mockFetch = vi.fn();
  global.fetch = mockFetch;

  beforeEach(() => {
    vi.clearAllMocks();
    env.API_NINJAS_API_KEY = 'mock-key';
  });

  describe('ApiNinjasLocationResolver', () => {
    const resolver = new ApiNinjasLocationResolver();

    it('resolves successful India location', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ name: 'Mumbai', state: 'Maharashtra', latitude: 18.9, longitude: 72.8, country: 'IN' }]
      });

      const result = await resolver.resolve({ city: 'Mumbai', state: 'Maharashtra', country: 'India' });
      expect(result).toEqual({ latitude: 18.9, longitude: 72.8, timezone: 'Asia/Kolkata' });
    });

    it('rejects city/state mismatch (ambiguous/unmatched state)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ name: 'Mumbai', state: 'Other State', latitude: 18.9, longitude: 72.8, country: 'IN' }]
      });

      await expect(resolver.resolve({ city: 'Mumbai', state: 'Maharashtra', country: 'India' }))
        .rejects.toThrow('Could not uniquely resolve location');
    });

    it('rejects empty provider result', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      await expect(resolver.resolve({ city: 'InvalidCity', state: 'Maharashtra', country: 'India' }))
        .rejects.toThrow('Please verify your city and state');
    });

    it('handles provider timeout/unavailable result', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Timeout'));

      await expect(resolver.resolve({ city: 'Mumbai', state: 'Maharashtra', country: 'India' }))
        .rejects.toThrow('Location service temporarily unavailable');
    });
  });

  describe('Profile Create / Update Flow', () => {
    it('profile create saves coordinates and timezone', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ name: 'Mumbai', state: 'Maharashtra', latitude: 18.9, longitude: 72.8, country: 'IN' }]
      });
      mockDbFrom.maybeSingle.mockResolvedValueOnce({ data: { id: 'mock', latitude: 18.9 } });

      const res = await request(app)
        .post('/api/v1/kundli-profiles')
        .send({
          name: 'Test', relation: 'self', gender: 'male',
          dob: '1990-01-01', tob: '10:00',
          birth_state: 'Maharashtra', birth_district: 'Mumbai', birth_city: 'Mumbai'
        });

      expect(res.status).toBe(200);
      expect(mockDbFrom.insert).toHaveBeenCalledWith(
        expect.objectContaining({ latitude: 18.9, longitude: 72.8, timezone: 'Asia/Kolkata' })
      );
    });

    it('profile update repairs an existing incomplete profile', async () => {
      mockDbFrom.maybeSingle
        .mockResolvedValueOnce({ data: { id: 'mock', birth_city: 'Pune', birth_state: 'Maharashtra', latitude: null } });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ name: 'Pune', state: 'Maharashtra', latitude: 18.5, longitude: 73.8, country: 'IN' }]
      });

      mockDbFrom.maybeSingle.mockResolvedValueOnce({ data: { id: 'mock' } });

      const res = await request(app)
        .patch('/api/v1/kundli-profiles/mock')
        .send({ name: 'Updated Name', birth_city: 'Pune', birth_state: 'Maharashtra' });

      expect(res.status).toBe(200);
      expect(mockDbFrom.update).toHaveBeenCalledWith(
        expect.objectContaining({ latitude: 18.5, longitude: 73.8, timezone: 'Asia/Kolkata' })
      );
    });

    it('failed geocoding does not partially update profile', async () => {
      // If geocoding fails, it should throw BEFORE hitting the DB update
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      const res = await request(app)
        .post('/api/v1/kundli-profiles')
        .send({
          name: 'Test', relation: 'self', gender: 'male',
          dob: '1990-01-01', tob: '10:00',
          birth_state: 'Maharashtra', birth_district: 'InvalidCity', birth_city: 'InvalidCity'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Please verify your city and state');
      expect(mockDbFrom.insert).not.toHaveBeenCalled();
    });
  });
});
