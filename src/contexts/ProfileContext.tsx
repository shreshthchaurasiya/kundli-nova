import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types/profile';
import { useRepositories } from '../repositories/repositoryProvider';
import { useAuth } from '../auth';
import { supabase } from '../lib/supabase';

interface ProfileContextType {
  profile: UserProfile | null;
  isLoadingProfile: boolean;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType>({
  profile: null,
  isLoadingProfile: true,
  refreshProfile: async () => {},
});

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const repositories = useRepositories();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const refreshProfile = useCallback(async () => {
    setIsLoadingProfile(true);
    try {
      if (isAuthenticated) {
        const p = await repositories.profile.getProfile();
        setProfile(p);
      } else {
        setProfile(null);
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

    const channel = supabase
      .channel(`profile:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, refreshProfile)
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [isAuthenticated, user, refreshProfile]);

  return (
    <ProfileContext.Provider value={{ profile, isLoadingProfile, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);
