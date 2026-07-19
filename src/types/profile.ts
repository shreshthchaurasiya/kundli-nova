export interface BirthDetails {
  name: string;
  gender: string;
  dob: string;
  tob: string;
  state: string;
  district: string;
  city: string;
}

export interface UserProfile {
  name: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
}
