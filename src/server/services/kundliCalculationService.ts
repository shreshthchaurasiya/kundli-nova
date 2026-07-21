import { AstrologyCalculationProvider, KundliNovaCalcInput, KundliNovaNatalChart } from '../types/astrologyProvider';
import crypto from 'crypto';
import { ProviderError } from '../errors/ProviderError';
import { ApiError } from '../errors/ApiError';

export class KundliCalculationService {
  private cache = new Map<string, KundliNovaNatalChart>();
  private inflight = new Map<string, Promise<KundliNovaNatalChart>>();
  
  constructor(private provider: AstrologyCalculationProvider) {}

  public async getKundli(profile: any): Promise<KundliNovaNatalChart> {
    // 1. Map to input
    const input = this.mapProfileToInput(profile);
    
    // 2. Validate completeness
    this.validateInput(input);
    
    // 3. Fingerprint & Cache Key
    const fingerprint = this.createFingerprint(input);
    const cacheKey = `navamsha:v1:${input.profileId}:${fingerprint}`;

    // 4. Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 5. Single-flight concurrency
    if (this.inflight.has(cacheKey)) {
      return this.inflight.get(cacheKey)!;
    }

    // 6. Execute Provider
    const promise = this.provider.getNatalChart(input)
      .then((chart) => {
        // Cache only successful normalized responses
        this.cache.set(cacheKey, chart);
        return chart;
      })
      .finally(() => {
        // Always remove inflight
        this.inflight.delete(cacheKey);
      });

    this.inflight.set(cacheKey, promise);
    return promise;
  }

  private mapProfileToInput(profile: any): KundliNovaCalcInput {
    // Uses the actual existing profile fields
    return {
      profileId: profile.id,
      name: profile.name,
      dateOfBirth: profile.dob,
      timeOfBirth: profile.tob,
      latitude: profile.latitude, // Expected to exist or fail validation
      longitude: profile.longitude,
      timezone: profile.timezone,
    };
  }

  private validateInput(input: KundliNovaCalcInput) {
    if (
      !input.dateOfBirth ||
      !input.timeOfBirth ||
      input.latitude === undefined ||
      input.longitude === undefined ||
      !input.timezone
    ) {
      // We throw an object that the controller can catch and format
      throw {
        statusCode: 400,
        code: 'INCOMPLETE_BIRTH_DETAILS',
        message: 'Complete birth details are required to generate this Kundli.'
      };
    }
  }

  private createFingerprint(input: KundliNovaCalcInput): string {
    const data = `${input.dateOfBirth}|${input.timeOfBirth}|${input.latitude}|${input.longitude}|${input.timezone}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
