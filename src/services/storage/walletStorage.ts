import { KEYS } from './storageKeys';
import { storageAdapter } from './storageAdapter';
import { WalletState, WalletTransaction } from '../../types/wallet';
import { BUSINESS_RULES } from '../../config/businessRules';
import { IWalletRepository } from './interfaces';

type WalletListener = (state: WalletState) => void;
const listeners = new Set<WalletListener>();

function saveWalletStateInternal(state: WalletState): void {
  storageAdapter.setItem(KEYS.WALLET, state);
}

function notifySubscribers(state: WalletState): void {
  listeners.forEach(cb => {
    try {
      cb(state);
    } catch (err) {
      console.error('[WalletStorage] Subscriber callback error', err);
    }
  });
}

export const walletStorage: IWalletRepository = {
  getWalletState(): WalletState {
    const defaultState: WalletState = {
      balance: BUSINESS_RULES.WALLET.INITIAL_BALANCE,
      transactions: [],
      updatedAt: new Date().toISOString()
    };
    return storageAdapter.getItem<WalletState>(KEYS.WALLET, defaultState);
  },

  getBalance(): number {
    return this.getWalletState().balance;
  },

  getTransactions(): WalletTransaction[] {
    return this.getWalletState().transactions;
  },

  recharge(amount: number, title: string, referenceId?: string): WalletState {
    if (isNaN(amount) || amount <= 0 || !isFinite(amount)) {
      throw new Error(`[WalletStorage] Invalid recharge amount: ${amount}`);
    }

    const state = this.getWalletState();
    const newTx: WalletTransaction = {
      id: `tx-recharge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'credit',
      amount,
      title,
      status: 'completed',
      createdAt: new Date().toISOString(),
      referenceType: 'recharge',
      referenceId
    };

    const updatedState: WalletState = {
      balance: state.balance + amount,
      transactions: [newTx, ...state.transactions],
      updatedAt: new Date().toISOString()
    };

    saveWalletStateInternal(updatedState);
    notifySubscribers(updatedState);
    return updatedState;
  },

  debit(amount: number, title: string, referenceId?: string): WalletState {
    if (isNaN(amount) || amount <= 0 || !isFinite(amount)) {
      throw new Error(`[WalletStorage] Invalid debit amount: ${amount}`);
    }

    const state = this.getWalletState();
    if (state.balance < amount) {
      throw new Error(`[WalletStorage] Insufficient balance. Required: ${amount}, Available: ${state.balance}`);
    }

    const newTx: WalletTransaction = {
      id: `tx-debit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'debit',
      amount,
      title,
      status: 'completed',
      createdAt: new Date().toISOString(),
      referenceType: 'consultation',
      referenceId
    };

    const updatedState: WalletState = {
      balance: Math.max(0, state.balance - amount),
      transactions: [newTx, ...state.transactions],
      updatedAt: new Date().toISOString()
    };

    saveWalletStateInternal(updatedState);
    notifySubscribers(updatedState);
    return updatedState;
  },

  refund(amount: number, title: string, referenceId?: string): WalletState {
    if (isNaN(amount) || amount <= 0 || !isFinite(amount)) {
      throw new Error(`[WalletStorage] Invalid refund amount: ${amount}`);
    }

    const state = this.getWalletState();
    const newTx: WalletTransaction = {
      id: `tx-refund-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'credit',
      amount,
      title,
      status: 'completed',
      createdAt: new Date().toISOString(),
      referenceType: 'refund',
      referenceId
    };

    const updatedState: WalletState = {
      balance: state.balance + amount,
      transactions: [newTx, ...state.transactions],
      updatedAt: new Date().toISOString()
    };

    saveWalletStateInternal(updatedState);
    notifySubscribers(updatedState);
    return updatedState;
  },

  subscribe(callback: WalletListener): () => void {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  }
};
