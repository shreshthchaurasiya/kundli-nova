import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Menu, Wallet, Filter, Sparkles, Plus, MessageCircle, ArrowLeft, X, History } from 'lucide-react';
import { Screen } from '../types';
import { TopAstrologerCard } from './HomeScreen';
import { useWallet } from '../contexts/WalletContext';
import { useAstrologerPartner } from '../features/astrologer';

interface ChatListScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
  onOpenDrawer?: () => void;
}

export default function ChatListScreen({ onNavigate, onOpenDrawer }: ChatListScreenProps) {
  const { wallet } = useWallet();
  const { directory: astrologers } = useAstrologerPartner();
  const walletBalance = wallet.balance;
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const listContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const listCardVariants = {
    hidden: { opacity: 0, y: 16, scale: 0.98 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 26
      }
    },
    exit: { 
      opacity: 0, 
      y: -12, 
      scale: 0.98,
      transition: {
        duration: 0.2
      }
    }
  };

  const filteredAstrologers = astrologers.filter((astro) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = query === '' || 
      astro.name.toLowerCase().includes(query) || 
      astro.skills.some(skill => skill.toLowerCase().includes(query)) ||
      astro.languages.some(lang => lang.toLowerCase().includes(query));

    const matchesFilter = !activeFilter || astro.skills.includes(activeFilter);

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex-1 relative overflow-hidden bg-[#FAFAFA] selection:bg-[#FF8A00]/20 flex flex-col h-full">
      <div className="flex flex-col flex-1 overflow-y-auto no-scrollbar pb-24">
        
        {/* App Bar (Copied exactly from HomeScreen) */}
        <div className="flex items-center justify-between px-[20px] py-[16px] bg-[#FFFFFF]/90 backdrop-blur-md sticky top-0 z-30 border-b border-gray-100/60 shadow-[0_2px_12px_rgba(0,0,0,0.015)] min-h-[70px]">
          {showSearch ? (
            <div className="flex items-center flex-1 space-x-2">
              <button 
                onClick={() => { setShowSearch(false); setSearchQuery(''); }} 
                className="p-1 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex-1 bg-gray-50 rounded-full px-4 py-2 flex items-center space-x-2 border border-gray-100 focus-within:bg-white focus-within:border-[#FF8A00]/20 transition-all">
                <Search size={16} className="text-gray-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name or skill..." 
                  className="bg-transparent border-none focus:outline-none text-xs w-full text-gray-800 placeholder:text-gray-400 font-semibold" 
                  autoFocus
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="p-0.5 rounded-full hover:bg-gray-200">
                    <X size={12} className="text-gray-400" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => onOpenDrawer?.()} 
                className="p-[8px] -ml-[8px] rounded-full text-[#111827] hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <Menu size={22} strokeWidth={2.5} />
              </motion.button>
              
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => onNavigate('wallet')}
                  className="flex items-center space-x-1.5 border border-gray-300 rounded-full pl-3 pr-1 py-1 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-[14px] font-semibold text-[#111827]">₹{walletBalance}</span>
                  <div className="w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center">
                    <Plus size={14} strokeWidth={3} />
                  </div>
                </button>
                
                <button 
                  onClick={() => setShowSearch(true)} 
                  className="text-gray-600 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-gray-50"
                >
                  <Search size={22} strokeWidth={2} />
                </button>
                
                <button 
                  onClick={() => onNavigate('chat-history')}
                  className="text-gray-600 hover:text-gray-900 transition-colors relative"
                >
                  <History size={22} strokeWidth={2} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white px-4 py-3 border-b border-gray-100 flex items-center space-x-3 overflow-x-auto no-scrollbar shrink-0">
          <button className="flex items-center space-x-1.5 px-4 py-1.5 border border-gray-200 rounded-full shrink-0 hover:bg-gray-50 transition-colors">
            <Filter size={14} className="text-gray-600" />
            <span className="text-xs font-semibold text-gray-700">Filter</span>
          </button>
          
          {['All', 'NEW!', 'Love', 'Education', 'Career', 'Marriage'].map((filter) => {
            const isActive = (!activeFilter && filter === 'All') || activeFilter === filter;
            return (
              <button 
                key={filter}
                onClick={() => setActiveFilter(filter === 'All' ? null : filter)}
                className={`flex items-center space-x-1.5 px-4 py-1.5 border rounded-full shrink-0 transition-colors ${
                  isActive
                    ? 'border-[#FF8A00] bg-[#FFF9E6] text-[#D68B00]' 
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {filter === 'All' && <span className="text-yellow-500 mr-1 text-[14px]">⊞</span>}
                {filter === 'NEW!' && <Sparkles size={12} className="text-[#00C29F] mr-1" />}
                {filter === 'Love' && <span className="text-red-400 mr-1 text-[12px]">♥</span>}
                <span className="text-xs font-semibold">{filter}</span>
              </button>
            );
          })}
        </div>

        <div className="px-[20px] pt-[16px]">
          {/* Astrologers List (Using TopAstrologerCard from HomeScreen) */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFilter || searchQuery || 'all'}
              variants={listContainerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="flex flex-col space-y-[14px] pb-4 pt-[4px]"
            >
              {filteredAstrologers.length > 0 ? (
                filteredAstrologers.map((astro) => (
                  <motion.div
                    key={astro.id}
                    variants={listCardVariants}
                    layout
                  >
                    <TopAstrologerCard 
                      astro={astro} 
                      onClick={() => onNavigate('astrologer-profile', { astrologerId: astro.id })} 
                      onChat={() => onNavigate('consultation-chat', { astrologerId: astro.id })} 
                    />
                  </motion.div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
                    <Search size={20} className="text-gray-400" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-800 mb-1">No Astrologers Found</h3>
                  <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
                    We couldn't find any experts matching your query.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
