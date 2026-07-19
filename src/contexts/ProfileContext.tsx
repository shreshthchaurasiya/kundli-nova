import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types/profile';
import { useRepositories } from '../repositories/repositoryProvider';
import { useAuth } from '../auth';

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
  const { isAuthenticated } = useAuth();
  const repositories = useRepositories();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const refreshProfile = async () => {
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
  };

  useEffect(() => {
    refreshProfile();
  }, [isAuthenticated, repositories.profile]);

  return (
    <ProfileContext.Provider value={{ profile, isLoadingProfile, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);
