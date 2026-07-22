import { AstrologyCalculationProvider, KundliNovaCalcInput, KundliNovaNatalChart, KundliNovaVimshottariDasha } from '../types/astrologyProvider';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase';

export class KundliCalculationService {
  private natalCache = new Map<string, KundliNovaNatalChart>();
  private natalInflight = new Map<string, Promise<KundliNovaNatalChart>>();

  private dashaCache = new Map<string, KundliNovaVimshottariDasha>();
  private dashaInflight = new Map<string, Promise<KundliNovaVimshottariDasha>>();
  
  constructor(private provider: AstrologyCalculationProvider) {}

  private async loadAuthorizedCalculationInput(profileId: string, userId: string): Promise<KundliNovaCalcInput> {
    const { data: profile, error } = await supabaseAdmin
      .from('kundli_profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle();

    if (error) throw error;
    if (!profile) {
      throw { statusCode: 404, code: 'PROFILE_NOT_FOUND', message: 'Kundli profile not found' };
    }
    if (profile.owner_id !== userId) {
      throw { statusCode: 403, code: 'PROFILE_BELONGS_TO_ANOTHER_USER', message: 'Forbidden: Profile belongs to another user' };
    }

    const input: KundliNovaCalcInput = {
      profileId: profile.id,
      name: profile.name,
      dateOfBirth: profile.dob,
      timeOfBirth: profile.tob,
      latitude: profile.latitude,
      longitude: profile.longitude,
      timezone: profile.timezone,
    };

    if (
      !input.dateOfBirth ||
      !input.timeOfBirth ||
      input.latitude == null ||
      input.longitude == null ||
      !input.timezone
    ) {
      throw {
        statusCode: 400,
        code: 'INCOMPLETE_BIRTH_DETAILS',
        message: 'Complete birth details are required to generate this Kundli.'
      };
    }

    return input;
  }

  private createFingerprint(input: KundliNovaCalcInput): string {
    const data = `${input.dateOfBirth}|${input.timeOfBirth}|${input.latitude}|${input.longitude}|${input.timezone}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  public async getKundli(profileId: string, userId: string): Promise<KundliNovaNatalChart> {
    const input = await this.loadAuthorizedCalculationInput(profileId, userId);
    const fingerprint = this.createFingerprint(input);
    const cacheKey = `navamsha:v1:${input.profileId}:${fingerprint}`;

    if (this.natalCache.has(cacheKey)) return this.natalCache.get(cacheKey)!;
    if (this.natalInflight.has(cacheKey)) return this.natalInflight.get(cacheKey)!;

    const promise = this.provider.getNatalChart(input)
      .then(chart => {
        this.natalCache.set(cacheKey, chart);
        return chart;
      })
      .finally(() => this.natalInflight.delete(cacheKey));

    this.natalInflight.set(cacheKey, promise);
    return promise;
  }

  public async getVimshottariDasha(profileId: string, userId: string): Promise<KundliNovaVimshottariDasha> {
    const input = await this.loadAuthorizedCalculationInput(profileId, userId);
    const fingerprint = this.createFingerprint(input);
    const cacheKey = `vimshottari-dasha:navamsha:v1:${input.profileId}:${fingerprint}`;

    if (this.dashaCache.has(cacheKey)) return this.dashaCache.get(cacheKey)!;
    if (this.dashaInflight.has(cacheKey)) return this.dashaInflight.get(cacheKey)!;

    const promise = this.provider.getVimshottariDasha(input)
      .then(dasha => {
        // Business Rule: Calculate remaining days based on current server time
        // Clamp to 0 if the period has already ended or date is malformed
        const now = new Date();
        const calcRemaining = (endDateStr: string) => {
          const end = new Date(endDateStr);
          if (isNaN(end.getTime())) return 0;
          const diffMs = end.getTime() - now.getTime();
          const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          return Math.max(0, days);
        };

        if (dasha.currentMahadasha?.endDate) {
          dasha.currentMahadasha.remainingDays = calcRemaining(dasha.currentMahadasha.endDate);
        }
        if (dasha.currentAntardasha?.endDate) {
          dasha.currentAntardasha.remainingDays = calcRemaining(dasha.currentAntardasha.endDate);
        }

        this.dashaCache.set(cacheKey, dasha);
        return dasha;
      })
      .finally(() => this.dashaInflight.delete(cacheKey));

    this.dashaInflight.set(cacheKey, promise);
    return promise;
  }
}
