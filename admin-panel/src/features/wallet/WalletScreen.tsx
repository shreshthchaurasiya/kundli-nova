import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

export function WalletScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState('lifetime');
  const [transactionType, setTransactionType] = useState('all');
  const limit = 25;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalEmail, setModalEmail] = useState('');
  const [modalAmount, setModalAmount] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [modalDescription, setModalDescription] = useState('');
  const [modalType, setModalType] = useState('credit');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchWalletData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Fetch summary
      const { data: summaryData, error: summaryError } = await supabase.rpc('get_admin_wallet_summary', {
        p_time_filter: timeFilter
      });
      if (summaryError) throw summaryError;
      setSummary(summaryData);

      // Fetch list
      const { data, error: rpcError } = await supabase.rpc('get_admin_wallet_transactions', {
        p_filters: { search: debouncedSearch, type: transactionType, time_filter: timeFilter },
        p_limit: limit,
        p_offset: (page - 1) * limit
      });

      if (rpcError) throw rpcError;
      setItems(data.items || []);
      setTotalCount(data.total_count || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch wallet data.');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, page, timeFilter, transactionType]);

  useEffect(() => {
    setPage(1);
  }, [timeFilter, transactionType]);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const handleAdjustWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError('');
    try {
      let finalAmount = Number(modalAmount);
      if (isNaN(finalAmount) || finalAmount <= 0) {
        throw new Error("Invalid amount");
      }
      if (modalType === 'debit') {
        finalAmount = -finalAmount;
      }
      
      const { error: rpcError } = await supabase.rpc('admin_adjust_wallet', {
        p_user_email: modalEmail,
        p_amount: finalAmount,
        p_title: modalTitle,
        p_description: modalDescription
      });

      if (rpcError) throw rpcError;
      
      setIsModalOpen(false);
      setModalEmail('');
      setModalAmount('');
      setModalTitle('');
      setModalDescription('');
      fetchWalletData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to adjust wallet');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatINR = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '₹0';
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-black text-neutral-900">Wallet Administration</h1>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto rounded-[12px] bg-neutral-900 px-6 py-2.5 font-bold text-white hover:bg-neutral-800 shadow-sm"
          >
            + Adjust Balance
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="currentColor"/>
            </svg>
          </div>
          <p className="text-sm font-bold text-neutral-500 mb-1">Total System Liability</p>
          <h3 className="text-2xl font-black text-neutral-900">{formatINR(summary?.total_liability)}</h3>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm">
          <p className="text-sm font-bold text-neutral-500 mb-1">
            {timeFilter === 'today' ? "Today's Promos" : timeFilter === 'week' ? "This Week's Promos" : timeFilter === 'month' ? "This Month's Promos" : "Total Promo Given"}
          </p>
          <h3 className="text-2xl font-black text-blue-600">{formatINR(summary?.total_promo)}</h3>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm">
          <p className="text-sm font-bold text-neutral-500 mb-1">
            {timeFilter === 'today' ? "Today's Spent" : timeFilter === 'week' ? "This Week's Spent" : timeFilter === 'month' ? "This Month's Spent" : "Total Wallet Spent"}
          </p>
          <h3 className="text-2xl font-black text-orange-600">{formatINR(summary?.total_deducted)}</h3>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
         <div className="flex gap-4 w-full md:w-auto">
            <select 
              value={timeFilter} 
              onChange={(e) => setTimeFilter(e.target.value)}
              className="w-full sm:w-48 bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-[12px] focus:ring-neutral-900 focus:border-neutral-900 block p-2.5"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="lifetime">Lifetime</option>
            </select>
            <select 
              value={transactionType} 
              onChange={(e) => setTransactionType(e.target.value)}
              className="w-full sm:w-48 bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-[12px] focus:ring-neutral-900 focus:border-neutral-900 block p-2.5"
            >
              <option value="all">All Types</option>
              <option value="credit">Credits (Money In)</option>
              <option value="debit">Debits (Money Out)</option>
            </select>
         </div>
         <div className="relative w-full md:w-80">
            <input
              type="text"
              className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-[12px] focus:ring-neutral-900 focus:border-neutral-900 block p-2.5"
              placeholder="Search user, title, TXN ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-600">
          <p className="font-bold">Error: {error}</p>
          <button onClick={fetchWalletData} className="mt-2 rounded bg-red-100 px-4 py-2 hover:bg-red-200">Retry</button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-500 border-b border-neutral-100">
              <tr>
                <th className="px-6 py-4 font-bold">Date</th>
                <th className="px-6 py-4 font-bold">User</th>
                <th className="px-6 py-4 font-bold">Transaction</th>
                <th className="px-6 py-4 font-bold">Type</th>
                <th className="px-6 py-4 font-bold text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr><td colSpan={5} className="p-6 text-center text-neutral-500 font-medium">Loading ledger...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-neutral-500 font-medium">No transactions found.</td></tr>
              ) : (
                items.map((txn: any) => (
                  <tr key={txn.transaction_id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 text-neutral-500 text-xs">{formatDate(txn.created_at)}</td>
                    <td className="px-6 py-4 font-bold text-neutral-900">{txn.user_name || 'System User'}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-neutral-800">{txn.title}</p>
                      {txn.description && <p className="text-xs text-neutral-500 mt-0.5">{txn.description}</p>}
                      <p className="text-[10px] text-neutral-400 font-mono mt-1">ID: {txn.transaction_id}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-wider font-bold ${
                        txn.type === 'credit' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {txn.type}
                      </span>
                    </td>
                    <td className={`px-6 py-4 font-black text-right ${txn.type === 'credit' ? 'text-green-600' : 'text-neutral-900'}`}>
                      {txn.type === 'credit' ? '+' : '-'}{formatINR(txn.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {totalCount > limit && (
            <div className="flex items-center justify-between border-t border-neutral-100 p-4 bg-neutral-50">
              <button disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded px-4 py-2 text-sm font-bold text-neutral-600 hover:bg-neutral-200 disabled:opacity-50 transition-colors">Previous</button>
              <span className="text-sm font-bold text-neutral-500">Page {page} of {Math.ceil(totalCount / limit)}</span>
              <button disabled={page >= Math.ceil(totalCount / limit)} onClick={() => setPage(page + 1)} className="rounded px-4 py-2 text-sm font-bold text-neutral-600 hover:bg-neutral-200 disabled:opacity-50 transition-colors">Next</button>
            </div>
          )}
        </div>
      )}

      {/* Manual Adjustment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-neutral-100 flex justify-between items-center">
              <h2 className="text-xl font-black text-neutral-900">Adjust Wallet Balance</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-neutral-900">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <form onSubmit={handleAdjustWallet} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-red-50 text-red-600 text-sm font-bold rounded-lg border border-red-100">
                  {modalError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1">User Email *</label>
                <input required type="email" value={modalEmail} onChange={e => setModalEmail(e.target.value)} className="w-full border-neutral-200 rounded-lg p-2.5 text-sm focus:ring-neutral-900 focus:border-neutral-900 bg-neutral-50" placeholder="user@example.com" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1">Action *</label>
                  <select value={modalType} onChange={e => setModalType(e.target.value)} className="w-full border-neutral-200 rounded-lg p-2.5 text-sm focus:ring-neutral-900 focus:border-neutral-900 bg-neutral-50">
                    <option value="credit">Add Money (Credit)</option>
                    <option value="debit">Remove Money (Debit)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1">Amount (₹) *</label>
                  <input required type="number" min="1" step="1" value={modalAmount} onChange={e => setModalAmount(e.target.value)} className="w-full border-neutral-200 rounded-lg p-2.5 text-sm focus:ring-neutral-900 focus:border-neutral-900 bg-neutral-50" placeholder="e.g. 100" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1">Title *</label>
                <input required type="text" value={modalTitle} onChange={e => setModalTitle(e.target.value)} className="w-full border-neutral-200 rounded-lg p-2.5 text-sm focus:ring-neutral-900 focus:border-neutral-900 bg-neutral-50" placeholder="e.g. Festive Bonus" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1">Description (Optional)</label>
                <textarea value={modalDescription} onChange={e => setModalDescription(e.target.value)} className="w-full border-neutral-200 rounded-lg p-2.5 text-sm focus:ring-neutral-900 focus:border-neutral-900 bg-neutral-50" placeholder="Internal notes..." rows={2} />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-neutral-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg disabled:opacity-50 transition-colors shadow-sm">
                  {isSubmitting ? 'Processing...' : 'Confirm Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
