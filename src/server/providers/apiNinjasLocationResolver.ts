import { LocationResolver, LocationResolutionInput, LocationResolutionResult } from '../services/locationResolver';
import { ProviderError } from '../errors/ProviderError';
import { env } from '../config/env';

export class ApiNinjasLocationResolver implements LocationResolver {
  async resolve(input: LocationResolutionInput): Promise<LocationResolutionResult> {
    if (!env.API_NINJAS_API_KEY) {
      throw new ProviderError('ApiNinjasLocation', 'PROVIDER_NOT_CONFIGURED', 'Location provider not configured', 500);
    }

    if (!input.city || !input.state) {
      throw new ProviderError('ApiNinjasLocation', 'LOCATION_RESOLUTION_FAILED', 'City and state are required for location resolution', 400);
    }

    if (input.country !== 'India') {
      throw new ProviderError('ApiNinjasLocation', 'LOCATION_RESOLUTION_FAILED', 'Only India locations are supported at this stage', 400);
    }

    const url = new URL('https://api.api-ninjas.com/v1/geocoding');
    url.searchParams.append('city', input.city);
    url.searchParams.append('state', input.state);
    url.searchParams.append('country', 'India');

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'X-Api-Key': env.API_NINJAS_API_KEY,
        },
        signal: AbortSignal.timeout(5000), // 5s timeout
      });

      if (!response.ok) {
        throw new ProviderError('ApiNinjasLocation', 'LOCATION_RESOLUTION_FAILED', 'Location service temporarily unavailable', 503);
      }

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        throw new ProviderError('ApiNinjasLocation', 'LOCATION_RESOLUTION_FAILED', 'Please verify your city and state', 400);
      }

      // Find the first result matching the state, or fallback to the first result if state matching fails due to exact casing issues (though API Ninjas usually normalizes)
      const targetState = input.state.toLowerCase();
      let bestMatch = data.find((r: any) => r.state && r.state.toLowerCase().includes(targetState));
      
      if (!bestMatch) {
         // Fallback if the state is misspelled but a city match exists. But requirements say:
         // "select only an India result matching the requested state"
         // Let's enforce strict state matching to reject ambiguous ones.
         throw new ProviderError('ApiNinjasLocation', 'LOCATION_RESOLUTION_FAILED', 'Could not uniquely resolve location. Please verify your city and state.', 400);
      }

      return {
        latitude: bestMatch.latitude,
        longitude: bestMatch.longitude,
        timezone: 'Asia/Kolkata', // Hardcoded for this India-only stage
      };
    } catch (error: any) {
      if (error instanceof ProviderError) {
        throw error;
      }
      // Handle timeout or network error
      throw new ProviderError('ApiNinjasLocation', 'LOCATION_RESOLUTION_FAILED', 'Location service temporarily unavailable', 503);
    }
  }
}
