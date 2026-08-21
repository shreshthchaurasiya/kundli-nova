import { env } from './env';

export interface AstrologyEnvStatus {
  hasNavamshaKey: boolean;
  hasApiNinjasKey: boolean;
  navamshaKey?: string;
  apiNinjasKey?: string;
}

export function getAstrologyEnvStatus(): AstrologyEnvStatus {
  const navamshaKey = process.env.NAVAMSHA_API_KEY?.trim();
  const apiNinjasKey = process.env.API_NINJAS_API_KEY?.trim();

  return {
    hasNavamshaKey: Boolean(navamshaKey && navamshaKey.length > 0),
    hasApiNinjasKey: Boolean(apiNinjasKey && apiNinjasKey.length > 0),
    navamshaKey: navamshaKey || undefined,
    apiNinjasKey: apiNinjasKey || undefined,
  };
}

export function validateNavamshaConfig(): string {
  const status = getAstrologyEnvStatus();
  if (!status.hasNavamshaKey || !status.navamshaKey) {
    throw new Error('NAVAMSHA_API_KEY is not configured in server environment variables.');
  }
  return status.navamshaKey;
}

export function validateApiNinjasConfig(): string {
  const status = getAstrologyEnvStatus();
  if (!status.hasApiNinjasKey || !status.apiNinjasKey) {
    throw new Error('API_NINJAS_API_KEY is not configured in server environment variables.');
  }
  return status.apiNinjasKey;
}
