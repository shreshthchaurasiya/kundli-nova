import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, Search, Wallet, X, ChevronRight, Phone, BookHeart, BookOpen, Share2, Star, Heart, HelpCircle, FileText, LogOut, ArrowLeft, Sparkles, Clock } from 'lucide-react';
import { Screen, Astrologer } from '../types';
import { useProfile } from '../contexts/ProfileContext';
import { ASTROLOGERS } from '../data';
import { TopAstrologerCard } from './HomeScreen';

interface CategoryDetailScreenProps {
  category: string;
  onNavigate: (screen: Screen, params?: any) => void;
}

export default function CategoryDetailScreen({ category, onNavigate }: CategoryDetailScreenProps) {
  const { profile } = useProfile();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    // profile is accessed from useProfile
    setProfileData(profile);
  }, []);

  const userName = profileData?.name || 'Guest User';
  const userPhone = profileData?.phone || '+91 - Not provided';

  return (
    <div className="flex-1 relative overflow-hidden bg-[#FAFAFA] selection:bg-[#FF8A00]/20 flex flex-col">
      <div className="flex flex-col flex-1 overflow-y-auto no-scrollbar pb-24">
        {/* App Bar */}
        <div className="flex items-center justify-between px-[20px] py-[16px] bg-[#FFFFFF] sticky top-0 z-30 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <button onClick={() => setIsDrawerOpen(true)} className="p-[8px] -ml-[8px] rounded-full text-[#111827] active:bg-gray-100 transition-colors">
            <Menu size={24} strokeWidth={2.5} />
          </button>
          <div className="flex items-center space-x-[8px]">
            <button className="p-[8px] rounded-full text-[#4B5563] active:bg-gray-100 transition-colors">
              <Search size={22} strokeWidth={2} />
            </button>
            <button 
              onClick={() => onNavigate('wallet')}
              className="flex items-center space-x-[6px] bg-[#FFFFFF] border border-[#E5E7EB] rounded-full px-[12px] py-[6px] active:bg-gray-50 transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
            >
              <Wallet size={18} strokeWidth={2} className="text-[#111827]" />
              <span className="text-[13px] font-bold text-[#111827]">₹0</span>
            </button>
          </div>
        </div>

        {/* Dynamic Category Header */}
        <div className="bg-[#E0F2FE] px-[20px] py-[16px]">
          <div className="flex items-center space-x-2">
            <button onClick={() => onNavigate('services')} className="p-[4px] -ml-[4px] text-[#0369A1] active:bg-blue-100 rounded-full transition-colors">
               <ArrowLeft size={20} />
            </button>
            <h1 className="text-[20px] font-bold text-[#0369A1] capitalize">{category}</h1>
          </div>
        </div>

        {/* Divider */}
        <div className="h-[1px] bg-[#E5E7EB] w-full"></div>

        <div className="px-[20px] pt-[16px] pb-[12px]">
          <h2 className="text-[14px] font-medium text-[#4B5563]">Select your astrologer</h2>
        </div>

        <div className="px-[20px] space-y-[16px] pb-[20px]">
          {ASTROLOGERS.map(astro => (
            <TopAstrologerCard 
              key={astro.id} 
              astro={astro} 
              onClick={() => onNavigate('astrologer-profile', { astrologerId: astro.id })}
              onChat={() => onNavigate('consultation-chat', { astrologerId: astro.id })}
            />
          ))}
        </div>
      </div>
      
      {/* Drawer Overlay */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="absolute inset-0 bg-[#111827]/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-y-0 left-0 w-[80%] max-w-[300px] bg-[#FFFFFF] z-50 shadow-2xl flex flex-col"
            >
              <div className="p-[24px] pt-[max(24px,env(safe-area-inset-top))] flex flex-col items-center border-b border-[#F3F4F6] relative">
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="absolute top-[20px] right-[20px] p-[8px] text-[#6B7280] bg-gray-50 rounded-full"
                >
                  <X size={20} strokeWidth={2.5} />
                </button>
                
                <div className="w-[80px] h-[80px] rounded-full bg-[#111827] text-white flex items-center justify-center text-[32px] font-bold mb-[16px] shadow-[0_4px_12px_rgba(17,24,39,0.15)]">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-[18px] font-bold text-[#111827]">{userName}</h2>
                <p className="text-[14px] text-[#6B7280] mt-[2px]">{userPhone}</p>
              </div>
              
              <div className="flex-1 overflow-y-auto py-[12px]">
                <DrawerItem icon={<Wallet size={20} />} label="Wallet" onClick={() => { setIsDrawerOpen(false); onNavigate('wallet'); }} />
                <DrawerItem icon={<Phone size={20} />} label="Consultations" />
                <DrawerItem icon={<BookHeart size={20} />} label="Bookmark" />
                <DrawerItem icon={<BookOpen size={20} />} label="My Courses" />
                
                <div className="h-[1px] bg-[#F3F4F6] my-[8px] mx-[24px]" />
                <p className="px-[24px] py-[8px] text-[12px] font-bold text-[#9CA3AF] uppercase tracking-wider">Other</p>
                
                <DrawerItem icon={<Share2 size={20} />} label="Share app" />
                <DrawerItem icon={<Star size={20} />} label="Rate app" />
                <DrawerItem icon={<Heart size={20} />} label="Follow us" />
                <DrawerItem icon={<HelpCircle size={20} />} label="Customer Support" />
                <DrawerItem icon={<FileText size={20} />} label="Privacy Policy" />
                
                <div className="h-[1px] bg-[#F3F4F6] my-[8px] mx-[24px]" />
                <DrawerItem icon={<LogOut size={20} />} label="Logout" isDanger onClick={() => { onNavigate('splash'); }} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

const DrawerItem = ({ icon, label, onClick, isDanger }: { icon: React.ReactNode, label: string, onClick?: () => void, isDanger?: boolean }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center space-x-[16px] px-[24px] py-[14px] active:bg-gray-50 transition-colors ${isDanger ? 'text-[#EF4444]' : 'text-[#4B5563]'}`}
  >
    <div className={`${isDanger ? 'text-[#EF4444]' : 'text-[#111827]'}`}>
      {icon}
    </div>
    <span className={`text-[15px] font-medium flex-1 text-left ${isDanger ? 'text-[#EF4444]' : 'text-[#111827]'}`}>{label}</span>
  </button>
);
