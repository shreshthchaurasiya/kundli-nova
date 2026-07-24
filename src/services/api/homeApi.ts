import { ApiClient } from './apiClient';
import { ENDPOINTS } from './endpoints';
import { HomePersonalizedResponse } from './homeTypes';

export class HomeApi {
  /**
   * Fetches the full personalized home data for the authenticated user's self profile.
   * Optional profileId scopes the request to a specific profile.
   */
  static async getPersonalizedHome(profileId?: string): Promise<HomePersonalizedResponse> {
    return ApiClient.get<HomePersonalizedResponse>(ENDPOINTS.HOME.PERSONALIZED, {
      params: profileId ? { profileId } : undefined,
    });
  }
}
