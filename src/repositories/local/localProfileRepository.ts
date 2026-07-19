import { IProfileRepository } from '../interfaces/profile';
import { UserProfile } from '../../types/profile';
import { storageAdapter } from '../../services/storage/storageAdapter';
import { KEYS } from '../../services/storage/storageKeys';

export class LocalProfileRepository implements IProfileRepository {
  async getProfile(): Promise<UserProfile | null> {
    return storageAdapter.getItem<UserProfile | null>(KEYS.PROFILE, null);
  }

  async saveProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    const existing = await this.getProfile();
    const merged = { ...existing, ...profile } as UserProfile;
    storageAdapter.setItem(KEYS.PROFILE, merged);
    return merged;
  }

  async removeProfile(): Promise<void> {
    storageAdapter.removeItem(KEYS.PROFILE);
  }
}
