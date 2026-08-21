import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, CheckCircle2, Sparkles, Zap, Shield, Crown, Wallet as WalletIcon, CreditCard } from 'lucide-react';
import { Screen } from '../types';
import { useWallet } from '../contexts/WalletContext';
import { ApiClient } from '../services/api/apiClient';
import { supabase } from '../lib/supabase';

interface SubscriptionScreenProps {
  onNavigate: (screen: Screen) => void;
}

export default function SubscriptionScreen({ onNavigate }: SubscriptionScreenProps) {
  const { wallet, refreshWallet } = useWallet();
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch user plan and usage
      const res = await ApiClient.get<any>('/api/v1/subscriptions/my-plan');
      if (res) {
        setCurrentPlan(res.subscription);
        setUsage(res.usage);
      }

      // Fetch all available plans
      const plansRes = await ApiClient.get<any[]>('/api/v1/subscriptions/plans');
      if (plansRes && Array.isArray(plansRes)) {
        setAvailablePlans(plansRes);
      }
    } catch (error) {
      console.error('Failed to fetch subscription data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleWalletUpgrade = async () => {
    if (!selectedPlan || isProcessing) return;
    
    if (wallet.balance < selectedPlan.price) {
      // Instead of failing, we can guide them to wallet screen
      onNavigate('wallet');
      return;
    }

    if (!window.confirm(`Are you sure you really want this subscription?\n\nProceed to buy the AI Nova ${selectedPlan.name} plan for ₹${selectedPlan.price}?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      await ApiClient.post('/api/v1/subscriptions/upgrade/wallet', { body: { plan: selectedPlan.name } });
      setSuccessToast(`Successfully upgraded to ${selectedPlan.name}!`);
      setShowPaymentSheet(false);
      window.alert(`Congratulations!\n\nYour AI Nova ${selectedPlan.name} subscription is now active.`);
      fetchData();
      refreshWallet();
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (error: any) {
      setErrorToast(error.message || 'Upgrade failed');
      setTimeout(() => setErrorToast(null), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const getUpgradePlans = () => {
    // Only show plans that cost more than 0
    return availablePlans.filter(p => p.price > 0 && p.is_active);
  };

  const upgradePlans = getUpgradePlans();

  return (
    <div className="h-full bg-neutral-50 flex flex-col relative">
      {/* Header */}
      <div className="pt-12 pb-4 px-6 bg-white shrink-0 relative z-10 rounded-b-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => onNavigate('home')} className="p-2 -ml-2 text-neutral-400 hover:text-neutral-800 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 rounded-full border border-orange-100/50">
            <Sparkles size={14} className="text-orange-500" />
            <span className="text-[13px] font-[600] text-orange-600">AI Subscription</span>
          </div>
          <div className="w-10"></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 pb-32">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Plan Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-100">
              <h3 className="text-[14px] font-[600] text-neutral-500 mb-1">Current Plan</h3>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-2xl font-[800] text-neutral-900 tracking-tight">AI Nova {currentPlan?.plan || 'FREE'}</h2>
                <div className="px-2 py-0.5 bg-green-50 text-green-600 text-[11px] font-[700] uppercase tracking-wider rounded-full border border-green-100">
                  Active
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-[13px] font-[600] text-neutral-600">Daily AI Limit</span>
                  <span className="text-[13px] font-[700] text-neutral-900">{usage?.used || 0} / {usage?.limit || 5} Questions</span>
                </div>
                <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, ((usage?.used || 0) / (usage?.limit || 5)) * 100)}%` }}
                  />
                </div>
                <p className="text-[12px] text-neutral-400">Resets daily at midnight</p>
              </div>
            </div>

            {/* Plans List */}
            {upgradePlans.length > 0 && (
              <>
                <h3 className="text-[16px] font-[700] text-neutral-900 mt-8 mb-4">Upgrade Your AI Experience</h3>
                
                <div className="space-y-4">
                  {upgradePlans.map((plan) => {
                    const isSelected = selectedPlan?.id === plan.id;
                    const isPremium = plan.is_premium_ui;

                    return (
                      <div 
                        key={plan.id}
                        className={`rounded-3xl p-6 border-2 transition-all cursor-pointer relative overflow-hidden ${
                          isPremium 
                            ? (isSelected ? 'bg-neutral-900 border-[#FFD700] shadow-lg' : 'bg-neutral-900 border-neutral-800')
                            : (isSelected ? 'bg-white border-orange-500 shadow-md' : 'bg-white border-neutral-100')
                        }`}
                        onClick={() => setSelectedPlan(plan)}
                      >
                        {isPremium && <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/10 rounded-full blur-2xl -mr-10 -mt-10" />}
                        
                        <div className="flex justify-between items-start mb-4 relative z-10">
                          <div>
                            <h3 className={`text-lg font-[800] flex items-center gap-2 ${isPremium ? 'text-white' : 'text-neutral-900'}`}>
                              {isPremium ? <Crown size={18} className="text-[#FFD700]" /> : <Zap size={18} className="text-orange-500" />}
                              {plan.name} Plan
                            </h3>
                            <p className={`text-[13px] mt-1 ${isPremium ? 'text-neutral-400' : 'text-neutral-500'}`}>{plan.description}</p>
                          </div>
                          <div className="text-right">
                            <div className={`text-xl font-[800] ${isPremium ? 'text-white' : 'text-neutral-900'}`}>₹{plan.price}</div>
                            <div className={`text-[11px] font-[600] uppercase tracking-wide ${isPremium ? 'text-neutral-500' : 'text-neutral-400'}`}>/ month</div>
                          </div>
                        </div>

                        <ul className="space-y-2 mt-4 relative z-10">
                          {(() => {
                            let f = plan.features || [];
                            if (typeof f === 'string') {
                              try { f = JSON.parse(f); } catch (e) { f = [f]; }
                            }
                            if (!Array.isArray(f)) f = [];
                            return f.map((feature: string, idx: number) => (
                              <li key={idx} className={`flex items-center gap-2 text-[13px] font-[500] ${isPremium ? 'text-neutral-300' : 'text-neutral-600'}`}>
                                <CheckCircle2 size={16} className={`${isPremium ? 'text-[#FFD700]' : 'text-green-500'} shrink-0`} />
                                {feature}
                              </li>
                            ));
                          })()}
                        </ul>
                      </div>
                    );
                  })}
                </div>

                <button
                  disabled={!selectedPlan || currentPlan?.plan === selectedPlan?.name}
                  onClick={() => setShowPaymentSheet(true)}
                  className="w-full h-14 bg-[#FF8A00] disabled:bg-neutral-200 disabled:text-neutral-400 text-white rounded-2xl font-[700] text-[15px] transition-all flex items-center justify-center gap-2 mt-8 shadow-[0_8px_20px_rgba(255,138,0,0.2)] disabled:shadow-none"
                >
                  {currentPlan?.plan === selectedPlan?.name ? 'Current Plan' : 'Proceed to Payment'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Payment Bottom Sheet */}
      <AnimatePresence>
        {showPaymentSheet && selectedPlan && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPaymentSheet(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm z-40" 
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] p-6 z-50 shadow-2xl"
            >
              <h3 className="text-lg font-[800] text-neutral-900 mb-6">Complete Payment</h3>
              
              <div className="space-y-3">
                <button 
                  onClick={handleWalletUpgrade}
                  disabled={isProcessing}
                  className="w-full p-4 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <WalletIcon size={20} className="text-orange-500" />
                    </div>
                    <div className="text-left">
                      <div className="text-[14px] font-[700] text-neutral-900">Wallet Balance</div>
                      <div className="text-[12px] font-[500] text-neutral-500">Available: ₹{wallet.balance}</div>
                    </div>
                  </div>
                  {wallet.balance < selectedPlan.price ? (
                    <span className="text-[11px] font-[700] text-red-500 bg-red-50 px-2 py-1 rounded-md">Recharge</span>
                  ) : (
                    <span className="text-[11px] font-[700] text-green-600 bg-green-50 px-2 py-1 rounded-md">Pay ₹{selectedPlan.price}</span>
                  )}
                </button>

                <button 
                  onClick={() => onNavigate('wallet')}
                  disabled={isProcessing}
                  className="w-full p-4 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <CreditCard size={20} className="text-blue-500" />
                    </div>
                    <div className="text-left">
                      <div className="text-[14px] font-[700] text-neutral-900">Direct Recharge</div>
                      <div className="text-[12px] font-[500] text-neutral-500">Add funds via UPI/Cards</div>
                    </div>
                  </div>
                </button>
              </div>

              {isProcessing && (
                <div className="mt-6 flex justify-center">
                  <div className="w-6 h-6 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toasts */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-6 left-6 right-6 bg-[#000000] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 z-[60]"
          >
            <CheckCircle2 size={18} className="text-green-400 shrink-0" />
            <p className="text-[13px] font-[500]">{successToast}</p>
          </motion.div>
        )}
        {errorToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-6 left-6 right-6 bg-[#EF4444] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 z-[60]"
          >
            <div className="w-5 h-5 rounded-full border-2 border-white/30 flex items-center justify-center shrink-0">
              <span className="text-white text-[10px] font-bold">!</span>
            </div>
            <p className="text-[13px] font-[500]">{errorToast}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
