import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, User, CreditCard, Phone, Mail, Calendar } from 'lucide-react';

export function UsersScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const limit = 25;

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const { data, error: rpcError } = await supabase.rpc('get_admin_users', {
        p_filters: { search: debouncedSearch },
        p_limit: limit,
        p_offset: (page - 1) * limit
      });

      if (rpcError) throw rpcError;
      setItems(data.items || []);
      setTotalCount(data.total_count || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users.');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatINR = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '₹0';
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-black text-neutral-900">Users ({totalCount})</h1>
        
        {/* Search Filter */}
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            className="w-full bg-white border border-neutral-200 text-neutral-900 text-sm rounded-[12px] focus:ring-orange-500 focus:border-orange-500 block pl-10 p-2.5 shadow-sm"
            placeholder="Search by name, email or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
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
                <th className="px-6 py-4 font-bold">User Details</th>
                <th className="px-6 py-4 font-bold">Wallet Balance</th>
                <th className="px-6 py-4 font-bold">Total Recharges</th>
                <th className="px-6 py-4 font-bold">Consultations</th>
                <th className="px-6 py-4 font-bold">Joined On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr><td colSpan={5} className="p-6 text-center text-neutral-500">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-neutral-500">No users found.</td></tr>
              ) : (
                items.map((item: any) => (
                  <tr key={item.user_id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900 text-base">{item.name || 'No Name'}</p>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-neutral-500 mt-1">
                            <span className="flex items-center gap-1"><Phone size={12}/> {item.phone || 'Not Provided'}</span>
                            {item.email && <span className="flex items-center gap-1"><Mail size={12}/> {item.email}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 text-green-700 font-bold bg-green-50 w-fit px-3 py-1.5 rounded-full">
                        <CreditCard size={14} />
                        <span>{formatINR(item.wallet_balance)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-neutral-900">
                      {formatINR(item.total_recharge_volume)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3 text-sm">
                        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-orange-50 text-orange-700 min-w-[50px] border border-orange-100">
                          <span className="font-black text-lg">{item.ai_consultations || 0}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider">AI</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-blue-50 text-blue-700 min-w-[50px] border border-blue-100">
                          <span className="font-black text-lg">{item.human_consultations || 0}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider">Astros</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-neutral-500">
                      <div className="flex items-center space-x-2">
                        <Calendar size={14} />
                        <span>{formatDate(item.joined_at)}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {totalCount > limit && (
            <div className="flex items-center justify-between border-t border-neutral-100 p-4">
              <button disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded px-3 py-1 font-bold text-neutral-600 hover:bg-neutral-100 disabled:opacity-50">Previous</button>
              <span className="text-sm font-bold text-neutral-500">Page {page} of {Math.ceil(totalCount / limit)}</span>
              <button disabled={items.length < limit} onClick={() => setPage(page + 1)} className="rounded px-3 py-1 font-bold text-neutral-600 hover:bg-neutral-100 disabled:opacity-50">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
