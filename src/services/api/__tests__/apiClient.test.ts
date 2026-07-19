import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../apiClient';
import { setTokenProvider } from '../authTokenProvider';
import { ApiError, NetworkError, TimeoutError } from '../apiErrors';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock UUID
vi.mock('uuid', () => ({
  v4: () => 'test-uuid-1234',
}));

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setTokenProvider(async () => 'mock-token');
  });

  it('attaches token and parses success envelope', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ status: 'success', data: { id: 1 } }),
    });

    const result = await ApiClient.get('http://api.test/data');
    
    expect(result).toEqual({ id: 1 });
    expect(mockFetch).toHaveBeenCalledWith('http://api.test/data', expect.objectContaining({
      headers: expect.any(Headers),
    }));

    const passedHeaders = mockFetch.mock.calls[0][1].headers as Headers;
    expect(passedHeaders.get('Authorization')).toBe('Bearer mock-token');
    expect(passedHeaders.get('X-Request-ID')).toBe('test-uuid-1234');
  });

  it('throws ApiError on validation failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ status: 'error', message: 'Validation failed', errors: ['bad field'] }),
    });

    const promise = ApiClient.post('http://api.test/submit');
    await expect(promise).rejects.toThrow(ApiError);
    await expect(promise).rejects.toMatchObject({
      statusCode: 400,
      message: 'Validation failed',
      details: ['bad field'],
    });
  });

  it('throws ApiError on unauthorized response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ status: 'error', message: 'Unauthorized' }),
    });

    await expect(ApiClient.get('http://api.test/protected')).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('throws NetworkError on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(ApiClient.get('http://api.test/data')).rejects.toThrow(NetworkError);
  });
});
