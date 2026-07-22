import { AstrologyCalculationProvider, KundliNovaCalcInput, KundliNovaNatalChart, KundliNovaVimshottariDasha, KundliNovaDoshaAnalysis, KundliNovaYogaAnalysis } from '../types/astrologyProvider';
import { ProviderError } from '../errors/ProviderError';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase';

export class KundliCalculationService {
  private natalCache = new Map<string, KundliNovaNatalChart>();
  private natalInflight = new Map<string, Promise<KundliNovaNatalChart>>();

  private dashaCache = new Map<string, KundliNovaVimshottariDasha>();
  private dashaInflight = new Map<string, Promise<KundliNovaVimshottariDasha>>();

  private doshaCache = new Map<string, KundliNovaDoshaAnalysis>();
  private doshaInflight = new Map<string, Promise<KundliNovaDoshaAnalysis>>();
  
  private yogaCache = new Map<string, KundliNovaYogaAnalysis>();
  private yogaInflight = new Map<string, Promise<KundliNovaYogaAnalysis>>();
  
  private compatibilityCache = new Map<string, import('../types/astrologyProvider').KundliNovaCompatibilityAnalysis>();
  private compatibilityInflight = new Map<string, Promise<import('../types/astrologyProvider').KundliNovaCompatibilityAnalysis>>();
  
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

  public async getDoshaAnalysis(profileId: string, userId: string): Promise<KundliNovaDoshaAnalysis> {
    const input = await this.loadAuthorizedCalculationInput(profileId, userId);
    const fingerprint = this.createFingerprint(input);
    const cacheKey = `dosha:navamsha:v1:${input.profileId}:${fingerprint}`;

    if (this.doshaCache.has(cacheKey)) return this.doshaCache.get(cacheKey)!;
    if (this.doshaInflight.has(cacheKey)) return this.doshaInflight.get(cacheKey)!;

    const promise = this.provider.getDoshaAnalysis(input)
      .then(result => {
        this.doshaCache.set(cacheKey, result);
        return result;
      })
      .finally(() => this.doshaInflight.delete(cacheKey));

    this.doshaInflight.set(cacheKey, promise);
    return promise;
  }

  public async getYogaAnalysis(profileId: string, userId: string): Promise<KundliNovaYogaAnalysis> {
    const input = await this.loadAuthorizedCalculationInput(profileId, userId);
    const fingerprint = this.createFingerprint(input);
    const cacheKey = `yoga:navamsha:v1:${input.profileId}:${fingerprint}`;

    if (this.yogaCache.has(cacheKey)) return this.yogaCache.get(cacheKey)!;
    if (this.yogaInflight.has(cacheKey)) return this.yogaInflight.get(cacheKey)!;

    const promise = this.provider.getYogaAnalysis(input)
      .then(result => {
        this.yogaCache.set(cacheKey, result);
        return result;
      })
      .finally(() => this.yogaInflight.delete(cacheKey));

    this.yogaInflight.set(cacheKey, promise);
    return promise;
  }

  public async getCompatibilityAnalysis(profileAId: string, profileBId: string, userId: string): Promise<import('../types/astrologyProvider').KundliNovaCompatibilityAnalysis> {
    if (profileAId === profileBId) {
      const err: any = new Error('Please select two different profiles for Kundli matching.');
      err.statusCode = 400;
      err.code = 'SAME_PROFILE_NOT_ALLOWED';
      throw err;
    }

    const [inputA, inputB] = await Promise.all([
      this.loadAuthorizedCalculationInput(profileAId, userId),
      this.loadAuthorizedCalculationInput(profileBId, userId)
    ]);

    const fingerprintA = this.createFingerprint(inputA);
    const fingerprintB = this.createFingerprint(inputB);
    
    // Directional cache key (A+B is distinct from B+A)
    const cacheKey = `compatibility:navamsha:v1:${inputA.profileId}:${fingerprintA}:${inputB.profileId}:${fingerprintB}`;

    if (this.compatibilityCache.has(cacheKey)) return this.compatibilityCache.get(cacheKey)!;
    if (this.compatibilityInflight.has(cacheKey)) return this.compatibilityInflight.get(cacheKey)!;

    const promise = this.provider.getCompatibilityAnalysis(inputA, inputB)
      .then(result => {
        // Validate normalized response
        const requiredCodes = ['VARNA', 'VASHYA', 'TARA', 'YONI', 'GRAHA_MAITRI', 'GANA', 'BHAKOOT', 'NADI'];
        if (!result.factors || result.factors.length !== 8) {
          throw new ProviderError('navamsha', 'PROVIDER_BAD_RESPONSE', 'Compatibility analysis must have exactly 8 factors.');
        }
        
        const factorCodes = new Set<string>();
        for (const factor of result.factors) {
          if (!requiredCodes.includes(factor.code)) {
            throw new ProviderError('navamsha', 'PROVIDER_BAD_RESPONSE', `Invalid factor code: ${factor.code}`);
          }
          if (factorCodes.has(factor.code)) {
            throw new ProviderError('navamsha', 'PROVIDER_BAD_RESPONSE', `Duplicate factor code: ${factor.code}`);
          }
          factorCodes.add(factor.code);

          if (factor.score < 0 || factor.maximumScore < 0 || factor.score > factor.maximumScore) {
            throw new ProviderError('navamsha', 'PROVIDER_BAD_RESPONSE', `Invalid scores for factor ${factor.code}`);
          }
          if (factor.calculationStatus === 'unavailable' && factor.score > 0) {
            throw new ProviderError('navamsha', 'PROVIDER_BAD_RESPONSE', `Unavailable factor ${factor.code} cannot have a score > 0`);
          }
        }

        if (result.totalScore < 0 || result.maximumScore < 0 || result.totalScore > result.maximumScore) {
          throw new ProviderError('navamsha', 'PROVIDER_BAD_RESPONSE', 'Invalid total score or maximum score');
        }
        
        // maximumScore should represent the Ashtakoota total (36 typically)
        if (result.maximumScore !== 36) {
           // We might not hardcode 36 if it varies, but the instruction says "maximumScore should represent the Ashtakoota total", so let's allow what provider says as long as valid.
        }

        if (result.compatibilityPercentage < 0 || result.compatibilityPercentage > 100) {
          throw new ProviderError('navamsha', 'PROVIDER_BAD_RESPONSE', 'Compatibility percentage must be between 0 and 100');
        }

        this.compatibilityCache.set(cacheKey, result);
        return result;
      })
      .finally(() => this.compatibilityInflight.delete(cacheKey));

    this.compatibilityInflight.set(cacheKey, promise);
    return promise;
  }
}
