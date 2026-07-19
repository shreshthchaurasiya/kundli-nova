import { KEYS } from './storageKeys';
import { storageAdapter } from './storageAdapter';
import { UserProfile } from '../../types/profile';
import { IProfileRepository } from './interfaces';

export const profileStorage: IProfileRepository = {
  getProfile(): UserProfile | null {
    return storageAdapter.getItem<UserProfile | null>(KEYS.PROFILE, null);
  },

  saveProfile(profile: UserProfile): void {
    storageAdapter.setItem(KEYS.PROFILE, profile);
  },

  removeProfile(): void {
    storageAdapter.removeItem(KEYS.PROFILE);
  }
};
