export interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  title: string;
  description?: string;
  status: 'completed' | 'failed' | 'pending';
  createdAt: string; // ISO string
  referenceType?: 'recharge' | 'consultation' | 'refund' | 'bonus';
  referenceId?: string;
}

export interface WalletState {
  balance: number;
  transactions: WalletTransaction[];
  updatedAt: string; // ISO string
}
