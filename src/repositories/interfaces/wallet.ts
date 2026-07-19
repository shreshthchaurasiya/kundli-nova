import { WalletState, WalletTransaction } from '../../types/wallet';

export interface IWalletRepository {
  getWalletState(): Promise<WalletState>;
  getTransactions(): Promise<WalletTransaction[]>;
  recharge(amount: number, title: string, referenceId?: string): Promise<WalletState>;
  // debit and refund should technically be server-side only in a production app.
  // The API doesn't expose generic debit/refund, it's done via consultation billing RPCs.
  // We'll keep them on the interface but api implementation will throw "Not Supported".
  debit(amount: number, title: string, referenceId?: string): Promise<WalletState>;
  refund(amount: number, title: string, referenceId?: string): Promise<WalletState>;
}
