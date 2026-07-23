import { IKundliProfileRepository } from '../interfaces/kundliProfile';
import { KundliProfile } from '../../types/kundli';
import { ApiClient } from '../../services/api/apiClient';
import { ENDPOINTS } from '../../services/api/endpoints';


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
    // API currently doesn't sync default profile to local storage
  }

  async getDefaultProfile(): Promise<KundliProfile | null> {
    const all = await this.getAllProfiles();
    return all.find(p => p.isDefault) || all.find(p => p.relation === 'self') || (all.length > 0 ? all[0] : null);
  }

  /**
   * Calls POST /kundli-profiles/sync-self which invokes the
   * ensure_self_kundli_profile() SECURITY DEFINER RPC via the user's JWT.
   * Returns the canonical self profile row, or null when birth details are
   * incomplete (normal product state, not an error).
   */
  async ensureSelfProfile(): Promise<KundliProfile | null> {
    const result = await ApiClient.post<KundliProfile | null>(ENDPOINTS.KUNDLI.SYNC_SELF, {
      body: {},
    });
    // ApiClient unwraps the `data` field. result is null for INCOMPLETE_BIRTH_DETAILS.
    return result ?? null;
  }

  async setDefaultProfile(profileId: string): Promise<void> {
    await this.updateProfile(profileId, { isDefault: true } as any);
  }
}
