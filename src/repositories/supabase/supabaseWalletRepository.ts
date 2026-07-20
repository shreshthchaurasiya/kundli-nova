import { supabase } from '../../lib/supabase';
import { WalletState, WalletTransaction } from '../../types/wallet';
import { IWalletRepository } from '../interfaces/wallet';

type TransactionRow = {
  id: string;
  type: 'credit' | 'debit';
  amount: number | string;
  title: string;
  description: string | null;
  status: 'completed' | 'failed' | 'pending';
  created_at: string;
  reference_type: WalletTransaction['referenceType'] | null;
  reference_id: string | null;
};

export class SupabaseWalletRepository implements IWalletRepository {
  async getWalletState(): Promise<WalletState> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) return { balance: 0, transactions: [], updatedAt: new Date(0).toISOString() };

    const [{ data: wallet, error: walletError }, transactions] = await Promise.all([
      supabase.from('wallets').select('balance,updated_at').eq('user_id', user.id).maybeSingle(),
      this.getTransactions(),
    ]);
    if (walletError) throw walletError;

    return {
      balance: Number(wallet?.balance ?? 0),
      transactions,
      updatedAt: wallet?.updated_at ?? new Date(0).toISOString(),
    };
  }

  async getTransactions(): Promise<WalletTransaction[]> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) return [];

    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('id,type,amount,title,description,status,created_at,reference_type,reference_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    return ((data ?? []) as TransactionRow[]).map((row) => ({
      id: row.id,
      type: row.type,
      amount: Number(row.amount),
      title: row.title,
      description: row.description ?? undefined,
      status: row.status,
      createdAt: row.created_at,
      referenceType: row.reference_type ?? undefined,
      referenceId: row.reference_id ?? undefined,
    }));
  }

  async recharge(_amount?: number, _title?: string, _referenceId?: string): Promise<WalletState> {
    throw new Error('Direct frontend wallet recharge is not allowed. Use verified Razorpay checkout.');
  }

  async debit(_amount?: number, _title?: string, _referenceId?: string): Promise<WalletState> {
    throw new Error('Direct frontend wallet debit is not allowed. Mutations must occur via backend RPCs.');
  }

  async refund(): Promise<WalletState> {
    throw new Error('Direct frontend wallet refund is not allowed.');
  }
}
