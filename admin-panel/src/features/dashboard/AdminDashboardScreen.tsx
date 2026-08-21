import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Users, 
  Star, 
  MessageSquare, 
  CreditCard, 
  Building2, 
  ArrowRightLeft, 
  FileWarning, 
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export function AdminDashboardScreen() {
  const [range, setRange] = useState('Today');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError('');
    
    // Calculate dates based on range
    const now = new Date();
    let from = new Date();
    let to = new Date();

    if (range === 'Today') {
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
    } else if (range === 'Yesterday') {
      from.setDate(now.getDate() - 1);
      from.setHours(0, 0, 0, 0);
      to.setDate(now.getDate() - 1);
      to.setHours(23, 59, 59, 999);
    } else if (range === 'This Week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      from = new Date(now.setDate(diff));
      from.setHours(0, 0, 0, 0);
      to = new Date(from);
      to.setDate(from.getDate() + 6);
      to.setHours(23, 59, 59, 999);
    } else if (range === 'This Month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      // Lifetime
      from = new Date('2020-01-01');
      to = new Date('2030-01-01');
    }

    try {
      const { data: result, error: rpcError } = await supabase.rpc('get_admin_dashboard_summary', {
        p_from: from.toISOString(),
        p_to: to.toISOString(),
        p_timezone: 'Asia/Kolkata'
      });

      if (rpcError) throw rpcError;
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard summary.');
    } finally {
      setIsLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-600">
        <p className="font-bold">Error: {error}</p>
        <button onClick={fetchDashboard} className="mt-4 rounded-xl bg-red-100 px-4 py-2 font-bold hover:bg-red-200">Retry</button>
      </div>
    );
  }

  const formatINR = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return 'Not configured';
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-neutral-900">Dashboard</h1>
        <select 
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-bold text-neutral-900 outline-none"
        >
          <option>Today</option>
          <option>Yesterday</option>
          <option>This Week</option>
          <option>This Month</option>
          <option>Lifetime</option>
        </select>
      </div>

      {/* Primary Financial Overview - Strictly Segregated */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        
        {/* Razorpay Payment Volume */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <CreditCard size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Razorpay Payment Volume</p>
              <p className="text-[10px] font-medium text-neutral-400">Successful recharges</p>
            </div>
          </div>
          {isLoading ? (
            <div className="h-8 w-24 animate-pulse rounded bg-neutral-100" />
          ) : (
            <h2 className="text-2xl font-black text-neutral-900">{formatINR(data?.reconciliation?.razorpay_payment_volume)}</h2>
          )}
        </div>

        {/* Consultation Gross Billing */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <MessageSquare size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Consultation Gross</p>
              <p className="text-[10px] font-medium text-neutral-400">Total customer charges</p>
            </div>
          </div>
          {isLoading ? (
            <div className="h-8 w-24 animate-pulse rounded bg-neutral-100" />
          ) : (
            <h2 className="text-2xl font-black text-neutral-900">{formatINR(data?.billing?.gross_billing)}</h2>
          )}
        </div>

        {/* Company Commission Revenue */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Building2 size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Company Revenue</p>
              <p className="text-[10px] font-medium text-emerald-600/70">Calculated platform share</p>
            </div>
          </div>
          {isLoading ? (
            <div className="h-8 w-24 animate-pulse rounded bg-emerald-100/50" />
          ) : (
            <h2 className="text-2xl font-black text-emerald-700">
              {data?.billing?.company_revenue > 0 ? formatINR(data?.billing?.company_revenue) : '₹0'}
            </h2>
          )}
        </div>

        {/* AI Subscription Revenue */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/30 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">AI Subscriptions</p>
                <p className="text-[10px] font-medium text-blue-600/70">Total Premium Revenue</p>
              </div>
            </div>
            {!isLoading && (
              <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                {data?.ai_subscriptions?.active_count || 0} Active
              </span>
            )}
          </div>
          {isLoading ? (
            <div className="h-8 w-24 animate-pulse rounded bg-blue-100/50" />
          ) : (
            <h2 className="text-2xl font-black text-blue-700">
              {data?.ai_subscriptions?.revenue > 0 ? formatINR(data?.ai_subscriptions?.revenue) : '₹0'}
            </h2>
          )}
        </div>

        {/* Astrologer Earnings */}
        <div className="rounded-2xl border border-orange-200 bg-orange-50/30 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-600">
              <Star size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-orange-700">Astrologer Earnings</p>
              <p className="text-[10px] font-medium text-orange-600/70">Calculated astrologer share</p>
            </div>
          </div>
          {isLoading ? (
            <div className="h-8 w-24 animate-pulse rounded bg-orange-100/50" />
          ) : (
            <h2 className="text-2xl font-black text-orange-700">
              {data?.billing?.astrologer_earnings > 0 ? formatINR(data?.billing?.astrologer_earnings) : '₹0'}
            </h2>
          )}
        </div>

        {/* Awaiting Commission */}
        <div className="rounded-2xl border border-purple-200 bg-purple-50/30 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600">
              <MessageSquare size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Awaiting Commission</p>
              <p className="text-[10px] font-medium text-purple-600/70">Uncalculated gross</p>
            </div>
          </div>
          {isLoading ? (
            <div className="h-8 w-24 animate-pulse rounded bg-purple-100/50" />
          ) : (
            <h2 className="text-2xl font-black text-purple-700">
              {data?.billing?.awaiting_commission > 0 ? formatINR(data?.billing?.awaiting_commission) : '₹0'}
            </h2>
          )}
        </div>
      </div>

      {/* Operational Metrics */}
      <h2 className="mt-8 text-sm font-black text-neutral-900">Platform Operations</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <Users size={18} className="mb-2 text-neutral-400" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Total Users</p>
          {isLoading ? <div className="mt-1 h-6 w-12 animate-pulse rounded bg-neutral-100" /> : <p className="text-lg font-black text-neutral-900">{data?.users?.total}</p>}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <Star size={18} className="mb-2 text-neutral-400" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Astrologers</p>
          {isLoading ? <div className="mt-1 h-6 w-12 animate-pulse rounded bg-neutral-100" /> : <p className="text-lg font-black text-neutral-900">{data?.astrologers?.total}</p>}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <MessageSquare size={18} className="mb-2 text-neutral-400" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Active Consults</p>
          {isLoading ? <div className="mt-1 h-6 w-12 animate-pulse rounded bg-neutral-100" /> : <p className="text-lg font-black text-neutral-900">{data?.consultations?.active}</p>}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <ArrowRightLeft size={18} className="mb-2 text-neutral-400" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Pending Withdrawals</p>
          {isLoading ? <div className="mt-1 h-6 w-12 animate-pulse rounded bg-neutral-100" /> : <p className="text-lg font-black text-neutral-900">{data?.withdrawals?.pending}</p>}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <ShieldCheck size={18} className="mb-2 text-neutral-400" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Pending Verification</p>
          {isLoading ? <div className="mt-1 h-6 w-12 animate-pulse rounded bg-neutral-100" /> : <p className="text-lg font-black text-neutral-900">{data?.payouts?.pending_accounts}</p>}
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <FileWarning size={18} className="mb-2 text-red-400" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-500">Awaiting Comm.</p>
          {isLoading ? <div className="mt-1 h-6 w-12 animate-pulse rounded bg-red-100/50" /> : <p className="text-lg font-black text-red-600">{formatINR(data?.billing?.awaiting_commission_amount)}</p>}
        </div>

      </div>
    </div>
  );
}
