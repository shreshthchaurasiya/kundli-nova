import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, Search, Wallet, X, ChevronRight, Phone, BookHeart, BookOpen, Share2, Star, Heart, HelpCircle, FileText, LogOut } from 'lucide-react';
import { Screen } from '../types';
import { useProfile } from '../contexts/ProfileContext';

interface CategoryScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
}

const SKILLS = [
  { id: 'astrology', label: 'Astrology', bg: 'bg-[#EFF6FF]', icon: '🔮' },
  { id: 'baby-naming', label: 'Baby Naming', bg: 'bg-[#FDF2F8]', icon: '👶' },
  { id: 'energy-healing', label: 'Energy Healing', bg: 'bg-[#F0FDF4]', icon: '🧘‍♀️' },
  { id: 'face-reading', label: 'Face Reading', bg: 'bg-[#EFF6FF]', icon: '👤' },
  { id: 'logo-analysis', label: 'Logo Analysis', bg: 'bg-[#FEF2F2]', icon: '🎨' },
  { id: 'manifestation', label: 'Manifestation', bg: 'bg-[#FAF5FF]', icon: '✨' },
  { id: 'mobile-numero', label: 'Mobile Numero', bg: 'bg-[#FFFBEB]', icon: '📱' },
  { id: 'numerology', label: 'Numerology', bg: 'bg-[#FFFBEB]', icon: '🔢' },
  { id: 'palmistry', label: 'Palmistry', bg: 'bg-[#F0FDF4]', icon: '✋' },
  { id: 'psychology', label: 'Psychology', bg: 'bg-[#FAF5FF]', icon: '🧠' },
  { id: 'signature', label: 'Signature Analysis', bg: 'bg-[#EFF6FF]', icon: '✍️' },
  { id: 'tarot', label: 'Tarot Reading', bg: 'bg-[#FAF5FF]', icon: '🃏' },
  { id: 'tattoo', label: 'Tattoo Analysis', bg: 'bg-[#FDF2F8]', icon: '✒️' },
  { id: 'vastu', label: 'Vastu Analysis', bg: 'bg-[#F8FAFC]', icon: '🏠' },
  { id: 'vishnu', label: 'Vishnu Sahasranama', bg: 'bg-[#FFFBEB]', icon: '🕉️' },
];

const SERVICES = [
  { id: 'marriage', label: 'Marriage', bg: 'bg-[#EFF6FF]', icon: '💍' },
  { id: 'career', label: 'Career', bg: 'bg-[#FDF2F8]', icon: '💼' },
  { id: 'relationship', label: 'Relationship', bg: 'bg-[#FEF2F2]', icon: '❤️' },
  { id: 'money', label: 'Money', bg: 'bg-[#F0FDF4]', icon: '💰' },
  { id: 'health', label: 'Health', bg: 'bg-[#EFF6FF]', icon: '🏥' },
  { id: 'dream', label: 'Dream', bg: 'bg-[#FAF5FF]', icon: '💭' },
  { id: 'education', label: 'Education', bg: 'bg-[#F8FAFC]', icon: '🎓' },
  { id: 'family', label: 'Family', bg: 'bg-[#FFFBEB]', icon: '👨‍👩‍👧‍👦' },
];

const LANGUAGES = [
  { id: 'hindi', label: 'Hindi', script: 'हिंदी', bg: 'bg-[#F3F4F6]' },
  { id: 'english', label: 'English', script: 'English', bg: 'bg-[#F3F4F6]' },
  { id: 'marathi', label: 'Marathi', script: 'मराठी', bg: 'bg-[#F3F4F6]' },
  { id: 'tamil', label: 'Tamil', script: 'தமிழ்', bg: 'bg-[#F3F4F6]' },
  { id: 'bengali', label: 'Bengali', script: 'বাংলা', bg: 'bg-[#F3F4F6]' },
  { id: 'kannada', label: 'Kannada', script: 'ಕನ್ನಡ', bg: 'bg-[#F3F4F6]' },
  { id: 'gujarati', label: 'Gujarati', script: 'ગુજરાતી', bg: 'bg-[#F3F4F6]' },
  { id: 'malayalam', label: 'Malayalam', script: 'മലയാളം', bg: 'bg-[#F3F4F6]' },
];

