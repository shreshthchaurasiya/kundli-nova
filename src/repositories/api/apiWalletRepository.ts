import { v4 as uuidv4 } from 'uuid';
import { IWalletRepository } from '../interfaces/wallet';
import { WalletState, WalletTransaction } from '../../types/wallet';
import { ApiClient } from '../../services/api/apiClient';
import { ENDPOINTS } from '../../services/api/endpoints';

export class ApiWalletRepository implements IWalletRepository {
  async getWalletState(): Promise<WalletState> {
    const data = await ApiClient.get<{ balance: number }>(ENDPOINTS.WALLET.GET);
    return {
      balance: data.balance,
      transactions: [],
      updatedAt: new Date().toISOString(),
    };
  }

  async getTransactions(): Promise<WalletTransaction[]> {
    const data = await ApiClient.get<WalletTransaction[]>(ENDPOINTS.WALLET.TRANSACTIONS);
    return data;
  }

  async recharge(amount: number, title: string, referenceId?: string): Promise<WalletState> {
    // Generate idempotency key for this recharge action if not provided by referenceId
    const idempotencyKey = referenceId || uuidv4();
    
    const data = await ApiClient.post<{ balance: number }>(ENDPOINTS.WALLET.RECHARGE, {
      body: { amount, title, idempotencyKey },
    });

    return {
      balance: data.balance,
      transactions: [],
      updatedAt: new Date().toISOString(),
    };
  }

  async debit(): Promise<WalletState> {
    throw new Error('Direct frontend wallet debit is not allowed. Mutations must occur via backend RPCs.');
  }

  async refund(): Promise<WalletState> {
    throw new Error('Direct frontend wallet refund is not allowed. Mutations must occur via backend RPCs.');
  }
}
