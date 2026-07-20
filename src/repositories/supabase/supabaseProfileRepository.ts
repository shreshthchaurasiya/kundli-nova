import { supabase } from '../../lib/supabase';
import { UserProfile } from '../../types/profile';
import { IProfileRepository } from '../interfaces/profile';

type ProfileRow = {
  phone: string | null;
  email: string | null;
  name: string;
  gender: string | null;
  dob: string | null;
  tob: string | null;
  birth_state: string | null;
  birth_district: string | null;
  birth_city: string | null;
  onboarding_completed_at: string | null;
  welcome_chat_started_at: string | null;
};

const toProfile = (row: ProfileRow): UserProfile => ({
  name: row.name,
  phone: row.phone ?? undefined,
  email: row.email ?? undefined,
  gender: row.gender ?? undefined,
  dob: row.dob ?? undefined,
  tob: row.tob ?? undefined,
  state: row.birth_state ?? undefined,
  district: row.birth_district ?? undefined,
  city: row.birth_city ?? undefined,
  onboardingCompletedAt: row.onboarding_completed_at ?? undefined,
  welcomeChatStartedAt: row.welcome_chat_started_at ?? undefined,
});

export class SupabaseProfileRepository implements IProfileRepository {
  async getProfile(): Promise<UserProfile | null> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('phone,email,name,gender,dob,tob,birth_state,birth_district,birth_city,onboarding_completed_at,welcome_chat_started_at')
      .eq('id', user.id)
      .maybeSingle<ProfileRow>();

    if (error) throw error;
    return data ? toProfile(data) : null;
  }

  async startWelcomeChat(): Promise<UserProfile> {
    const { data, error } = await supabase.rpc('start_welcome_chat');
    if (error) throw error;
    return toProfile(data as ProfileRow);
  }

  async saveProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('Please sign in before saving your profile.');

    const isOnboardingSubmission = Boolean(
      profile.name && profile.gender && profile.dob && profile.tob &&
      profile.state && profile.district && profile.city
    );

    if (isOnboardingSubmission) {
      const { data, error } = await supabase.rpc('complete_onboarding', {
        p_name: profile.name,
        p_phone: profile.phone || null,
        p_gender: profile.gender,
        p_dob: profile.dob,
        p_tob: profile.tob,
        p_state: profile.state,
        p_district: profile.district,
        p_city: profile.city,
      });
      if (error) throw error;
      return toProfile(data as ProfileRow);
    }

    const updates: Record<string, unknown> = {};
    const fields: Array<[keyof UserProfile, string]> = [
      ['name', 'name'], ['phone', 'phone'], ['email', 'email'], ['gender', 'gender'],
      ['dob', 'dob'], ['tob', 'tob'], ['state', 'birth_state'],
      ['district', 'birth_district'], ['city', 'birth_city'],
    ];
    for (const [source, target] of fields) {
      if (profile[source] !== undefined) updates[target] = profile[source];
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select('phone,email,name,gender,dob,tob,birth_state,birth_district,birth_city,onboarding_completed_at,welcome_chat_started_at')
      .single<ProfileRow>();

    if (error) throw error;
    return toProfile(data);
  }

  async removeProfile(): Promise<void> {
    throw new Error('Profile deletion must be performed through the secure account deletion flow.');
  }
}
