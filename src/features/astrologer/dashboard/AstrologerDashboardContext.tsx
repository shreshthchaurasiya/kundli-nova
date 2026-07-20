import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../auth';
import { supabase } from '../../../lib/supabase';
import { astrologerDashboardService } from './services/astrologerDashboardService';
import { createAstrologerDashboardSummary } from './dashboardSelectors';
import {
  AstrologerAvailability,
  AstrologerDashboardSession,
  AstrologerDashboardSummary,
  AstrologerWorkspaceProfile,
} from './types';

interface AstrologerDashboardContextValue {
  profile: AstrologerWorkspaceProfile | null;
  sessions: AstrologerDashboardSession[];
  summary: AstrologerDashboardSummary;
  isLoading: boolean;
  isUpdatingAvailability: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setAvailability: (availability: Extract<AstrologerAvailability, 'ONLINE' | 'OFFLINE'>) => Promise<void>;
}

const emptySummary: AstrologerDashboardSummary = {
  waitingRequests: 0,
  activeSessions: 0,
  completedToday: 0,
  grossValueToday: 0,
};

const AstrologerDashboardContext = createContext<AstrologerDashboardContextValue | null>(null);

export function AstrologerDashboardProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [profile, setProfile] = useState<AstrologerWorkspaceProfile | null>(null);
  const [sessions, setSessions] = useState<AstrologerDashboardSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingAvailability, setIsUpdatingAvailability] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setProfile(null);
      setSessions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const snapshot = await astrologerDashboardService.getSnapshot();
      setProfile(snapshot?.profile ?? null);
      setSessions(snapshot?.sessions ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load the astrologer dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isAuthenticated || !user || !profile) return;

    const channel = supabase
      .channel(`astrologer-dashboard:${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'astrologers', filter: `id=eq.${profile.id}` },
        () => void refresh(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'consultation_sessions', filter: `astrologer_id=eq.${profile.id}` },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isAuthenticated, profile, refresh, user]);

  const setAvailability = useCallback(async (
    availability: Extract<AstrologerAvailability, 'ONLINE' | 'OFFLINE'>,
  ) => {
    if (!profile || isUpdatingAvailability) return;
    setIsUpdatingAvailability(true);
    setError(null);
    try {
      setProfile(await astrologerDashboardService.setAvailability(profile.id, availability));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update availability.');
      throw caught;
    } finally {
      setIsUpdatingAvailability(false);
    }
  }, [isUpdatingAvailability, profile]);

  const value = useMemo<AstrologerDashboardContextValue>(() => ({
    profile,
    sessions,
    summary: profile ? createAstrologerDashboardSummary(sessions) : emptySummary,
    isLoading,
    isUpdatingAvailability,
    error,
    refresh,
    setAvailability,
  }), [error, isLoading, isUpdatingAvailability, profile, refresh, sessions, setAvailability]);

  return <AstrologerDashboardContext.Provider value={value}>{children}</AstrologerDashboardContext.Provider>;
}

export function useAstrologerDashboard(): AstrologerDashboardContextValue {
  const context = useContext(AstrologerDashboardContext);
  if (!context) throw new Error('useAstrologerDashboard must be used inside AstrologerDashboardProvider');
  return context;
}
