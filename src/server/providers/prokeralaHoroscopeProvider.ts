import {
  HoroscopeContentProvider,
  ZodiacSign,
  KundliNovaDailyHoroscope,
} from '../types/astrologyProvider';
import { ProviderError } from '../errors/ProviderError';
import { zodiacSignSchema } from '../validation/astrologySchemas';

export interface ProkeralaProviderConfig {
  baseUrl?: string;
  timeoutMs?: number;
}

export class ProkeralaHoroscopeProvider implements HoroscopeContentProvider {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config?: ProkeralaProviderConfig) {
    this.baseUrl = config?.baseUrl || 'https://api.prokerala.com';
    this.timeoutMs = config?.timeoutMs || 8000;
  }

  private getCredentials() {
    const clientId = process.env.PROKERALA_CLIENT_ID?.trim();
    const clientSecret = process.env.PROKERALA_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
      throw new ProviderError(
        'prokerala',
        'PROVIDER_NOT_CONFIGURED',
        'PROKERALA_CLIENT_ID or PROKERALA_CLIENT_SECRET is missing in environment variables',
        503
      );
    }
    return { clientId, clientSecret };
  }

  private async fetchAccessToken(): Promise<string> {
    const { clientId, clientSecret } = this.getCredentials();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }).toString(),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Auth failed with status ${response.status}`);
      }

      const data = await response.json();
      if (!data.access_token) {
        throw new Error('No access_token in response');
      }

      // Pre-emptively expire token 60 seconds early
      const expiresIn = data.expires_in || 3600;
      this.tokenExpiresAt = Date.now() + (expiresIn - 60) * 1000;
      this.accessToken = data.access_token;
      return this.accessToken!;
    } catch (err: any) {
      throw new ProviderError(
        'prokerala',
        'PROVIDER_AUTH_ERROR',
        `Failed to authenticate with Prokerala: ${err.message}`,
        503
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async getValidToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }
    return await this.fetchAccessToken();
  }

  public async getDailyHoroscope(
    zodiac: ZodiacSign,
    dateContext?: string
  ): Promise<KundliNovaDailyHoroscope> {
    const validatedZodiac = zodiacSignSchema.parse(zodiac);
    const token = await this.getValidToken();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    // Default to current time in ISO8601, Prokerala expects timezone-aware datetime.
    const datetime = dateContext ? `${dateContext}T00:00:00+05:30` : new Date().toISOString();

    let response: Response;
    try {
      const url = `${this.baseUrl}/v2/horoscope/daily/advanced?sign=${encodeURIComponent(validatedZodiac)}&datetime=${encodeURIComponent(datetime)}&type=all`;
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        signal: controller.signal,
      });
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        throw new ProviderError('prokerala', 'PROVIDER_TIMEOUT', `Request timed out after ${this.timeoutMs}ms`, 504);
      }
      throw new ProviderError('prokerala', 'PROVIDER_UNAVAILABLE', `Network error: ${err.message}`, 503);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const status = response.status;
      if (status === 401) {
        // Token might have expired precisely during the request, force refresh on next call
        this.accessToken = null;
        throw new ProviderError('prokerala', 'PROVIDER_AUTH_ERROR', 'Prokerala authentication failed', 503);
      }
      throw new ProviderError('prokerala', 'PROVIDER_UNAVAILABLE', `Prokerala server error (${status})`, 503);
    }

    let responseData: any;
    try {
      responseData = await response.json();
    } catch {
      throw new ProviderError('prokerala', 'PROVIDER_BAD_RESPONSE', 'Failed to parse Prokerala JSON response', 502);
    }

    const predictionsArray = responseData?.data?.daily_predictions?.[0]?.predictions;
    if (!Array.isArray(predictionsArray) || predictionsArray.length === 0) {
      throw new ProviderError('prokerala', 'PROVIDER_BAD_RESPONSE', 'Could not extract predictions array from advanced Prokerala response', 502);
    }

    // Helper to unescape HTML entities
    const unescapeHtml = (text: string) => text
      .replace(/&#039;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();

    const categories: any = {};
    let overviewText = '';

    for (const item of predictionsArray) {
      const type = item.type?.toLowerCase();
      const rawPrediction = item.prediction || '';
      const text = unescapeHtml(rawPrediction);

      if (type === 'general') {
        overviewText = text;
      } else if (type === 'health') {
        categories.health = text;
      } else if (type === 'career' || type === 'profession') {
        categories.profession = text;
      } else if (type === 'love' || type === 'emotions') {
        categories.emotions = text;
      } else if (type === 'travel') {
        categories.travel = text;
      }
      // Note: mapping 'love' to 'emotions' or adding it to categories directly
      if (type === 'love') categories.personal = text;
    }

    return {
      schemaVersion: '1.0',
      provider: 'prokerala',
      providerVersion: 'v2',
      zodiacSign: validatedZodiac,
      period: 'today',
      date: dateContext || new Date().toISOString().split('T')[0],
      overview: overviewText,
      categories,
      generatedAt: new Date().toISOString(),
    };
  }
}
