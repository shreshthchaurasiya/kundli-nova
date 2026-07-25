import { supabaseAdmin } from '../config/supabase';
import { NavamshaProvider } from '../providers/navamshaProvider';
import { KundliNovaCalcInput } from '../types/astrologyProvider';
import { getUTCOffsetHours } from '../utils/timezoneHelper';
import { KundliNovaPanchang, KundliNovaCurrentDasha } from '../types/astrologyProvider';

export interface DailyAstrologyData {
  profileId: string;
  profileName: string;
  localDate: string;
  timezone: string;
  panchang: KundliNovaPanchang | null;
  currentDasha: KundliNovaCurrentDasha | null;
  generatedAt: string;
  dataStatus: 'complete' | 'partial';
  unavailableFields: string[];
  errors?: Array<{
    code: string;
    source: 'panchang' | 'currentDasha';
  }>;
}

// In-memory cache for development safety as requested in Step 8
// Cache key: kundli_profile_id_local_date_timezone_version
interface CacheEntry {
  data: DailyAstrologyData;
  expiresAt: number;
}
const memoryCache = new Map<string, CacheEntry>();
const inFlightAstrology = new Map<string, Promise<DailyAstrologyData>>();
const CACHE_VERSION = 'v1';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export class DailyAstrologyService {
  private navamsha: NavamshaProvider;

  constructor() {
    this.navamsha = new NavamshaProvider();
  }

  public async getDailyData(ownerId: string, profileId?: string): Promise<DailyAstrologyData> {
    // 1. Load canonical self profile.
    //    The kundli_profiles table uses: dob, tob, relation.
    //    No column named date_of_birth or time_of_birth exists.
    let query = supabaseAdmin
      .from('kundli_profiles')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('profile_scope', 'personal');

    if (profileId) {
      query = query.eq('id', profileId);
    } else {
      query = query.eq('relation', 'self');
    }

    const { data: profiles, error } = await query.order('created_at', { ascending: true }).limit(1);

    if (error || !profiles || profiles.length === 0) {
      throw new Error('SELF_PROFILE_NOT_FOUND');
    }

    const profile = profiles[0];

    // 2. Validate birth data using actual DB column names: dob, tob
    if (!profile.dob || !profile.tob) {
      throw new Error('INCOMPLETE_BIRTH_DATA');
    }
    if (profile.latitude === null || profile.longitude === null) {
      throw new Error('LOCATION_COORDINATES_MISSING');
    }
    if (!profile.timezone) {
      throw new Error('TIMEZONE_MISSING');
    }

    // 3. Determine profile-local current date
    const localDateObj = new Date();
    const tzOffset = getUTCOffsetHours(profile.timezone, profile.dob, profile.tob);
    const localTimeMs = localDateObj.getTime() + (tzOffset * 60 * 60 * 1000);
    const localDateStr = new Date(localTimeMs).toISOString().split('T')[0];

    const cacheKey = `${profile.id}_${localDateStr}_${profile.timezone}_${CACHE_VERSION}`;
    const cached = memoryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    if (inFlightAstrology.has(cacheKey)) {
      return inFlightAstrology.get(cacheKey)!;
    }

    const fetchPromise = (async () => {
      const input: KundliNovaCalcInput = {
        name: profile.name,
        profileId: profile.id,
        dateOfBirth: profile.dob,
        timeOfBirth: profile.tob,
        latitude: profile.latitude,
        longitude: profile.longitude,
        timezone: profile.timezone
      };

      let panchang: KundliNovaPanchang | null = null;
      let currentDasha: KundliNovaCurrentDasha | null = null;
      const unavailableFields: string[] = [];
      const errors: Array<{ code: string; source: 'panchang' | 'currentDasha' }> = [];

      // 4. Call providers
      try {
        panchang = await this.navamsha.getPanchang(input, localDateStr);
      } catch (err: any) {
        unavailableFields.push('panchang');
        errors.push({ code: 'PROVIDER_ERROR', source: 'panchang' });
      }

      try {
        currentDasha = await this.navamsha.getCurrentDasha(input);
      } catch (err: any) {
        unavailableFields.push('currentDasha');
        errors.push({ code: 'PROVIDER_ERROR', source: 'currentDasha' });
      }

      if (!panchang && !currentDasha) {
        throw new Error('PROVIDER_UNAVAILABLE');
      }

      const result: DailyAstrologyData = {
        profileId: profile.id,
        profileName: profile.name,
        localDate: localDateStr,
        timezone: profile.timezone,
        panchang,
        currentDasha,
        generatedAt: new Date().toISOString(),
        dataStatus: panchang && currentDasha ? 'complete' : 'partial',
        unavailableFields,
        errors: errors.length > 0 ? errors : undefined
      };

      // Only cache if not a total failure (already thrown), but partial results are cached 
      // with a shorter TTL for recovery, while complete gets normal TTL.
      // Wait, requirement: "do not cache partial results, or use a clearly documented short recovery TTL. Choose based on existing architecture and document the reason."
      // Since it's daily astrology data which doesn't change per minute, a short TTL of 5 mins for partial makes sense to allow recovery if provider was temporarily flaky.
      const isPartial = result.dataStatus === 'partial';
      const ttl = isPartial ? 5 * 60 * 1000 : CACHE_TTL_MS; // 5 mins for partial, 12 hrs for complete

      memoryCache.set(cacheKey, {
        data: result,
        expiresAt: Date.now() + ttl
      });
      return result;
    })();

    inFlightAstrology.set(cacheKey, fetchPromise);
    try {
      return await fetchPromise;
    } finally {
      inFlightAstrology.delete(cacheKey);
    }
  }
}

export const dailyAstrologyService = new DailyAstrologyService();
