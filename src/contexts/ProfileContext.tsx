import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types/profile';
import { KundliProfile } from '../types/kundli';
import { useRepositories } from '../repositories/repositoryProvider';
import { useAuth } from '../auth';
import { supabase } from '../lib/supabase';

interface ProfileContextType {
  profile: UserProfile | null;
  defaultKundliProfile: KundliProfile | null;
  isLoadingProfile: boolean;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType>({
  profile: null,
  defaultKundliProfile: null,
  isLoadingProfile: true,
  refreshProfile: async () => {},
});

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const repositories = useRepositories();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [defaultKundliProfile, setDefaultKundliProfile] = useState<KundliProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const refreshProfile = useCallback(async () => {
    setIsLoadingProfile(true);
    try {
      if (isAuthenticated) {
        const [p, kpList] = await Promise.all([
          repositories.profile.getProfile(),
          repositories.kundliProfile.getAllProfiles()
        ]);
        setProfile(p);
        // Resolution order:
        //  1. relation = 'self'  — the main account holder; always wins.
        //  2. isDefault = true   — a user-chosen default for other features.
        //  3. first row          — fallback when no self or default exists.
        //
        // This ensures a matching partner saved with isDefault=true can never
        // override the authenticated user's own profile in Home, AI, or My Kundli.
        const kp =
          kpList.find(k => k.relation === 'self') ||
          kpList.find(k => k.isDefault) ||
          kpList[0] ||
          null;
        setDefaultKundliProfile(kp);

      } else {
        setProfile(null);
        setDefaultKundliProfile(null);
      }
    } catch (e) {
      console.error('Failed to fetch profile', e);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [isAuthenticated, repositories.profile]);

  useEffect(() => {
    void refreshProfile();
    if (!isAuthenticated || !user) return;

    const profileChannel = supabase
      .channel(`profile:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, refreshProfile)
      .subscribe();

    const kundliChannel = supabase
      .channel(`kundli_profiles:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kundli_profiles', filter: `owner_id=eq.${user.id}` }, refreshProfile)
      .subscribe();

    return () => { 
      void supabase.removeChannel(profileChannel); 
      void supabase.removeChannel(kundliChannel);
    };
  }, [isAuthenticated, user, refreshProfile]);

  return (
    <ProfileContext.Provider value={{ profile, defaultKundliProfile, isLoadingProfile, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);
