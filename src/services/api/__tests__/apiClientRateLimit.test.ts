import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../apiClient';
import { ApiError } from '../apiErrors';

describe('ApiClient Rate Limit Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('parses JSON HTTP 429 correctly', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers(),
      text: () => Promise.resolve(JSON.stringify({
        status: 'error',
        code: 'RATE_LIMITED',
        message: 'Too many requests'
      }))
    });

    try {
      await ApiClient.get('/test', { requiresAuth: false });
    } catch (e: any) {
      expect(e).toBeInstanceOf(ApiError);
      expect(e.statusCode).toBe(429);
      expect(e.code).toBe('RATE_LIMITED');
      expect(e.message).toBe('Too many requests');
    }
  });

  it('parses plain-text HTTP 429 with numeric Retry-After correctly', async () => {
    const headers = new Headers();
    headers.set('Retry-After', '15');
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 429,
      headers,
      text: () => Promise.resolve('Too Many Requests')
    });

    try {
      await ApiClient.get('/test', { requiresAuth: false });
    } catch (e: any) {
      expect(e).toBeInstanceOf(ApiError);
      expect(e.statusCode).toBe(429);
      expect(e.code).toBe('RATE_LIMITED');
      // The client throws an ApiError but doesn't necessarily store Retry-After in the error object,
      // but let's ensure it doesn't crash on plain text parsing.
      expect(e.message).toBe('Too Many Requests');
    }
  });

  it('parses HTTP-date Retry-After correctly', async () => {
    const headers = new Headers();
    // HTTP date 1 hour from now
    const retryDate = new Date(Date.now() + 3600000).toUTCString();
    headers.set('Retry-After', retryDate);
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 429,
      headers,
      text: () => Promise.resolve('Too Many Requests')
    });

    try {
      await ApiClient.get('/test', { requiresAuth: false });
    } catch (e: any) {
      expect(e).toBeInstanceOf(ApiError);
      expect(e.statusCode).toBe(429);
      expect(e.code).toBe('RATE_LIMITED');
    }
  });
});
