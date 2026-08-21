import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

export function PaymentsScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState('lifetime');
  const limit = 25;

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Fetch summary
      const { data: summaryData, error: summaryError } = await supabase.rpc('get_admin_payments_summary', {
        p_time_filter: timeFilter
      });
      if (summaryError) throw summaryError;
      setSummary(summaryData);

      // Fetch list
      const { data, error: rpcError } = await supabase.rpc('get_admin_payments', {
        p_filters: { search: debouncedSearch, time_filter: timeFilter },
        p_limit: limit,
        p_offset: (page - 1) * limit
      });

      if (rpcError) throw rpcError;
      setItems(data.items || []);
      setTotalCount(data.total_count || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch payments.');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, page, timeFilter]);

  useEffect(() => {
    setPage(1); // Reset page on filter change
  }, [timeFilter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

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
        <h1 className="text-2xl font-black text-neutral-900">Wallet Payments</h1>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <select 
            value={timeFilter} 
            onChange={(e) => setTimeFilter(e.target.value)}
            className="w-full sm:w-48 bg-white border border-neutral-200 text-neutral-900 text-sm rounded-[12px] focus:ring-orange-500 focus:border-orange-500 block p-2.5 shadow-sm"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="lifetime">Lifetime</option>
          </select>
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              className="w-full bg-white border border-neutral-200 text-neutral-900 text-sm rounded-[12px] focus:ring-orange-500 focus:border-orange-500 block p-2.5 shadow-sm"
              placeholder="Search by User, Razorpay ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm">
          <p className="text-sm font-bold text-neutral-500 mb-1">
            {timeFilter === 'today' ? "Today's Recharges" : timeFilter === 'week' ? "This Week's Recharges" : timeFilter === 'month' ? "This Month's Recharges" : "Lifetime Recharges"}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-green-600">{formatINR(summary?.successful_recharges)}</h3>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm">
          <p className="text-sm font-bold text-neutral-500 mb-1">
            {timeFilter === 'today' ? "Today's Failed Txns" : timeFilter === 'week' ? "This Week's Failed" : timeFilter === 'month' ? "This Month's Failed" : "Lifetime Failed"}
          </p>
          <h3 className="text-2xl font-black text-red-600">{summary?.failed_count || 0}</h3>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm">
          <p className="text-sm font-bold text-neutral-500 mb-1">Total Recharge Volume</p>
          <h3 className="text-2xl font-black text-neutral-900">{formatINR(summary?.total_recharge_volume)}</h3>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-600">
          <p className="font-bold">Error: {error}</p>
          <button onClick={fetchPayments} className="mt-2 rounded bg-red-100 px-4 py-2 hover:bg-red-200">Retry</button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-6 py-4 font-bold">Date</th>
                <th className="px-6 py-4 font-bold">User</th>
                <th className="px-6 py-4 font-bold">Amount (₹)</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold">Wallet Sync</th>
                <th className="px-6 py-4 font-bold">Razorpay ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr><td colSpan={6} className="p-6 text-center text-neutral-500">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-neutral-500">No payments found.</td></tr>
              ) : (
                items.map((payment: any) => (
                  <tr key={payment.internal_order_id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 text-neutral-600">{formatDate(payment.created_at)}</td>
                    <td className="px-6 py-4 font-bold text-neutral-900">{payment.user_name}</td>
                    <td className="px-6 py-4 font-black text-neutral-900">{formatINR(payment.amount)}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-wider font-bold ${
                        payment.payment_status === 'captured' || payment.payment_status === 'credited' 
                          ? 'bg-green-100 text-green-700' 
                          : payment.payment_status === 'failed' 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {payment.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {payment.has_mismatch ? (
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-600">Mismatch</span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-600">Synced</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-neutral-500">{payment.razorpay_payment_id || 'N/A'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {totalCount > limit && (
            <div className="flex items-center justify-between border-t border-neutral-100 p-4">
              <button disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded px-3 py-1 font-bold text-neutral-600 hover:bg-neutral-100 disabled:opacity-50">Previous</button>
              <span className="text-sm text-neutral-500">Page {page}</span>
              <button disabled={items.length < limit} onClick={() => setPage(page + 1)} className="rounded px-3 py-1 font-bold text-neutral-600 hover:bg-neutral-100 disabled:opacity-50">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
