import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { WalletState } from '../types/wallet';
import { useAuth } from '../auth';
import { useRepositories } from '../repositories/repositoryProvider';
import { supabase } from '../lib/supabase';

const EMPTY_WALLET: WalletState = {
  balance: 0,
  transactions: [],
  updatedAt: new Date(0).toISOString(),
};

interface WalletContextType {
  wallet: WalletState;
  isLoadingWallet: boolean;
  refreshWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType>({
  wallet: EMPTY_WALLET,
  isLoadingWallet: true,
  refreshWallet: async () => {},
});

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const repositories = useRepositories();
  const [wallet, setWallet] = useState<WalletState>(EMPTY_WALLET);
  const [isLoadingWallet, setIsLoadingWallet] = useState(true);

  const refreshWallet = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setWallet(EMPTY_WALLET);
      setIsLoadingWallet(false);
      return;
    }
    setIsLoadingWallet(true);
    try {
      setWallet(await repositories.wallet.getWalletState());
    } catch (error) {
      console.error('Failed to fetch wallet', error);
    } finally {
      setIsLoadingWallet(false);
    }
  }, [isAuthenticated, user, repositories.wallet]);

  useEffect(() => {
    void refreshWallet();
    if (!isAuthenticated || !user) return;

    const channel = supabase
      .channel(`wallet:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${user.id}` }, refreshWallet)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions', filter: `user_id=eq.${user.id}` }, refreshWallet)
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [isAuthenticated, user, refreshWallet]);

  return <WalletContext.Provider value={{ wallet, isLoadingWallet, refreshWallet }}>{children}</WalletContext.Provider>;
};

export const useWallet = () => useContext(WalletContext);
