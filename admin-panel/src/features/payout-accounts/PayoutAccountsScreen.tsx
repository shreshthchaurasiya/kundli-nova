import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, Search, Building } from 'lucide-react';

export function PayoutAccountsScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const { data, error: rpcError } = await supabase.rpc('get_admin_payout_accounts', {
        p_filters: {},
        p_limit: limit,
        p_offset: (page - 1) * limit
      });
      if (rpcError) throw rpcError;
      setItems(data.items || []);
      setTotalCount(data.total_count || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data.');
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-neutral-900">Payout Accounts</h1>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-600">
          <p className="font-bold">Error: {error}</p>
          <button onClick={fetchData} className="mt-2 rounded bg-red-100 px-4 py-2 hover:bg-red-200">Retry</button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-6 py-4 font-bold">Astrologer</th>
                <th className="px-6 py-4 font-bold">Bank Details</th>
                <th className="px-6 py-4 font-bold">Account Holder</th>
                <th className="px-6 py-4 font-bold">IFSC</th>
                <th className="px-6 py-4 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr><td colSpan={5} className="p-6 text-center text-neutral-500">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-neutral-500">No payout accounts found.</td></tr>
              ) : (
                items.map((item: any) => (
                  <tr key={item.payout_account_id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 font-bold text-neutral-900">
                      {item.astrologer_name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building size={16} className="text-neutral-400" />
                        <div>
                          <p className="font-bold text-neutral-900">{item.bank_name}</p>
                          <p className="text-xs text-neutral-500 font-semibold tracking-wider">•••• {item.account_number_last4}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-neutral-700">
                      {item.account_holder_name}
                    </td>
                    <td className="px-6 py-4 text-neutral-700 font-mono text-xs">
                      {item.ifsc_code}
                    </td>
                    <td className="px-6 py-4">
                      {item.status === 'VERIFIED' ? (
                        <div className="inline-flex items-center gap-1.5 bg-[#2ED986]/10 px-2.5 py-1 rounded-full text-[#1FA664]">
                          <CheckCircle2 size={12} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Verified</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 bg-neutral-100 px-2.5 py-1 rounded-full text-neutral-600">
                          <span className="text-[10px] font-bold uppercase tracking-wider">{item.status}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {totalCount > limit && (
            <div className="flex items-center justify-between border-t border-neutral-100 p-4">
              <button disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded px-3 py-1 font-bold text-neutral-600 hover:bg-neutral-100 disabled:opacity-50">Previous</button>
              <span className="text-sm font-bold text-neutral-500">Page {page}</span>
              <button disabled={items.length < limit} onClick={() => setPage(page + 1)} className="rounded px-3 py-1 font-bold text-neutral-600 hover:bg-neutral-100 disabled:opacity-50">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
