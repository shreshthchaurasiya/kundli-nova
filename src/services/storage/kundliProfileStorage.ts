import { KEYS } from './storageKeys';
import { storageAdapter } from './storageAdapter';
import { KundliProfile, KundliData } from '../../types/kundli';
import { IKundliProfileRepository } from './index';

type ProfilesListener = (profiles: KundliProfile[]) => void;
const listeners = new Set<ProfilesListener>();

function notifyProfilesListeners(profiles: KundliProfile[]): void {
  listeners.forEach(cb => {
    try {
      cb(profiles);
    } catch (err) {
      console.error('[KundliProfileStorage] Subscriber callback error', err);
    }
  });
}

export const kundliProfileStorage: IKundliProfileRepository = {
  getAllProfiles(): KundliProfile[] {
    return storageAdapter.getItem<KundliProfile[]>(KEYS.PROFILES_LIST, []);
  },

  getProfileById(profileId: string): KundliProfile | null {
    const list = this.getAllProfiles();
    return list.find(p => p.id === profileId) || null;
  },

  createProfile(profile: KundliProfile): KundliProfile {
    const list = this.getAllProfiles();
    let updatedList = [...list];
    if (profile.isDefault) {
      updatedList = updatedList.map(p => ({ ...p, isDefault: false }));
    }
    updatedList.push(profile);
    storageAdapter.setItem(KEYS.PROFILES_LIST, updatedList);
    notifyProfilesListeners(updatedList);
    return profile;
  },

  updateProfile(profileId: string, updates: Partial<KundliProfile>): KundliProfile {
    const list = this.getAllProfiles();
    let updatedProfile: KundliProfile | null = null;
    let updatedList = list.map(p => {
      if (p.id === profileId) {
        updatedProfile = { ...p, ...updates, updatedAt: new Date().toISOString() };
        return updatedProfile;
      }
      return p;
    });

    if (!updatedProfile) {
      throw new Error(`[KundliProfileStorage] Profile not found: ${profileId}`);
    }

    if (updates.isDefault) {
      updatedList = updatedList.map(p => {
        if (p.id !== profileId) {
          return { ...p, isDefault: false };
        }
        return p;
      });
    }

    storageAdapter.setItem(KEYS.PROFILES_LIST, updatedList);
    notifyProfilesListeners(updatedList);
    return updatedProfile;
  },

  deleteProfile(profileId: string): void {
    const list = this.getAllProfiles();
    const updatedList = list.filter(p => p.id !== profileId);
    if (list.find(p => p.id === profileId)?.isDefault && updatedList.length > 0) {
      updatedList[0].isDefault = true;
    }
    storageAdapter.setItem(KEYS.PROFILES_LIST, updatedList);
    notifyProfilesListeners(updatedList);
  },

  getDefaultProfile(): KundliProfile | null {
    const list = this.getAllProfiles();
    return list.find(p => p.isDefault) || list[0] || null;
  },

  setDefaultProfile(profileId: string): void {
    this.updateProfile(profileId, { isDefault: true });
  },

  subscribe(callback: ProfilesListener): () => void {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  },

  // Legacy compatibility helpers
  getSavedKundli(profileName: string): KundliData | null {
    const nameKey = profileName.toLowerCase().replace(/\s+/g, '_');
    const key = `${KEYS.SAVED_KUNDLI_PREFIX}${nameKey}`;
    return storageAdapter.getItem<KundliData | null>(key, null);
  },

  saveSavedKundli(profileName: string, data: KundliData): void {
    const nameKey = profileName.toLowerCase().replace(/\s+/g, '_');
    const key = `${KEYS.SAVED_KUNDLI_PREFIX}${nameKey}`;
    storageAdapter.setItem(key, data);
  },

  getUserKundli(userId: string): any | null {
    const key = `${KEYS.USER_KUNDLI_PREFIX}${userId}`;
    return storageAdapter.getItem<any | null>(key, null);
  },

  saveUserKundli(userId: string, data: any): void {
    const key = `${KEYS.USER_KUNDLI_PREFIX}${userId}`;
    storageAdapter.setItem(key, data);
  }
};
