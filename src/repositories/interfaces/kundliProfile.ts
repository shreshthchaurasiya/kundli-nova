import { KundliProfile } from '../../types/kundli';

export interface IKundliProfileRepository {
  getAllProfiles(): Promise<KundliProfile[]>;
  getProfileById(profileId: string): Promise<KundliProfile | null>;
  createProfile(profile: Partial<KundliProfile>): Promise<KundliProfile>;
  updateProfile(profileId: string, updates: Partial<KundliProfile>): Promise<KundliProfile>;
  deleteProfile(profileId: string): Promise<void>;
  
  // Settings/preferences methods - these can stay in local storage or move to API if supported
  getDefaultProfile(): Promise<KundliProfile | null>;
  setDefaultProfile(profileId: string): Promise<void>;
}
