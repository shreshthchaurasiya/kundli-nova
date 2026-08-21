import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';


export function AstroCommissionScreen() {
  const [globalRule, setGlobalRule] = useState<any>(null);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [pendingSummary, setPendingSummary] = useState({ count: 0, amount: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  const formatINR = (amount: number | null | undefined) => {
    if (amount == null) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Modals
  const [isGlobalModalOpen, setIsGlobalModalOpen] = useState(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  
  // Forms
  const [companyPct, setCompanyPct] = useState('');
  const [astroPct, setAstroPct] = useState('');
  const [selectedAstroId, setSelectedAstroId] = useState('');
  const [astrologers, setAstrologers] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase.rpc('get_admin_commission_overview');
      if (error) throw error;
      
      setGlobalRule(data?.global_rule || null);
      setOverrides(data?.overrides || []);
      setPendingSummary({
        count: data?.pending_count || 0,
        amount: data?.pending_amount || 0
      });
      setAstrologers(data?.astrologers || []);
    } catch (err: any) {
      console.error('Failed to fetch commission overview:', err);
    }
  };

  const handleSetGlobal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(companyPct) + Number(astroPct) !== 100) {
      alert("Percentages must total 100%");
      return;
    }
    if (!confirm("This rule will apply only to eligible billing entries from its effective time. Historical calculated entries will not change. Proceed?")) return;
    
    try {
      const { error: rpcErr } = await supabase.rpc('set_global_commission_rule', {
        p_company_percentage: Number(companyPct),
        p_astrologer_percentage: Number(astroPct),
        p_effective_from: new Date().toISOString()
      });
      if (rpcErr) throw rpcErr;
      setIsGlobalModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSetOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(companyPct) + Number(astroPct) !== 100) {
      alert("Percentages must total 100%");
      return;
    }
    try {
      const { error: rpcErr } = await supabase.rpc('set_astrologer_commission_override', {
        p_astrologer_id: selectedAstroId,
        p_company_percentage: Number(companyPct),
        p_astrologer_percentage: Number(astroPct),
        p_effective_from: new Date().toISOString()
      });
      if (rpcErr) throw rpcErr;
      setIsOverrideModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeactivateOverride = async (id: string) => {
    if (!confirm("Return this astrologer to the global rule?")) return;
    try {
      const { error: rpcErr } = await supabase.rpc('deactivate_astrologer_commission_override', {
        p_astrologer_id: id
      });
      if (rpcErr) throw rpcErr;
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleProcessPending = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.rpc('process_pending_commissions', { p_limit: 100 });
      if (error) throw error;
      alert(`Processed: ${data.processed_count}\nCalculated: ${data.calculated_count}\nNot Configured: ${data.not_configured_count}\nFailed: ${data.failed_count}`);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-neutral-900">Astro Commission</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Global Rule */}
        <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm relative">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-lg font-black text-neutral-900">Global Commission Rule</h2>
              <p className="text-sm text-neutral-500">Default split for all astrologers</p>
            </div>
            {globalRule ? (
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">ACTIVE</span>
            ) : (
              <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">NOT CONFIGURED</span>
            )}
          </div>

          {globalRule ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-neutral-50 rounded-xl p-4 border border-neutral-100 text-center">
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Company Share</p>
                  <p className="text-2xl font-black text-neutral-900">{globalRule.company_percentage}%</p>
                </div>
                <div className="flex-1 bg-neutral-50 rounded-xl p-4 border border-neutral-100 text-center">
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Astrologer Share</p>
                  <p className="text-2xl font-black text-neutral-900">{globalRule.astrologer_percentage}%</p>
                </div>
              </div>
              <div className="text-xs text-neutral-400 font-medium">
                Effective From: {new Date(globalRule.effective_from).toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="p-6 bg-orange-50 border border-orange-100 rounded-xl text-orange-700 text-sm font-medium">
              No global rule is currently active. Pending commissions will not be processed.
            </div>
          )}

          <button onClick={() => setIsGlobalModalOpen(true)} className="mt-6 w-full rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-neutral-800 transition-colors">
            Update Global Rule
          </button>
        </div>

        {/* Pending Commission */}
        <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-black text-neutral-900">Pending Commissions</h2>
            <p className="text-sm text-neutral-500">Awaiting calculation</p>
            
            <div className="mt-6 space-y-4">
              <div className="flex justify-between items-center p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                <span className="text-sm font-bold text-neutral-600">Ledgers Awaiting</span>
                <span className="text-xl font-black text-neutral-900">{pendingSummary.count}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                <span className="text-sm font-bold text-neutral-600">Total Gross Amount</span>
                <span className="text-xl font-black text-orange-600">{formatINR(pendingSummary.amount)}</span>
              </div>
            </div>
          </div>

          <button 
            onClick={handleProcessPending} 
            disabled={isProcessing || pendingSummary.count === 0}
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isProcessing ? 'Processing Batch...' : 'Process Pending Batch (Max 100)'}
          </button>
        </div>
      </div>

      {/* Overrides Table */}
      <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-black text-neutral-900">Astrologer Overrides</h2>
          <button onClick={() => setIsOverrideModalOpen(true)} className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-bold text-neutral-900 hover:bg-neutral-200 transition-colors">
            + Add Override
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-6 py-4 font-bold rounded-tl-xl rounded-bl-xl">Astrologer</th>
                <th className="px-6 py-4 font-bold">Company %</th>
                <th className="px-6 py-4 font-bold">Astro %</th>
                <th className="px-6 py-4 font-bold">Effective From</th>
                <th className="px-6 py-4 font-bold text-right rounded-tr-xl rounded-br-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {overrides.length === 0 ? (
                <tr><td colSpan={5} className="py-6 text-center text-neutral-500">No active overrides.</td></tr>
              ) : (
                overrides.map(o => (
                  <tr key={o.id}>
                    <td className="px-6 py-4 font-bold text-neutral-900">{o.astrologer_name || o.astrologers?.profiles?.name}</td>
                    <td className="px-6 py-4 font-bold text-neutral-600">{o.company_percentage}%</td>
                    <td className="px-6 py-4 font-bold text-neutral-600">{o.astrologer_percentage}%</td>
                    <td className="px-6 py-4 text-neutral-500">{new Date(o.effective_from).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDeactivateOverride(o.astrologer_id)} className="text-red-600 font-bold hover:text-red-800 text-xs px-3 py-1 bg-red-50 rounded-full">
                        Use Global Rule
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Global Modal */}
      {isGlobalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-xl font-black mb-4">Set Global Commission Rule</h2>
            <form onSubmit={handleSetGlobal} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1">Company Share (%)</label>
                  <input required type="number" step="0.01" min="0" max="100" value={companyPct} onChange={e => {setCompanyPct(e.target.value); setAstroPct(String(100 - Number(e.target.value)))}} className="w-full border-neutral-200 rounded-lg p-2.5 bg-neutral-50 focus:border-neutral-900 focus:ring-neutral-900" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1">Astrologer Share (%)</label>
                  <input required type="number" step="0.01" min="0" max="100" value={astroPct} onChange={e => {setAstroPct(e.target.value); setCompanyPct(String(100 - Number(e.target.value)))}} className="w-full border-neutral-200 rounded-lg p-2.5 bg-neutral-50 focus:border-neutral-900 focus:ring-neutral-900" />
                </div>
              </div>
              <div className="p-3 bg-blue-50 text-blue-800 text-xs font-medium rounded-lg">
                Note: Total must be exactly 100%. This rule will take effect instantly for all new completed chats.
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsGlobalModalOpen(false)} className="px-4 py-2 text-sm font-bold text-neutral-600">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-neutral-900 text-white text-sm font-bold rounded-lg hover:bg-neutral-800">Activate Rule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Override Modal */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-xl font-black mb-4">Add Astrologer Override</h2>
            <form onSubmit={handleSetOverride} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1">Astrologer</label>
                <select required value={selectedAstroId} onChange={e => setSelectedAstroId(e.target.value)} className="w-full border-neutral-200 rounded-lg p-2.5 bg-neutral-50 focus:border-neutral-900 focus:ring-neutral-900">
                  <option value="">Select Astrologer...</option>
                  {astrologers.map(a => (
                    <option key={a.id} value={a.id}>{a.name || a.profiles?.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1">Company Share (%)</label>
                  <input required type="number" step="0.01" min="0" max="100" value={companyPct} onChange={e => {setCompanyPct(e.target.value); setAstroPct(String(100 - Number(e.target.value)))}} className="w-full border-neutral-200 rounded-lg p-2.5 bg-neutral-50 focus:border-neutral-900 focus:ring-neutral-900" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1">Astrologer Share (%)</label>
                  <input required type="number" step="0.01" min="0" max="100" value={astroPct} onChange={e => {setAstroPct(e.target.value); setCompanyPct(String(100 - Number(e.target.value)))}} className="w-full border-neutral-200 rounded-lg p-2.5 bg-neutral-50 focus:border-neutral-900 focus:ring-neutral-900" />
                </div>
              </div>
              <div className="p-3 bg-blue-50 text-blue-800 text-xs font-medium rounded-lg">
                Note: This override will take effect instantly for this astrologer.
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsOverrideModalOpen(false)} className="px-4 py-2 text-sm font-bold text-neutral-600">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-neutral-900 text-white text-sm font-bold rounded-lg hover:bg-neutral-800">Activate Override</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
