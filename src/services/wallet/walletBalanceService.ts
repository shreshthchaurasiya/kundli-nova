import { SupabaseWalletRepository } from '../../repositories/supabase/supabaseWalletRepository';

const walletRepository = new SupabaseWalletRepository();

export const walletBalanceService = {
  async getBalance(): Promise<number> {
    return (await walletRepository.getWalletState()).balance;
  },
};