export default function CategoryScreen({ onNavigate }: CategoryScreenProps) {
  const { profile } = useProfile();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    // profile is accessed from useProfile
    setProfileData(profile);
  }, []);

  const userName = profileData?.name || 'Guest User';
  const userPhone = profileData?.phone || '+91 - Not provided';

  const renderSectionHeader = (title: string, showViewAll: boolean = false) => (
    <div className="flex items-center justify-between mb-[16px] px-[20px] mt-[24px]">
      <h2 className="text-[20px] font-bold text-[#111827]">{title}</h2>
      {showViewAll && (
        <button className="text-[13px] font-medium text-[#4B5563] flex items-center group">
          View all <ChevronRight size={14} className="ml-[2px] group-active:translate-x-1 transition-transform" />
        </button>
      )}
    </div>
  );

  return (
    <div className="flex-1 relative overflow-hidden bg-[#FFFFFF] selection:bg-[#FF8A00]/20 flex flex-col">
      <div className="flex flex-col flex-1 overflow-y-auto no-scrollbar pb-24">
        {/* App Bar */}
        <div className="flex items-center justify-between px-[20px] py-[16px] bg-[#FFFFFF] sticky top-0 z-30">
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

        <div className="px-[20px] pt-[8px]">
          <h1 className="text-[14px] font-medium text-[#6B7280]">Popular</h1>
          <h2 className="text-[24px] font-bold text-[#111827] leading-tight mt-[4px]">What guide are you<br />looking for ?</h2>
        </div>

        {renderSectionHeader('Skill', true)}
        <div className="grid grid-cols-4 gap-y-[20px] gap-x-[12px] px-[20px]">
          {SKILLS.map((skill) => (
            <div 
              key={skill.id} 
              onClick={() => onNavigate('category-detail', { category: skill.label })}
              className="flex flex-col items-center cursor-pointer active:scale-95 transition-transform"
            >
              <div className={`w-full aspect-square rounded-[18px] ${skill.bg} flex items-center justify-center mb-[8px] text-[32px]`}>
                 {skill.icon}
              </div>
              <span className="text-[11px] font-medium text-[#111827] text-center leading-tight line-clamp-2 px-[4px]">{skill.label}</span>
            </div>
          ))}
        </div>

        {renderSectionHeader('Service', true)}
        <div className="grid grid-cols-4 gap-y-[20px] gap-x-[12px] px-[20px]">
          {SERVICES.map((service) => (
            <div 
              key={service.id} 
              onClick={() => onNavigate('category-detail', { category: service.label })}
              className="flex flex-col items-center cursor-pointer active:scale-95 transition-transform"
            >
              <div className={`w-full aspect-square rounded-[18px] ${service.bg} flex items-center justify-center mb-[8px] text-[32px]`}>
                 {service.icon}
              </div>
              <span className="text-[11px] font-medium text-[#111827] text-center leading-tight">{service.label}</span>
            </div>
          ))}
        </div>

        {renderSectionHeader('Language', true)}
        <div className="grid grid-cols-4 gap-y-[20px] gap-x-[12px] px-[20px] mb-[16px]">
          {LANGUAGES.map((lang) => (
            <div 
              key={lang.id} 
              onClick={() => onNavigate('astrologers')} // Assuming filtering logic goes here later
              className="flex flex-col items-center cursor-pointer active:scale-95 transition-transform"
            >
              <div className={`w-full aspect-square rounded-[18px] ${lang.bg} flex flex-col items-center justify-center mb-[8px]`}>
                 <span className="text-[18px] font-bold text-[#111827] mb-[2px]">{lang.script}</span>
              </div>
              <span className="text-[11px] font-medium text-[#111827] text-center">{lang.label}</span>
            </div>
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
