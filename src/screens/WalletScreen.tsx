import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Wallet as WalletIcon, CreditCard, Clock, Gift, X, CheckCircle2 } from 'lucide-react';
import { Screen, WalletTransaction } from '../types';
import { walletStorage } from '../services/storage/walletStorage';

interface WalletScreenProps {
  onNavigate: (screen: Screen) => void;
}

export default function WalletScreen({ onNavigate }: WalletScreenProps) {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Helper to format date and time in the exact style of the mockup
  const formatTxDate = (date: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
    
    if (isToday) {
      return `Today, ${formattedHours}:${formattedMinutes} ${ampm}`;
    } else {
      const day = date.getDate();
      const month = months[date.getMonth()];
      return `${day} ${month}, ${formattedHours}:${formattedMinutes} ${ampm}`;
    }
  };

  // Initialize and load the wallet data from WalletRepository on component mount
  useEffect(() => {
    const walletState = walletStorage.getWalletState();
    setBalance(walletState.balance);
    setTransactions(walletState.transactions);

    const unsubscribe = walletStorage.subscribe((newState) => {
      setBalance(newState.balance);
      setTransactions(newState.transactions);
    });

    return unsubscribe;
  }, []);

  // Recharge Logic - Scalable function that updates state via Repository
  const executeRecharge = (amount: number) => {
    if (isNaN(amount) || amount <= 0) return;
    try {
      walletStorage.recharge(amount, 'Wallet Recharge');
      
      // Show success banner
      setSuccessToast(`₹${amount} added successfully!`);
      setTimeout(() => {
        setSuccessToast(null);
      }, 2800);
    } catch (e) {
      console.error('[WalletScreen] Recharge failed', e);
    }
  };

  const handleQuickRechargeClick = (amtStr: string) => {
    if (amtStr === 'Custom') {
      setIsCustomModalOpen(true);
    } else {
      const numericAmount = parseInt(amtStr.replace(/[^\d]/g, ''), 10);
      if (!isNaN(numericAmount)) {
        executeRecharge(numericAmount);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-y-auto no-scrollbar pb-20 relative">
      {/* Header */}
      <div className="bg-white px-6 py-4 sticky top-0 z-10 shadow-sm flex items-center">
        <button onClick={() => onNavigate('home')} className="p-2 -ml-2 mr-2 text-gray-700 active:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Wallet</h1>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6 space-y-6 flex-1">
        {/* Balance Card */}
        <div className="bg-gray-900 rounded-3xl p-6 text-white shadow-xl shadow-gray-900/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl" />
          <p className="text-gray-400 font-medium text-sm mb-1">Available Balance</p>
          <h2 className="text-4xl font-bold mb-6">
            ₹{balance.toLocaleString('en-IN')}
            <span className="text-xl text-gray-400">.00</span>
          </h2>
          <motion.button 
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsCustomModalOpen(true)}
            className="w-full bg-white text-gray-900 font-bold py-3 rounded-xl flex items-center justify-center space-x-2 cursor-pointer transition-colors active:bg-gray-100"
          >
            <WalletIcon size={20} />
            <span>Recharge Wallet</span>
          </motion.button>
        </div>

        {/* Quick Recharge */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Recharge</h3>
          <div className="grid grid-cols-3 gap-3">
            {['₹100', '₹200', '₹500', '₹1000', '₹2000', 'Custom'].map((amt, i) => (
              <motion.button 
                key={i} 
                whileTap={{ scale: 0.96 }}
                onClick={() => handleQuickRechargeClick(amt)}
                className={`py-3 rounded-2xl font-bold text-sm border cursor-pointer transition-all ${
                  i === 2 
                    ? 'bg-gray-900 text-white border-gray-900 shadow-md active:bg-gray-800' 
                    : 'bg-white text-gray-700 border-gray-200 active:bg-gray-50'
                }`}
              >
                {amt}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Offers */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center space-x-4">
          <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600">
            <Gift size={24} />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-indigo-900">Get 100% Extra!</h4>
            <p className="text-xs text-indigo-700">On your first recharge of ₹500 or more.</p>
          </div>
          <button onClick={() => executeRecharge(500)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors hover:bg-indigo-700 active:scale-95">
            Apply
          </button>
        </div>

        {/* Recent Transactions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Recent Transactions</h3>
            <button className="text-sm font-semibold text-gray-500">View All</button>
          </div>
          <div className="space-y-3">
            {transactions.length > 0 ? (
              transactions.map((tx) => (
                <div key={tx.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center space-x-4 shadow-[0_2px_10px_rgba(0,0,0,0.01)] animate-fadeIn">
                  <div className={`p-3 rounded-full ${tx.type === 'credit' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                    {tx.type === 'credit' ? <CreditCard size={20} /> : <Clock size={20} />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-gray-900">{tx.title}</h4>
                    <p className="text-xs text-gray-500">
                      {tx.createdAt ? formatTxDate(new Date(tx.createdAt)) : (tx.description || '')}
                    </p>
                  </div>
                  <span className={`font-bold ${tx.type === 'credit' ? 'text-green-600' : 'text-gray-900'}`}>
                    {tx.type === 'credit' ? `+₹${tx.amount}` : `-₹${tx.amount}`}
                  </span>
                </div>
              ))
            ) : (
              <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center flex flex-col items-center justify-center space-y-2">
                <Clock size={36} className="text-gray-300 stroke-[1.5] mb-1" />
                <p className="text-sm font-semibold text-gray-500">No transactions yet</p>
                <p className="text-xs text-gray-400">Recharge your wallet to see recent history.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic premium success toast notification */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="absolute top-20 left-6 right-6 bg-emerald-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl z-50 shadow-xl flex items-center space-x-3 border border-emerald-500/20"
          >
            <div className="bg-emerald-500/20 p-1.5 rounded-full text-emerald-300">
              <CheckCircle2 size={18} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-emerald-100/80 leading-none">Success</p>
              <p className="text-[13px] font-bold tracking-tight mt-1">{successToast}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Recharge Amount Modal (Slide-up bottom sheet) */}
      <AnimatePresence>
        {isCustomModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsCustomModalOpen(false);
                setCustomAmount('');
              }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center"
            >
              {/* Slide-up Container */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-white rounded-t-3xl p-6 pb-8 space-y-6 shadow-2xl relative z-50 max-w-[400px]"
              >
                {/* Drag Indicator handle */}
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto -mt-2 mb-4" />

                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Enter Custom Amount</h3>
                  <button 
                    onClick={() => {
                      setIsCustomModalOpen(false);
                      setCustomAmount('');
                    }}
                    className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-2xl font-bold text-gray-400">₹</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-2xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] transition-all"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-gray-400">Enter any custom amount to instantly top-up your Kundli Nova wallet balance.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setIsCustomModalOpen(false);
                      setCustomAmount('');
                    }}
                    className="py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const parsed = parseInt(customAmount, 10);
                      if (!isNaN(parsed) && parsed > 0) {
                        executeRecharge(parsed);
                        setIsCustomModalOpen(false);
                        setCustomAmount('');
                      }
                    }}
                    disabled={!customAmount || parseInt(customAmount, 10) <= 0}
                    className="py-3.5 bg-[#FF8A00] hover:bg-[#E07A00] disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors shadow-md shadow-[#FF8A00]/10 cursor-pointer"
                  >
                    Recharge
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
