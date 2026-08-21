import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle, XCircle, CreditCard, Banknote, Building, Info, User } from 'lucide-react';

export function WithdrawalsScreen() {
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [items, setItems] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;

  const [selectedDetails, setSelectedDetails] = useState<any | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const statusFilter = activeTab === 'pending' ? 'REQUESTED' : 'PAID';
      
      const { data, error: rpcError } = await supabase.rpc('get_admin_withdrawals', {
        p_filters: { status: statusFilter },
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
  }, [activeTab, page]);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (withdrawalId: string) => {
    if (!window.confirm("Are you sure you want to approve and mark this withdrawal as PAID?")) return;
    try {
      // Fast-track transition: Requested -> Approved -> Processing -> Paid
      const { error: err1 } = await supabase.rpc('admin_approve_withdrawal', { p_withdrawal_id: withdrawalId });
      if (err1) throw err1;
      
      const { error: err2 } = await supabase.rpc('admin_mark_withdrawal_processing', { p_withdrawal_id: withdrawalId });
      if (err2) throw err2;
      
      const { error: err3 } = await supabase.rpc('admin_mark_withdrawal_paid', { 
        p_withdrawal_id: withdrawalId,
        p_payout_reference: 'AUTO-PAID-' + Date.now(),
        p_bank_reference: 'AUTO'
      });
      if (err3) throw err3;

      fetchData();
    } catch (err: any) {
      alert("Error approving: " + err.message);
    }
  };

  const handleReject = async (withdrawalId: string) => {
    const reason = window.prompt("Reason for rejection:");
    if (reason === null) return;
    try {
      const { error } = await supabase.rpc('admin_reject_withdrawal', { 
        p_withdrawal_id: withdrawalId, 
        p_reason: reason || 'Rejected by admin' 
      });
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert("Error rejecting: " + err.message);
    }
  };

  const formatINR = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '₹0';
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6 pb-12 relative">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-neutral-900">Withdrawal Requests</h1>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-neutral-200">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 font-bold transition-colors ${activeTab === 'pending' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-neutral-500 hover:text-neutral-900'}`}
        >
          Pending Requests
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 font-bold transition-colors ${activeTab === 'completed' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-neutral-500 hover:text-neutral-900'}`}
        >
          Completed
        </button>
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
                <th className="px-6 py-4 font-bold">Amount</th>
                <th className="px-6 py-4 font-bold">Bank Details</th>
                <th className="px-6 py-4 font-bold">Date</th>
                {activeTab === 'pending' ? (
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                ) : (
                  <th className="px-6 py-4 font-bold text-right">Ref No.</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr><td colSpan={5} className="p-6 text-center text-neutral-500">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-neutral-500">No {activeTab} requests found.</td></tr>
              ) : (
                items.map((item: any) => (
                  <tr key={item.withdrawal_id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 font-bold text-neutral-900">
                      {item.astrologer_name}
                    </td>
                    <td className="px-6 py-4 font-black text-orange-600">
                      {formatINR(item.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Banknote size={16} className="text-neutral-400" />
                        <div>
                          <p className="font-bold text-neutral-900">{item.payout_bank_name}</p>
                          <p className="text-xs text-neutral-500 font-semibold tracking-wider">•••• {item.payout_account_last4}</p>
                        </div>
                        <button 
                          onClick={() => setSelectedDetails(item)}
                          className="ml-4 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded-md transition-colors"
                        >
                          View Details
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-neutral-500">
                      {new Date(item.requested_at).toLocaleDateString()}
                    </td>
                    
                    {activeTab === 'pending' ? (
                      <td className="px-6 py-4 text-right space-x-2">
                        <button 
                          onClick={() => handleReject(item.withdrawal_id)}
                          className="px-3 py-1.5 border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 transition-colors inline-flex items-center gap-1 text-xs"
                        >
                          <XCircle size={14} /> Reject
                        </button>
                        <button 
                          onClick={() => handleApprove(item.withdrawal_id)}
                          className="px-3 py-1.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors inline-flex items-center gap-1 text-xs"
                        >
                          <CheckCircle size={14} /> Pay Now
                        </button>
                      </td>
                    ) : (
                      <td className="px-6 py-4 text-right text-neutral-500 text-xs font-mono">
                        {item.payout_reference}
                      </td>
                    )}
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

      {/* Bank Details Modal */}
      {selectedDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="bg-neutral-50 p-6 border-b border-neutral-100 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-black text-neutral-900">Payout Details</h2>
                <p className="text-sm text-neutral-500 mt-1">Verify information before processing payout.</p>
              </div>
              <button 
                onClick={() => setSelectedDetails(null)}
                className="text-neutral-400 hover:text-neutral-900 p-1"
              >
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <User className="text-neutral-400" size={20} />
                <div>
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Account Holder</p>
                  <p className="font-bold text-neutral-900 text-lg">{selectedDetails.payout_account_holder_name || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Building className="text-neutral-400" size={20} />
                <div>
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Bank Name</p>
                  <p className="font-bold text-neutral-900 text-lg">{selectedDetails.payout_bank_name || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <CreditCard className="text-neutral-400" size={20} />
                <div>
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Account Number</p>
                  <p className="font-bold text-neutral-900 text-lg">
                    {selectedDetails.payout_account_number_full || `•••• ${selectedDetails.payout_account_last4}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Info className="text-neutral-400" size={20} />
                <div>
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">IFSC Code</p>
                  <p className="font-mono font-bold text-neutral-900 text-lg">{selectedDetails.payout_ifsc_code || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="bg-neutral-50 p-4 border-t border-neutral-100 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedDetails(null)}
                className="px-6 py-2.5 rounded-xl font-bold text-neutral-600 bg-white border border-neutral-200 hover:bg-neutral-50 transition-colors"
              >
                Close
              </button>
              {selectedDetails.status === 'REQUESTED' && (
                <button 
                  onClick={() => {
                    handleApprove(selectedDetails.withdrawal_id);
                    setSelectedDetails(null);
                  }}
                  className="px-6 py-2.5 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 transition-colors"
                >
                  Pay Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
