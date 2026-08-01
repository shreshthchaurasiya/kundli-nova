import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle, XCircle, FileText, User, FileImage, X } from 'lucide-react';

export function AstrologersScreen() {
  const [activeTab, setActiveTab] = useState<'live' | 'approvals'>('live');
  const [items, setItems] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;

  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    
    try {
      if (activeTab === 'live') {
        const { data, error: rpcError } = await supabase.rpc('get_admin_astrologers', {
          p_filters: {},
          p_limit: limit,
          p_offset: (page - 1) * limit
        });
        if (rpcError) throw rpcError;
        setItems(data.items || []);
        setTotalCount(data.total_count || 0);
      } else {
        const { data, error: rpcError } = await supabase.rpc('get_admin_astrologer_applications', {
          p_status: 'pending',
          p_limit: limit,
          p_offset: (page - 1) * limit
        });
        if (rpcError) throw rpcError;
        setItems(data.items || []);
        setTotalCount(data.total_count || 0);
      }
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

  const handleApprove = async (appId: string) => {
    if (!window.confirm("Are you sure you want to approve this astrologer?")) return;
    try {
      const { error } = await supabase.rpc('approve_astrologer_application', { p_application_id: appId });
      if (error) throw error;
      setSelectedApp(null);
      fetchData();
    } catch (err: any) {
      alert("Error approving: " + err.message);
    }
  };

  const handleReject = async (appId: string) => {
    const reason = window.prompt("Reason for rejection:");
    if (reason === null) return;
    try {
      const { error } = await supabase.rpc('reject_astrologer_application', { p_application_id: appId, p_reason: reason || 'Not suitable' });
      if (error) throw error;
      setSelectedApp(null);
      fetchData();
    } catch (err: any) {
      alert("Error rejecting: " + err.message);
    }
  };

  const toggleStatus = async (astrologerId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    try {
      const { error } = await supabase.rpc('toggle_astrologer_status', { p_astrologer_id: astrologerId, p_status: newStatus });
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert("Error changing status: " + err.message);
    }
  };

  const formatINR = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return 'Not configured';
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const getPublicUrl = (path: string | null, bucket: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-neutral-900">Astrologers</h1>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-neutral-200">
        <button
          onClick={() => setActiveTab('live')}
          className={`px-4 py-2 font-bold transition-colors ${activeTab === 'live' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-neutral-500 hover:text-neutral-900'}`}
        >
          Live Astrologers
        </button>
        <button
          onClick={() => setActiveTab('approvals')}
          className={`px-4 py-2 font-bold transition-colors flex items-center space-x-2 ${activeTab === 'approvals' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-neutral-500 hover:text-neutral-900'}`}
        >
          <span>Pending Approvals</span>
          {activeTab !== 'approvals' && items.length > 0 && activeTab === 'live' ? null : null}
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
              {activeTab === 'live' ? (
                <tr>
                  <th className="px-6 py-4 font-bold">Astrologer</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold">Completed Consults</th>
                  <th className="px-6 py-4 font-bold">Gross Billing</th>
                  <th className="px-6 py-4 font-bold">Earnings</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-6 py-4 font-bold">Applicant Name</th>
                  <th className="px-6 py-4 font-bold">Experience</th>
                  <th className="px-6 py-4 font-bold">Skills</th>
                  <th className="px-6 py-4 font-bold">Applied On</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr><td colSpan={5} className="p-6 text-center text-neutral-500">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-neutral-500">No records found.</td></tr>
              ) : (
                items.map((item: any, idx: number) => (
                  <tr key={item.astrologer_id || item.id || idx} className="hover:bg-neutral-50 cursor-pointer" onClick={() => setSelectedApp(item)}>
                    {activeTab === 'live' ? (
                      <>
                        <td className="px-6 py-4 font-bold text-neutral-900 flex items-center space-x-3">
                           <div className="h-8 w-8 rounded-full bg-orange-100 overflow-hidden">
                             {item.profile_photo_url ? (
                               <img src={item.profile_photo_url} alt="Profile" className="h-full w-full object-cover" />
                             ) : (
                               <User size={16} className="m-2 text-orange-600" />
                             )}
                           </div>
                          <span>{item.name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`rounded-full px-2 py-1 text-xs font-bold ${item.status === 'ONLINE' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600'}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-neutral-600">{item.completed_consultations}</td>
                        <td className="px-6 py-4 font-bold text-neutral-900">{formatINR(item.gross_billing)}</td>
                        <td className="px-6 py-4 font-bold text-orange-600">{formatINR(item.astrologer_earnings)}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 font-bold text-neutral-900 flex items-center space-x-3">
                           <div className="h-8 w-8 rounded-full bg-blue-100 overflow-hidden">
                             {item.profile_photo_url ? (
                               <img src={item.profile_photo_url} alt="Profile" className="h-full w-full object-cover" />
                             ) : (
                               <User size={16} className="m-2 text-blue-600" />
                             )}
                           </div>
                           <span>{item.name}</span>
                        </td>
                        <td className="px-6 py-4 text-neutral-600 font-semibold">{item.experience_years === 0 ? '< 1 Year' : `${item.experience_years} Years`}</td>
                        <td className="px-6 py-4 text-neutral-500 text-xs">{(item.skills || []).join(', ')}</td>
                        <td className="px-6 py-4 text-neutral-500">{new Date(item.submitted_at || item.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={(e) => { e.stopPropagation(); setSelectedApp(item); }} className="rounded-lg bg-neutral-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-neutral-800 transition-colors">
                            Review Request
                          </button>
                        </td>
                      </>
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

      {/* Review Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[24px] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-black text-gray-900">{activeTab === 'live' ? 'Astrologer Details' : 'Review Application'}</h2>
              <button onClick={() => setSelectedApp(null)} className="p-2 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Profile Info */}
              <div className="flex items-center space-x-4 bg-gray-50 p-4 rounded-[16px]">
                <img src={selectedApp.profile_photo_url || 'https://via.placeholder.com/150'} alt="Photo" className="w-20 h-20 rounded-full object-cover border border-gray-200 shadow-sm" />
                <div>
                  <h3 className="text-lg font-black text-gray-900">{selectedApp.name || selectedApp.display_name}</h3>
                  <p className="text-sm text-gray-500 font-semibold">{selectedApp.email} • {selectedApp.phone}</p>
                  <p className="text-sm font-bold text-orange-600 mt-1">
                    {selectedApp.experience_years === 0 
                      ? '< 1 Year' 
                      : (selectedApp.experience_years 
                          ? `${selectedApp.experience_years} Years` 
                          : (String(selectedApp.experience).includes('Year') ? selectedApp.experience : `${selectedApp.experience} Years`))} Experience
                  </p>
                </div>
              </div>

              {/* Bio & Skills */}
              <div>
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">About Astrologer</h4>
                <p className="text-sm text-gray-700 bg-white border border-gray-100 p-4 rounded-[12px] leading-relaxed">{selectedApp.about}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedApp.skills?.map((s: string, idx: number) => <span key={`skill-${idx}`} className="px-2.5 py-1 bg-blue-50 text-blue-700 font-bold text-xs rounded-full">{s}</span>)}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Languages</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedApp.languages?.map((s: string, idx: number) => <span key={`lang-${idx}`} className="px-2.5 py-1 bg-purple-50 text-purple-700 font-bold text-xs rounded-full">{s}</span>)}
                  </div>
                </div>
              </div>

              {/* Consultation Modes & Pricing & Qualification */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Qualification</h4>
                  <p className="text-sm text-gray-900 font-semibold">{selectedApp.qualification || 'Not provided'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Requested Pricing</h4>
                  <p className="text-sm text-gray-900 font-semibold">{selectedApp.requested_price_per_minute ? `₹${selectedApp.requested_price_per_minute}/min` : 'Not provided'}</p>
                </div>
                <div className="col-span-2">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Consultation Modes</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedApp.consultation_modes?.map((s: string, idx: number) => <span key={`mode-${idx}`} className="px-2.5 py-1 bg-green-50 text-green-700 font-bold text-xs rounded-full">{s}</span>)}
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div>
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Verification Documents</h4>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setPreviewImage(getPublicUrl(selectedApp.pan_document_path, 'astrologer-verification'))} className="flex items-center text-left p-3 border border-gray-200 rounded-[12px] hover:border-orange-500 hover:bg-orange-50 transition-colors group">
                    <div className="bg-gray-100 p-2 rounded-lg group-hover:bg-white text-gray-500 group-hover:text-orange-600 mr-3">
                      <FileImage size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 group-hover:text-orange-700">PAN Card</p>
                      <p className="text-xs font-semibold text-gray-400">{selectedApp.pan_number || 'View Document'}</p>
                    </div>
                  </button>
                  {selectedApp.certificate_paths?.map((path: string, i: number) => (
                    <button key={i} onClick={() => setPreviewImage(getPublicUrl(path, 'astrologer-verification'))} className="flex items-center text-left p-3 border border-gray-200 rounded-[12px] hover:border-orange-500 hover:bg-orange-50 transition-colors group">
                      <div className="bg-gray-100 p-2 rounded-lg group-hover:bg-white text-gray-500 group-hover:text-orange-600 mr-3">
                        <FileText size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 group-hover:text-orange-700">Certificate {i+1}</p>
                        <p className="text-xs font-semibold text-gray-400">View Document</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bank Details */}
              {(selectedApp.bank_account_holder_name || selectedApp.bank_account_number) && (
                <div>
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Bank Details</h4>
                  <div className="bg-white border border-gray-100 rounded-[12px] p-4 flex flex-col space-y-3">
                    <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                      <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Account Holder</span>
                      <span className="text-sm text-gray-900 font-black">{selectedApp.bank_account_holder_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                      <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Bank Name</span>
                      <span className="text-sm text-gray-900 font-black">{selectedApp.bank_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                      <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Account Number</span>
                      <span className="text-sm text-gray-900 font-black">{selectedApp.bank_account_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">IFSC Code</span>
                      <span className="text-sm text-gray-900 font-black">{selectedApp.bank_ifsc_code || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex items-center justify-end space-x-3 bg-gray-50/50">
              {activeTab === 'approvals' && (
                <>
                  <button 
                    onClick={() => handleReject(selectedApp.id)}
                    className="px-6 py-2.5 border-2 border-red-200 bg-white text-red-600 font-black rounded-full hover:bg-red-50 transition-colors flex items-center space-x-2"
                  >
                    <XCircle size={18} />
                    <span>Reject</span>
                  </button>
                  <button 
                    onClick={() => handleApprove(selectedApp.id)}
                    className="px-6 py-2.5 bg-green-600 text-white font-black rounded-full hover:bg-green-700 transition-colors shadow-[0_4px_12px_rgba(22,163,74,0.3)] flex items-center space-x-2"
                  >
                    <CheckCircle size={18} />
                    <span>Approve & Activate</span>
                  </button>
                </>
              )}
              {activeTab === 'live' && (
                <>
                  <button 
                    onClick={() => {
                       if (window.confirm('Are you sure you want to deactivate this astrologer?')) {
                         toggleStatus(selectedApp.astrologer_id, 'DEACTIVATED').then(() => setSelectedApp(null));
                       }
                    }}
                    className="px-6 py-2.5 border-2 border-red-200 bg-white text-red-600 font-black rounded-full hover:bg-red-50 transition-colors flex items-center space-x-2"
                  >
                    <span>Deactivate</span>
                  </button>
                  <button 
                    onClick={() => setSelectedApp(null)}
                    className="px-6 py-2.5 bg-neutral-900 text-white font-black rounded-full hover:bg-neutral-800 transition-colors flex items-center space-x-2"
                  >
                    <span>Close Details</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Overlay */}
      {previewImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={() => setPreviewImage(null)}>
          <button onClick={() => setPreviewImage(null)} className="absolute top-6 right-6 p-2 text-white/50 hover:text-white transition-colors">
            <X size={32} />
          </button>
          <img src={previewImage} alt="Document Preview" className="max-w-full max-h-[90vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
