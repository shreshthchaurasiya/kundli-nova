import { supabase } from '../lib/supabase';

export async function postAiRequest<T>(path: '/api/chat' | '/api/explain', body: unknown): Promise<T> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) throw new Error('Please sign in again to use Nova AI.');

  const maxRetries = 2;
  let attempt = 0;

  const configuredApiBase = (import.meta as any).env.VITE_API_BASE_URL as string | undefined;
  let baseUrl = '';
  if (configuredApiBase) {
    try {
      baseUrl = new URL(configuredApiBase).origin;
    } catch {
      baseUrl = configuredApiBase.replace(/\/api\/v1\/?$/, '');
    }
  }

  const finalUrl = `${baseUrl}${path}`;

  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 45_000);

    let payload: any = {};
    try {
      const response = await fetch(finalUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status >= 500 && attempt < maxRetries) {
          throw new Error('Server retry trigger');
        }
        throw new Error(payload?.error || 'Nova AI request failed.');
      }
      return payload as T;
    } catch (error: any) {
      console.error('[Nova AI] Request failed:', error, 'Attempt:', attempt, 'Payload:', payload);
      if ((error?.name === 'AbortError' || error.message === 'Server retry trigger' || error.message === 'Failed to fetch') && attempt < maxRetries) {
        attempt++;
        await new Promise(res => setTimeout(res, attempt * 2000));
        continue;
      }
      // If we exhaust retries or get a hard 4xx error:
      console.error('[Nova AI] Exhausted retries or hard error. Throwing fallback message.');
      throw new Error("I'm having trouble connecting to the stars right now. Please check your internet or try again in a few moments.");
    } finally {
      window.clearTimeout(timeout);
    }
  }
  throw new Error("I'm having trouble connecting to the stars right now. Please check your internet or try again in a few moments.");
}
