import { useState, useEffect } from 'react';
import { Search, Loader2, Crown, Plus, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';


export function SubscriptionsScreen() {
  const [activeTab, setActiveTab] = useState<'USERS' | 'PLANS'>('USERS');
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState<any>(null);

  // Form states for creating a plan
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    price: 0,
    ai_limit_per_day: 5,
    features: [''],
    is_premium_ui: false,
    is_active: true
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'USERS') {
        const [subsRes, statsRes] = await Promise.all([
          supabase.rpc('get_admin_subscriptions', { p_filters: { search } }),
          supabase.rpc('get_admin_subscription_stats')
        ]);
        
        if (subsRes.error) throw subsRes.error;
        if (statsRes.error) throw statsRes.error;
        
        setSubscriptions(subsRes.data.items || []);
        setStats(statsRes.data);
      } else {
        const { data, error } = await supabase.rpc('get_admin_subscription_plans');
        if (error) throw error;
        setPlans(data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, search]);

  const handleSavePlan = async () => {
    try {
      const featuresJson = JSON.stringify(planForm.features.filter(f => f.trim() !== ''));
      if (editingPlan) {
        await supabase.rpc('admin_update_subscription_plan', {
          p_id: editingPlan.id,
          p_name: planForm.name,
          p_description: planForm.description,
          p_price: Number(planForm.price),
          p_ai_limit_per_day: Number(planForm.ai_limit_per_day),
          p_features: featuresJson,
          p_is_premium_ui: planForm.is_premium_ui,
          p_is_active: planForm.is_active
        });
      } else {
        await supabase.rpc('admin_create_subscription_plan', {
          p_name: planForm.name.toUpperCase(),
          p_description: planForm.description,
          p_price: Number(planForm.price),
          p_ai_limit_per_day: Number(planForm.ai_limit_per_day),
          p_features: featuresJson,
          p_is_premium_ui: planForm.is_premium_ui
        });
      }
      setShowPlanModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save plan', err);
      alert('Failed to save plan');
    }
  };

  const openNewPlanModal = () => {
    setEditingPlan(null);
    setPlanForm({
      name: '',
      description: '',
      price: 0,
      ai_limit_per_day: 5,
      features: [''],
      is_premium_ui: false,
      is_active: true
    });
    setShowPlanModal(true);
  };

  const openEditPlanModal = (plan: any) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      description: plan.description || '',
      price: plan.price,
      ai_limit_per_day: plan.ai_limit_per_day,
      features: plan.features || [''],
      is_premium_ui: plan.is_premium_ui,
      is_active: plan.is_active
    });
    setShowPlanModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Subscriptions</h1>
          <p className="text-muted-foreground mt-1">Manage user AI subscription plans and limits.</p>
        </div>
      </div>

      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('USERS')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'USERS' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Active Subscribers
        </button>
        <button
          onClick={() => setActiveTab('PLANS')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'PLANS' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Manage Plans
        </button>
      </div>

      {activeTab === 'USERS' ? (
        <div className="space-y-6">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border p-5 shadow-sm">
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Total Revenue</div>
                <div className="text-2xl font-black text-blue-600">₹{(stats.total_revenue || 0).toLocaleString('en-IN')}</div>
                <div className="text-xs text-gray-400 mt-1">From premium plans</div>
              </div>
              
              {stats.plan_counts?.map((p: any) => (
                <div key={p.plan} className="bg-white rounded-xl border p-5 shadow-sm">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">{p.plan} Subscribers</div>
                  <div className="text-2xl font-black text-gray-900">{p.count}</div>
                  <div className="text-xs text-gray-400 mt-1">Active users</div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-gray-50/50 flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 font-medium">User</th>
                  <th className="px-6 py-4 font-medium">Plan</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Payment</th>
                  <th className="px-6 py-4 font-medium">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading subscriptions...
                    </td>
                  </tr>
                ) : subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No subscriptions found.
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{sub.user_name || 'Unnamed'}</div>
                        <div className="text-gray-500 text-xs">{sub.user_email || sub.user_phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          {sub.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          sub.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium">₹{sub.amount || 0}</div>
                        <div className="text-gray-500 text-xs">{sub.payment_method || 'SYSTEM'}</div>
                      </td>
                      <td className="px-6 py-4">
                        {sub.expiry_date ? new Date(sub.expiry_date).toLocaleDateString() : 'Lifetime'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      ) : (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center">
            <h2 className="font-semibold text-gray-800">Available Plans</h2>
            <button
              onClick={openNewPlanModal}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              Add Plan
            </button>
          </div>

          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 font-medium">Name</th>
                  <th className="px-6 py-4 font-medium">Price</th>
                  <th className="px-6 py-4 font-medium">Limit/Day</th>
                  <th className="px-6 py-4 font-medium">UI Style</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading plans...
                    </td>
                  </tr>
                ) : plans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No plans configured.
                    </td>
                  </tr>
                ) : (
                  plans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {plan.name} {plan.is_default && <span className="ml-2 text-[10px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">DEFAULT</span>}
                      </td>
                      <td className="px-6 py-4">₹{plan.price}</td>
                      <td className="px-6 py-4">{plan.ai_limit_per_day} Questions</td>
                      <td className="px-6 py-4">
                        {plan.is_premium_ui ? (
                          <span className="flex items-center gap-1 text-yellow-600"><Crown size={14}/> Premium</span>
                        ) : (
                          <span className="text-gray-500">Standard</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          plan.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {plan.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openEditPlanModal(plan)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                        >
                          <Edit2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b sticky top-0 bg-white rounded-t-2xl z-10 flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingPlan ? 'Edit Plan' : 'Create Plan'}</h2>
              <button onClick={() => setShowPlanModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name (e.g. PRO, ELITE)</label>
                <input
                  type="text"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({...planForm, name: e.target.value.toUpperCase()})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="PRO"
                  disabled={!!editingPlan && editingPlan.is_default} // Default plan name cannot be changed easily
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={planForm.description}
                  onChange={(e) => setPlanForm({...planForm, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="For regular users"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹/month)</label>
                  <input
                    type="number"
                    value={planForm.price}
                    onChange={(e) => setPlanForm({...planForm, price: Number(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Daily Questions Limit</label>
                  <input
                    type="number"
                    value={planForm.ai_limit_per_day}
                    onChange={(e) => setPlanForm({...planForm, ai_limit_per_day: Number(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Features</label>
                {planForm.features.map((feat, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={feat}
                      onChange={(e) => {
                        const newF = [...planForm.features];
                        newF[idx] = e.target.value;
                        setPlanForm({...planForm, features: newF});
                      }}
                      className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      placeholder="e.g. 30 AI Questions per day"
                    />
                    <button
                      onClick={() => {
                        const newF = planForm.features.filter((_, i) => i !== idx);
                        setPlanForm({...planForm, features: newF.length ? newF : ['']});
                      }}
                      className="text-red-500 p-2 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setPlanForm({...planForm, features: [...planForm.features, '']})}
                  className="text-blue-600 text-sm font-medium hover:underline mt-1"
                >
                  + Add Feature
                </button>
              </div>

              <div className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  id="premiumUI"
                  checked={planForm.is_premium_ui}
                  onChange={(e) => setPlanForm({...planForm, is_premium_ui: e.target.checked})}
                  className="w-4 h-4 text-blue-600"
                />
                <label htmlFor="premiumUI" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                  Use Premium Dark UI (Gold/Black)
                </label>
              </div>

              {editingPlan && !editingPlan.is_default && (
                <div className="flex items-center gap-3 py-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={planForm.is_active}
                    onChange={(e) => setPlanForm({...planForm, is_active: e.target.checked})}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                    Plan is Active (Available for purchase)
                  </label>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={() => setShowPlanModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlan}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                disabled={!planForm.name}
              >
                Save Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
