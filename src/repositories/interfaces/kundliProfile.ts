import { KundliProfile } from '../../types/kundli';

export interface IKundliProfileRepository {
  getAllProfiles(): Promise<KundliProfile[]>;
  getProfileById(profileId: string): Promise<KundliProfile | null>;
  createProfile(profile: Partial<KundliProfile>): Promise<KundliProfile>;
  updateProfile(profileId: string, updates: Partial<KundliProfile>): Promise<KundliProfile>;
  deleteProfile(profileId: string): Promise<void>;

  /**
   * Calls POST /kundli-profiles/sync-self which invokes the
   * ensure_self_kundli_profile() SECURITY DEFINER RPC.
   * Returns the canonical self profile, or null when the user's
   * onboarding birth details are incomplete.
   */
  ensureSelfProfile(): Promise<KundliProfile | null>;
  
  // Settings/preferences methods - these can stay in local storage or move to API if supported
  getDefaultProfile(): Promise<KundliProfile | null>;
  setDefaultProfile(profileId: string): Promise<void>;
}
