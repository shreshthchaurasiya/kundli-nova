import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '../errors/ApiError';
import { ensureSelfKundliProfile } from '../controllers/kundli';

const mockRpc = vi.fn();

vi.mock('../config/supabase', () => {
  return {
    supabaseAdmin: {
      auth: { getUser: vi.fn() },
    },
    createAuthClient: vi.fn(() => ({
      rpc: mockRpc,
    })),
  };
});

describe('ensureSelfKundliProfile controller', () => {
  let mockRes: any;
  let mockNext: any;
  const mockToken = 'mock-jwt-token';

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockRes = {
      json: vi.fn(),
    };
    mockNext = vi.fn();
  });

  it('returns 200 with data: null and reason: INCOMPLETE_BIRTH_DETAILS when RPC says so', async () => {
    mockRpc.mockResolvedValue({
      data: { profile: null, reason: 'INCOMPLETE_BIRTH_DETAILS' },
      error: null
    });

    const req = { token: mockToken } as any;
    await ensureSelfKundliProfile(req, mockRes, mockNext);

    expect(mockRpc).toHaveBeenCalledWith('ensure_self_kundli_profile');
    expect(mockRes.json).toHaveBeenCalledWith({
      status: 'success',
      data: null,
      reason: 'INCOMPLETE_BIRTH_DETAILS'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 200 with the profile and reason: EXISTING when RPC finds one', async () => {
    const fakeProfile = { id: 'p1', name: 'Test' };
    mockRpc.mockResolvedValue({
      data: { profile: fakeProfile, reason: 'EXISTING' },
      error: null
    });

    const req = { token: mockToken } as any;
    await ensureSelfKundliProfile(req, mockRes, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({
      status: 'success',
      data: fakeProfile,
      reason: 'EXISTING'
    });
  });

  it('returns 200 with the profile and reason: CREATED when RPC creates one', async () => {
    const fakeProfile = { id: 'p1', name: 'Test' };
    mockRpc.mockResolvedValue({
      data: { profile: fakeProfile, reason: 'CREATED' },
      error: null
    });

    const req = { token: mockToken } as any;
    await ensureSelfKundliProfile(req, mockRes, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({
      status: 'success',
      data: fakeProfile,
      reason: 'CREATED'
    });
  });

  it('passes error to next() when RPC fails (500 expected by error handler)', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Authentication required' }
    });

    const req = { token: mockToken } as any;
    await ensureSelfKundliProfile(req, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    const err = mockNext.mock.calls[0][0];
    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(500);
    expect(err.message).toContain('Sync failed');
  });
});
