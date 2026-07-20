export interface BirthDetails {
  name: string;
  gender: string;
  dob: string;
  tob: string;
  state: string;
  district: string;
  city: string;
}

export interface UserProfile extends Partial<BirthDetails> {
  name: string;
  fullName?: string; // legacy support
  phone?: string;
  email?: string;
  avatarUrl?: string;
  country?: string;
  birthTime?: string; // legacy support
  onboardingCompletedAt?: string;
  welcomeChatStartedAt?: string;
}
