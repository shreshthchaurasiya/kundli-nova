import { ApiError } from './ApiError';

export type ProviderErrorCode =
  | 'PROVIDER_BAD_REQUEST'
  | 'PROVIDER_AUTH_ERROR'
  | 'PROVIDER_RATE_LIMITED'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_BAD_RESPONSE'
  | 'PROVIDER_NOT_CONFIGURED';

const DEFAULT_STATUS_CODES: Record<ProviderErrorCode, number> = {
  PROVIDER_BAD_REQUEST: 400,
  PROVIDER_AUTH_ERROR: 503,
  PROVIDER_RATE_LIMITED: 503,
  PROVIDER_TIMEOUT: 504,
  PROVIDER_UNAVAILABLE: 503,
  PROVIDER_BAD_RESPONSE: 502,
  PROVIDER_NOT_CONFIGURED: 503,
};

export class ProviderError extends ApiError {
  public readonly provider: string;
  public readonly errorCode: ProviderErrorCode;
  public readonly retryAfterSeconds?: number;

  constructor(
    provider: string,
    errorCode: ProviderErrorCode,
    message: string,
    statusCode?: number,
    retryAfterSeconds?: number
  ) {
    const status = statusCode ?? DEFAULT_STATUS_CODES[errorCode] ?? 503;
    // Sanitize message to ensure API key is never leaked
    const sanitizedMessage = ProviderError.sanitize(message);
    super(status, `[${provider}] ${errorCode}: ${sanitizedMessage}`);
    this.name = 'ProviderError';
    this.provider = provider;
    this.errorCode = errorCode;
    this.retryAfterSeconds = retryAfterSeconds;
  }

  public isRetryable(): boolean {
    return (
      this.errorCode === 'PROVIDER_TIMEOUT' ||
      this.errorCode === 'PROVIDER_UNAVAILABLE' ||
      this.errorCode === 'PROVIDER_RATE_LIMITED'
    );
  }

  public static sanitize(input: string): string {
    if (!input) return '';
    // Redact potential API keys (alphanumeric strings >= 16 chars or bearer tokens or X-API-Key values)
    return input
      .replace(/(x-api-key|authorization|bearer|key|token)[=:\s]+[^\s,&"']+/gi, '$1=[REDACTED]')
      .replace(/([a-f0-9]{32,}|[A-Za-z0-9_-]{32,})/g, '[REDACTED_KEY]');
  }
}
