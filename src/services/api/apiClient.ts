import { v4 as uuidv4 } from 'uuid';
import { ApiResponse, RequestOptions } from './apiTypes';
import { ApiError, NetworkError, TimeoutError } from './apiErrors';
import { getAccessToken } from './authTokenProvider';

const DEFAULT_TIMEOUT_MS = 30000;

export class ApiClient {
  static async request<T = any>(
    url: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { requiresAuth = true, params, body, ...fetchOptions } = options;

    let finalUrl = url;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      const qs = searchParams.toString();
      if (qs) {
        finalUrl += `?${qs}`;
      }
    }

    const headers = new Headers(fetchOptions.headers);
    headers.set('Content-Type', 'application/json');
    headers.set('X-Request-ID', uuidv4());

    if (requiresAuth) {
      const token = await getAccessToken();
      if (!token) {
        throw new ApiError(401, 'Authentication required', 'UNAUTHENTICATED');
      }
      headers.set('Authorization', `Bearer ${token}`);
    }

    const timeoutMs = (options as any).timeout || DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(finalUrl, {
        ...fetchOptions,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(id);

      const contentType = response.headers.get('content-type');
      let responseBody: ApiResponse = { status: 'error', message: 'Unknown error' };

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        let retryAfterMs = 5000;
        if (retryAfter) {
          if (!isNaN(Number(retryAfter))) {
            retryAfterMs = Number(retryAfter) * 1000;
          } else {
            const date = new Date(retryAfter);
            if (!isNaN(date.getTime())) {
              retryAfterMs = Math.max(0, date.getTime() - Date.now());
            }
          }
        }

        let errorMsg = 'Too many requests. Please try again later.';
        const text = await response.text();
        try {
          const body = JSON.parse(text);
          errorMsg = body.message || errorMsg;
        } catch {
          if (text && text.trim()) errorMsg = text.trim();
        }
        throw new ApiError(429, errorMsg, 'RATE_LIMITED', { retryAfterMs });
      }

      if (contentType && contentType.includes('application/json')) {
        responseBody = await response.json();
      } else {
        const text = await response.text();
        throw new ApiError(response.status, `Unexpected response format: ${text.substring(0, 100)}`, 'INVALID_FORMAT');
      }

      if (!response.ok || responseBody.status === 'error') {
        throw ApiError.fromResponse(response.status, responseBody);
      }

      return responseBody.data as T;
    } catch (error: any) {
      clearTimeout(id);

      if (error.name === 'AbortError') {
        // Suppress logging for intentional aborts
        throw new TimeoutError('Request was aborted');
      }

      console.error('API Client caught error:', error);

      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new NetworkError();
      }

      throw new ApiError(500, error.message || 'An unexpected client error occurred', 'INTERNAL_ERROR');
    }
  }

  static async get<T = any>(url: string, options?: Omit<RequestOptions, 'method'>) {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  static async post<T = any>(url: string, options?: Omit<RequestOptions, 'method'>) {
    return this.request<T>(url, { ...options, method: 'POST' });
  }

  static async patch<T = any>(url: string, options?: Omit<RequestOptions, 'method'>) {
    return this.request<T>(url, { ...options, method: 'PATCH' });
  }

  static async delete<T = any>(url: string, options?: Omit<RequestOptions, 'method'>) {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }
}
