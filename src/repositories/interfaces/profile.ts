import { UserProfile } from '../../types/profile';

export interface IProfileRepository {
  getProfile(): Promise<UserProfile | null>;
  saveProfile(profile: Partial<UserProfile>): Promise<UserProfile>;
  startWelcomeChat(): Promise<UserProfile>;
  removeProfile(): Promise<void>;
}
