import { IProfileRepository } from '../interfaces/profile';
import { UserProfile } from '../../types/profile';
import { ApiClient } from '../../services/api/apiClient';
import { ENDPOINTS } from '../../services/api/endpoints';

export class ApiProfileRepository implements IProfileRepository {
  async getProfile(): Promise<UserProfile | null> {
    try {
      const data = await ApiClient.get<UserProfile | null>(ENDPOINTS.PROFILE.GET);
      return data;
    } catch (error: any) {
      if (error.statusCode === 404 || error.code === 'PGRST116') {
        return null; // Profile not created yet
      }
      throw error;
    }
  }

  async saveProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    return await ApiClient.patch<UserProfile>(ENDPOINTS.PROFILE.UPDATE, {
      body: profile,
    });
  }

  async startWelcomeChat(): Promise<UserProfile> {
    return await ApiClient.patch<UserProfile>(ENDPOINTS.PROFILE.UPDATE, {
      body: { welcomeChatStartedAt: new Date().toISOString() },
    });
  }

  async removeProfile(): Promise<void> {
    // There is no explicit remove profile endpoint currently,
    // in an API driven architecture logging out handles this usually,
    // or a specialized DELETE endpoint would exist.
    // For now, this is a no-op API-side.
    return Promise.resolve();
  }
}
