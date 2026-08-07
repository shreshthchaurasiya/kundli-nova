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

  async recharge(_amount?: number, _title?: string, _referenceId?: string): Promise<WalletState> {
    throw new Error('Direct frontend wallet recharge is not allowed. Use verified Razorpay checkout.');
  }

  async debit(_amount?: number, _title?: string, _referenceId?: string): Promise<WalletState> {
    throw new Error('Direct frontend wallet debit is not allowed. Mutations must occur via backend RPCs.');
  }

  async refund(): Promise<WalletState> {
    throw new Error('Direct frontend wallet refund is not allowed. Mutations must occur via backend RPCs.');
  }
}
