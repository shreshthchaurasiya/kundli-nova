// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuth } from '../middleware/auth';
import { ApiError } from '../errors/ApiError';
import { supabaseAdmin } from '../config/supabase';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';

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

describe('Auth Middleware', () => {
  let req: Partial<AuthenticatedRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = { headers: {} };
    res = {};
    next = vi.fn();
    vi.clearAllMocks();
  });

  it('throws ApiError 401 if authorization header is missing', async () => {
    await requireAuth(req as AuthenticatedRequest, res as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect((next as any).mock.calls[0][0].statusCode).toBe(401);
  });

  it('throws ApiError 401 if token format is invalid', async () => {
    req.headers!.authorization = 'InvalidFormat token123';
    await requireAuth(req as AuthenticatedRequest, res as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
  });

  it('attaches user to req and calls next if token is valid', async () => {
    req.headers!.authorization = 'Bearer valid-token';
    const mockUser = { id: 'uuid-123', role: 'authenticated' };
    
    (supabaseAdmin.auth.getUser as any).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    await requireAuth(req as AuthenticatedRequest, res as Response, next);
    
    expect(req.user).toEqual(mockUser);
    expect(req.token).toBe('valid-token');
    expect(next).toHaveBeenCalledWith(); // called with no arguments
  });
});
