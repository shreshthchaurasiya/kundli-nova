import { IKundliProfileRepository } from '../interfaces/kundliProfile';
import { KundliProfile } from '../../types/kundli';
import { ApiClient } from '../../services/api/apiClient';
import { ENDPOINTS } from '../../services/api/endpoints';
import { storageAdapter } from '../../services/storage/storageAdapter';
import { KEYS } from '../../services/storage/storageKeys';

export class ApiKundliProfileRepository implements IKundliProfileRepository {
  async getAllProfiles(): Promise<KundliProfile[]> {
    return await ApiClient.get<KundliProfile[]>(ENDPOINTS.KUNDLI.LIST);
  }

  async getProfileById(profileId: string): Promise<KundliProfile | null> {
    try {
      return await ApiClient.get<KundliProfile>(ENDPOINTS.KUNDLI.GET_BY_ID(profileId));
    } catch (error: any) {
      if (error.statusCode === 404) return null;
      throw error;
    }
  }

  async createProfile(profile: Partial<KundliProfile>): Promise<KundliProfile> {
    return await ApiClient.post<KundliProfile>(ENDPOINTS.KUNDLI.CREATE, {
      body: profile,
    });
  }

  async updateProfile(profileId: string, updates: Partial<KundliProfile>): Promise<KundliProfile> {
    return await ApiClient.patch<KundliProfile>(ENDPOINTS.KUNDLI.UPDATE(profileId), {
      body: updates,
    });
  }

  async deleteProfile(profileId: string): Promise<void> {
    await ApiClient.delete(ENDPOINTS.KUNDLI.DELETE(profileId));
    
    const defaultProfileId = storageAdapter.getItem<string | null>(KEYS.KUNDLI_DEFAULT_PROFILE, null);
    if (defaultProfileId === profileId) {
      storageAdapter.removeItem(KEYS.KUNDLI_DEFAULT_PROFILE);
    }
  }

  async getDefaultProfile(): Promise<KundliProfile | null> {
    const defaultProfileId = storageAdapter.getItem<string | null>(KEYS.KUNDLI_DEFAULT_PROFILE, null);
    if (defaultProfileId) {
      return await this.getProfileById(defaultProfileId);
    }
    
    // If no default selected, maybe return the first self profile or just null
    const all = await this.getAllProfiles();
    const selfProfile = all.find(p => p.relation === 'self');
    if (selfProfile) {
      this.setDefaultProfile(selfProfile.id);
      return selfProfile;
    }
    
    return all.length > 0 ? all[0] : null;
  }

  async setDefaultProfile(profileId: string): Promise<void> {
    storageAdapter.setItem(KEYS.KUNDLI_DEFAULT_PROFILE, profileId);
  }
}
