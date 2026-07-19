import { KEYS } from './storageKeys';
import { storageAdapter } from './storageAdapter';
import { BirthDetails } from '../../types/profile';
import { IProfileRepository } from './index';

export const profileStorage: IProfileRepository = {
  getProfile(): BirthDetails | null {
    return storageAdapter.getItem<BirthDetails | null>(KEYS.PROFILE, null);
  },

  saveProfile(profile: BirthDetails): void {
    storageAdapter.setItem(KEYS.PROFILE, profile);
  },

  removeProfile(): void {
    storageAdapter.removeItem(KEYS.PROFILE);
  }
};
