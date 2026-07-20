import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../auth';
import { supabase } from '../../../lib/supabase';
import { Astrologer } from '../../../types';
import { astrologerPartnerService } from './astrologerPartnerService';
import {
  AstrologerApplication,
  AstrologerApplicationDraft,
  AstrologerPartnerState,
  AstrologerPublicProfileDraft,
} from './types';

type AstrologerPartnerContextValue = AstrologerPartnerState & {
  directory: Astrologer[];
  isLoadingDirectory: boolean;
  refresh: () => Promise<void>;
  refreshDirectory: () => Promise<void>;
  saveDraft: (draft: AstrologerApplicationDraft) => Promise<AstrologerApplication>;
  submit: (draft: AstrologerApplicationDraft) => Promise<AstrologerApplication>;
  updatePublicProfile: (draft: AstrologerPublicProfileDraft) => Promise<Astrologer>;
};

const AstrologerPartnerContext = createContext<AstrologerPartnerContextValue | null>(null);

export function AstrologerPartnerProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [application, setApplication] = useState<AstrologerApplication | null>(null);
  const [publicProfile, setPublicProfile] = useState<Astrologer | null>(null);
  const [directory, setDirectory] = useState<Astrologer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshDirectory = useCallback(async () => {
    setIsLoadingDirectory(true);
    try {
      setDirectory(await astrologerPartnerService.getPublicDirectory());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load astrologers.');
    } finally {
      setIsLoadingDirectory(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setApplication(null);
      setPublicProfile(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [nextApplication, nextProfile] = await Promise.all([
        astrologerPartnerService.getApplication(),
        astrologerPartnerService.getMyPublicProfile(),
      ]);
      setApplication(nextApplication);
      setPublicProfile(nextProfile);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load your partner profile.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void refreshDirectory();
  }, [refreshDirectory]);

  useEffect(() => {
    void refresh();
    if (!isAuthenticated || !user) return;

    const applicationChannel = supabase
      .channel(`astrologer-application:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'astrologer_applications', filter: `user_id=eq.${user.id}` },
        () => void refresh(),
      )
      .subscribe();

    const directoryChannel = supabase
      .channel('astrologer-directory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'astrologers' }, () => {
        void refreshDirectory();
        void refresh();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(applicationChannel);
      void supabase.removeChannel(directoryChannel);
    };
  }, [isAuthenticated, refresh, refreshDirectory, user]);

  const value = useMemo<AstrologerPartnerContextValue>(() => ({
    application,
    publicProfile,
    directory,
    isLoading,
    isLoadingDirectory,
    error,
    refresh,
    refreshDirectory,
    saveDraft: async draft => {
      const saved = await astrologerPartnerService.saveDraft(draft);
      setApplication(saved);
      return saved;
    },
    submit: async draft => {
      const submitted = await astrologerPartnerService.submit(draft);
      setApplication(submitted);
      return submitted;
    },
    updatePublicProfile: async draft => {
      const updated = await astrologerPartnerService.updatePublicProfile(draft);
      setPublicProfile(updated);
      await refreshDirectory();
      return updated;
    },
  }), [
    application,
    directory,
    error,
    isLoading,
    isLoadingDirectory,
    publicProfile,
    refresh,
    refreshDirectory,
  ]);

  return <AstrologerPartnerContext.Provider value={value}>{children}</AstrologerPartnerContext.Provider>;
}

export function useAstrologerPartner(): AstrologerPartnerContextValue {
  const context = useContext(AstrologerPartnerContext);
  if (!context) throw new Error('useAstrologerPartner must be used inside AstrologerPartnerProvider');
  return context;
}
