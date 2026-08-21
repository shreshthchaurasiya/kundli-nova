import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  IndianRupee, 
  Wallet, 
  Building2, 
  ArrowRight,
  TrendingUp,
  Download
} from 'lucide-react';

export function FinancialLedgerScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [ledger, setLedger] = useState<any>(null);

  const fetchLedger = useCallback(async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const { data, error: rpcError } = await supabase.rpc('get_financial_ledger');
      if (rpcError) throw rpcError;
      setLedger(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch financial ledger.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const formatINR = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '₹0';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-600">
        <p className="font-bold">Error: {error}</p>
        <button onClick={fetchLedger} className="mt-4 rounded-xl bg-red-100 px-4 py-2 font-bold hover:bg-red-200">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-neutral-900">Financial Ledger</h1>
        <p className="mt-1 text-sm text-neutral-500">A strict mathematical breakdown of all money flowing through the platform.</p>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="mx-auto max-w-5xl space-y-6">
          
          {/* Phase 1: Money In */}
          <div className="rounded-3xl border-2 border-neutral-100 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                <Download size={32} />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-neutral-400">Total Money In (Razorpay)</p>
                <h2 className="text-4xl font-black text-neutral-900">{formatINR(ledger?.money_in?.total_recharges)}</h2>
                <p className="mt-1 text-sm text-neutral-500">Every single rupee ever added to user wallets via payment gateway.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
              <ArrowRight className="rotate-90" size={16} />
            </div>
          </div>

          {/* Phase 2: Where is it? (Split) */}
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Left side: Liabilities (Not yet company profit) */}
            <div className="rounded-3xl border-2 border-orange-100 bg-orange-50/30 p-8">
              <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-orange-800">
                <Wallet size={20} />
                Liabilities (Pending/Unspent)
              </h3>
              
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-orange-600/70">Unspent Wallet Balances</p>
                  <p className="text-2xl font-black text-orange-700">{formatINR(ledger?.liabilities?.unspent_wallets)}</p>
                  <p className="text-xs text-orange-600/60">Money sitting in user wallets, not yet spent.</p>
                </div>
                <div className="h-px w-full bg-orange-200/50"></div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-orange-600/70">Astrologer Unpaid Earnings</p>
                  <p className="text-2xl font-black text-orange-700">{formatINR(ledger?.liabilities?.astrologer_unpaid_earnings)}</p>
                  <p className="text-xs text-orange-600/60">Money earned by astrologers but not yet withdrawn.</p>
                </div>
              </div>
            </div>

            {/* Right side: Realized Company Profit */}
            <div className="rounded-3xl border-2 border-emerald-100 bg-emerald-50/30 p-8">
              <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-emerald-800">
                <Building2 size={20} />
                Realized Company Revenue
              </h3>
              
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-600/70">Consultation Commission</p>
                  <p className="text-2xl font-black text-emerald-700">{formatINR(ledger?.profit?.consultation_commission)}</p>
                  <p className="text-xs text-emerald-600/60">Platform share taken from consultation chats/calls.</p>
                </div>
                <div className="h-px w-full bg-emerald-200/50"></div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-600/70">AI Subscriptions</p>
                  <p className="text-2xl font-black text-emerald-700">{formatINR(ledger?.profit?.ai_subscriptions)}</p>
                  <p className="text-xs text-emerald-600/60">100% platform revenue from AI Kundli subscriptions.</p>
                </div>
              </div>
            </div>

          </div>

          <div className="flex justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
              <ArrowRight className="rotate-90" size={16} />
            </div>
          </div>

          {/* Phase 3: The Bottom Line */}
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Total Profit */}
            <div className="rounded-3xl bg-neutral-900 p-8 text-white shadow-lg">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                  <TrendingUp size={28} />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-neutral-400">Total Company Profit</p>
                  <h2 className="text-4xl font-black text-white">{formatINR(ledger?.profit?.total_company_profit)}</h2>
                </div>
              </div>
            </div>

            {/* Total Paid Out */}
            <div className="rounded-3xl border-2 border-neutral-100 bg-white p-8">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-600">
                  <IndianRupee size={28} />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-neutral-400">Money Paid Out</p>
                  <h2 className="text-4xl font-black text-neutral-900">{formatINR(ledger?.money_out?.paid_to_astrologers)}</h2>
                  <p className="mt-1 text-xs text-neutral-500">Successfully transferred to Astrologer banks.</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
