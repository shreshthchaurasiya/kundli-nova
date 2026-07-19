import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthContextType, AuthState } from './auth.types';
import { supabase } from '../lib/supabase';
import { setTokenProvider } from '../services/api/authTokenProvider';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    // Provide token fetching capability to the API client
    setTokenProvider(async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) return null;
      return session.access_token;
    });

    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error fetching auth session:', error);
        }

        setState({
          user: session?.user ?? null,
          session: session ?? null,
          accessToken: session?.access_token ?? null,
          isAuthenticated: !!session?.user,
          isLoading: false,
        });
      } catch (err) {
        console.error('Unexpected error loading auth session:', err);
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setState({
          user: session?.user ?? null,
          session: session ?? null,
          accessToken: session?.access_token ?? null,
          isAuthenticated: !!session?.user,
          isLoading: false,
        });
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    await supabase.auth.signOut();
  };

  const refreshSession = async () => {
    const { data: { session } } = await supabase.auth.refreshSession();
    if (session) {
      setState({
        user: session.user,
        session: session,
        accessToken: session.access_token,
        isAuthenticated: true,
        isLoading: false,
      });
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
