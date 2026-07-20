import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ChevronDown, Search, Check, ShieldCheck, Loader2 } from 'lucide-react';
import { Screen } from '../types';
import { useRepositories } from '../repositories/repositoryProvider';

// Indian States
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

interface CreateProfileScreenProps {
  onNavigate: (screen: Screen) => void;
}

const InputWrapper = ({ label, children, delay = 0 }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay }}
    className="flex flex-col mb-[20px]"
  >
    <label className="text-[14px] text-[#374151] font-semibold mb-[8px] ml-[4px]">{label}</label>
    {children}
  </motion.div>
);

import { useAuth } from '../auth';
import { useProfile } from '../contexts/ProfileContext';

export default function CreateProfileScreen({ onNavigate }: CreateProfileScreenProps) {
  const repositories = useRepositories();
  const { user } = useAuth();
  const { refreshProfile } = useProfile();
  
  const [name, setName] = useState(user?.user_metadata?.name || user?.user_metadata?.full_name || '');
  const [email] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [tob, setTob] = useState('');
  
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Sheet state
  const [activeSheet, setActiveSheet] = useState<'state' | null>(null);

  const handleStateSelect = (s: string) => {
    setState(s); setActiveSheet(null); setError('');
  };

  const renderSelector = (label: string, value: string, placeholder: string, disabled: boolean, onClick: () => void, icon?: any) => (
    <div 
      onClick={!disabled ? onClick : undefined}
      className={`relative h-[56px] w-full rounded-[16px] border ${disabled ? 'border-[#F3F4F6] bg-[#F9FAFB] opacity-60' : 'bg-[#FFFFFF] border-[#E5E7EB] cursor-pointer hover:border-[#D1D5DB]'} flex items-center px-[16px] transition-all duration-200 shadow-sm`}
    >
      {icon && <div className="mr-[12px] text-[#9CA3AF]">{icon}</div>}
      <div className={`flex-1 truncate text-[16px] ${value ? 'text-[#111827] font-medium' : 'text-[#9CA3AF]'}`}>
        {value || placeholder}
      </div>
      {!disabled && <ChevronDown size={18} className="text-[#9CA3AF]" />}
    </div>
  );

  return (
    <div className="relative flex flex-col h-[100dvh] w-full bg-[#FFFFFF] overflow-hidden font-sans antialiased selection:bg-[#FF8A00]/20">
      
      {/* Background SVG - Kept very subtle and fixed */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-[0.02] flex items-center justify-center">
        <svg className="w-[150%] h-[150%] max-w-none" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
          <g stroke="#1A1A1A" fill="none" strokeWidth="0.5">
            <ellipse cx="500" cy="500" rx="450" ry="200" transform="rotate(15 500 500)" strokeWidth="0.25" />
            <ellipse cx="500" cy="500" rx="600" ry="250" transform="rotate(-25 500 500)" strokeWidth="0.25" />
            <circle cx="500" cy="500" r="400" strokeWidth="0.25" />
            <circle cx="500" cy="500" r="390" strokeDasharray="1 4" strokeWidth="0.5" />
          </g>
        </svg>
      </div>

      {/* Top Navigation */}
      <div className="absolute top-0 left-0 w-full px-[20px] pt-[24px] sm:pt-[32px] z-20 flex items-center bg-gradient-to-b from-white/90 to-transparent pb-4">
        <button 
          onClick={() => onNavigate('otp')}
          className="p-[10px] -ml-[10px] rounded-full hover:bg-gray-50 active:bg-gray-100 transition-colors text-[#111827]"
        >
          <ArrowLeft size={24} strokeWidth={2} />
        </button>
      </div>

      <div className="flex-1 w-full h-full overflow-y-auto no-scrollbar z-10 pt-[80px] pb-[40px] px-[28px] sm:px-[32px]">
        <div className="max-w-[400px] mx-auto flex flex-col">
          
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-[26px] sm:text-[28px] font-bold text-[#111827] tracking-[-0.02em] leading-tight">
              Create Your Birth Profile
            </h1>
            <p className="mt-[10px] text-[15px] sm:text-[16px] text-[#6B7280] leading-[1.5] font-normal mb-[32px]">
              These details are required to generate accurate horoscope predictions and personalized astrological insights.
            </p>
          </motion.div>

          <form className="flex flex-col w-full pb-[40px]">
            {/* Full Name */}
            <InputWrapper label="Full Name" delay={0.1}>
              <div className="relative h-[56px] w-full bg-[#FFFFFF] rounded-[16px] border border-[#E5E7EB] flex items-center px-[16px] focus-within:border-[#FF8A00] focus-within:ring-1 focus-within:ring-[#FF8A00]/20 transition-all duration-200 shadow-sm">
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => {setName(e.target.value); setError('');}}
                  placeholder="Enter your full name" 
                  className="flex-1 bg-transparent border-none focus:outline-none text-[#111827] text-[16px] placeholder:text-[#9CA3AF] font-medium" 
                />
              </div>
            </InputWrapper>

            {/* Email (Read Only) */}
            <InputWrapper label="Email Address" delay={0.11}>
              <div className="relative h-[56px] w-full bg-[#F9FAFB] rounded-[16px] border border-[#E5E7EB] flex items-center px-[16px] shadow-sm opacity-80 cursor-not-allowed">
                <input 
                  type="email" 
                  value={email}
                  readOnly
                  placeholder="Email" 
                  className="flex-1 bg-transparent border-none focus:outline-none text-[#6B7280] text-[16px] font-medium pointer-events-none" 
                />
              </div>
            </InputWrapper>

            {/* Phone Number */}
            <InputWrapper label="Phone Number" delay={0.12}>
              <div className="relative h-[56px] w-full bg-[#FFFFFF] rounded-[16px] border border-[#E5E7EB] flex items-center px-[16px] focus-within:border-[#FF8A00] focus-within:ring-1 focus-within:ring-[#FF8A00]/20 transition-all duration-200 shadow-sm">
                <div className="flex items-center space-x-[8px] border-r border-[#E5E7EB] pr-[12px] mr-[12px]">
                  <span className="text-[18px] leading-none">🇮🇳</span>
                  <span className="text-[#111827] font-medium text-[15px]">+91</span>
                </div>
                <input 
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => {setPhone(e.target.value.replace(/\D/g, '')); setError('');}}
                  placeholder="Enter 10-digit number" 
                  className="flex-1 bg-transparent border-none focus:outline-none text-[#111827] text-[16px] placeholder:text-[#9CA3AF] font-medium" 
                />
              </div>
            </InputWrapper>

            {/* Gender */}
            <InputWrapper label="Gender" delay={0.15}>
              <div className="flex bg-[#F9FAFB] rounded-[16px] p-[6px] border border-[#E5E7EB]">
                {['Male', 'Female', 'Other'].map(g => (
                  <button 
                    key={g}
                    type="button"
                    onClick={() => {setGender(g); setError('');}}
                    className={`flex-1 h-[44px] rounded-[12px] flex items-center justify-center text-[15px] font-semibold transition-all duration-200 ${gender === g ? 'bg-[#FFFFFF] text-[#FF8A00] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#E5E7EB]/50' : 'text-[#6B7280] hover:text-[#374151]'}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </InputWrapper>

            {/* DOB & TOB Row */}
            <div className="flex flex-col sm:flex-row gap-0 sm:gap-[16px]">
              <div className="flex-1">
                <InputWrapper label="Date of Birth" delay={0.2}>
                  <div className="relative h-[56px] w-full bg-[#FFFFFF] rounded-[16px] border border-[#E5E7EB] flex items-center px-[16px] focus-within:border-[#FF8A00] focus-within:ring-1 focus-within:ring-[#FF8A00]/20 transition-all duration-200 shadow-sm">
                    <input 
                      type="date" 
                      value={dob}
                      onChange={(e) => {setDob(e.target.value); setError('');}}
                      className="flex-1 bg-transparent border-none focus:outline-none text-[#111827] text-[16px] font-medium w-full" 
                    />
                  </div>
                </InputWrapper>
              </div>
              <div className="flex-1">
                <InputWrapper label="Time of Birth" delay={0.25}>
                  <div className="relative h-[56px] w-full bg-[#FFFFFF] rounded-[16px] border border-[#E5E7EB] flex items-center px-[16px] focus-within:border-[#FF8A00] focus-within:ring-1 focus-within:ring-[#FF8A00]/20 transition-all duration-200 shadow-sm">
                    <input 
                      type="time" 
                      value={tob}
                      onChange={(e) => {setTob(e.target.value); setError('');}}
                      className="flex-1 bg-transparent border-none focus:outline-none text-[#111827] text-[16px] font-medium w-full" 
                    />
                  </div>
                </InputWrapper>
              </div>
            </div>

            {/* State */}
            <InputWrapper label="State" delay={0.3}>
              {renderSelector('State', state, 'Select State', false, () => setActiveSheet('state'))}
            </InputWrapper>

            {/* District */}
            <AnimatePresence>
              {state && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <InputWrapper label="District">
                    <div className="relative h-[56px] w-full bg-[#FFFFFF] rounded-[16px] border border-[#E5E7EB] flex items-center px-[16px] focus-within:border-[#FF8A00] focus-within:ring-1 focus-within:ring-[#FF8A00]/20 transition-all duration-200 shadow-sm">
                      <input 
                        type="text" 
                        value={district}
                        onChange={(e) => {setDistrict(e.target.value); setError('');}}
                        placeholder="Enter your district" 
                        className="flex-1 bg-transparent border-none focus:outline-none text-[#111827] text-[16px] placeholder:text-[#9CA3AF] font-medium" 
                      />
                    </div>
                  </InputWrapper>
                </motion.div>
              )}
            </AnimatePresence>

            {/* City */}
            <AnimatePresence>
              {district && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <InputWrapper label="Place of Birth (City/Town/Village)">
                    <div className="relative h-[56px] w-full bg-[#FFFFFF] rounded-[16px] border border-[#E5E7EB] flex items-center px-[16px] focus-within:border-[#FF8A00] focus-within:ring-1 focus-within:ring-[#FF8A00]/20 transition-all duration-200 shadow-sm">
                      <input 
                        type="text" 
                        value={city}
                        onChange={(e) => {setCity(e.target.value); setError('');}}
                        placeholder="Enter your city, town or village" 
                        className="flex-1 bg-transparent border-none focus:outline-none text-[#111827] text-[16px] placeholder:text-[#9CA3AF] font-medium" 
                      />
                    </div>
                  </InputWrapper>
                </motion.div>
              )}
            </AnimatePresence>


            {/* Complete Button */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-[20px] flex flex-col items-center">
              {error && (
                <div className="w-full mb-[16px] p-[12px] bg-red-50 text-red-600 rounded-[12px] text-[14px] font-medium text-center border border-red-100">
                  {error}
                </div>
              )}
              <button 
                type="button"
                onClick={async () => {
                  if (!name || !gender || !dob || !tob || !state || !district || !city) {
                    setError('Please fill all required fields');
                    return;
                  }
                  
                  setSaving(true);
                  setError('');

                  try {
                    await repositories.profile.saveProfile({
                      name,
                      email,
                      phone,
                      gender,
                      dob,
                      tob,
                      // Map to DB column names
                      state: state,           // backend maps → birth_state
                      district: district,     // backend maps → birth_district
                      city: city,             // backend maps → birth_city
                    });
                    if (refreshProfile) {
                      await refreshProfile();
                    }
                    onNavigate('welcome-gift');
                  } catch (err: any) {
                    setError(err?.message || 'Failed to save profile. Please try again.');
                  } finally {
                    setSaving(false);
                  }
                }}
                className="w-full h-[56px] bg-[#FF8A00] rounded-[16px] text-[#FFFFFF] flex items-center justify-center active:scale-[0.98] transition-all hover:bg-[#E97700] shadow-[0_4px_14px_rgba(255,138,0,0.25)] shrink-0 disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={saving}
              >
                {saving ? (
                  <Loader2 size={22} className="animate-spin" />
                ) : (
                  <span className="font-semibold text-[17px] tracking-wide">Complete Profile</span>
                )}
              </button>
              
              <div className="mt-[24px] flex items-start justify-center space-x-[8px] max-w-[320px]">
                <ShieldCheck size={18} className="text-[#10B981] shrink-0 mt-[1px]" strokeWidth={2.5} />
                <p className="text-[13px] text-[#6B7280] font-medium leading-[1.5] text-center sm:text-left">
                  Your birth details remain private and are used only for generating your horoscope.
                </p>
              </div>
            </motion.div>
          </form>
        </div>
      </div>

      {/* Render Active Bottom Sheet */}
      <AnimatePresence>
        {activeSheet === 'state' && (
          <BottomSheet
            title="Select State"
            options={INDIAN_STATES}
            selectedValue={state}
            onSelect={handleStateSelect}
            onClose={() => setActiveSheet(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Bottom Sheet Component
function BottomSheet({ title, options, selectedValue, onSelect, onClose }: any) {
  const [search, setSearch] = useState('');
  const filtered = options.filter((o: string) => o.toLowerCase().includes(search.toLowerCase()));

  // Prevent background scrolling when open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" 
        onClick={onClose} 
      />
      <motion.div 
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 250 }}
        className="relative w-full h-[75dvh] sm:h-[60dvh] sm:max-w-[400px] sm:mx-auto bg-[#FFFFFF] rounded-t-[24px] flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="p-[20px] pb-[12px] flex flex-col border-b border-[#E5E7EB] bg-white z-10">
          <div className="w-[40px] h-[5px] bg-[#E5E7EB] rounded-full mx-auto mb-[20px]" />
          <h3 className="text-[20px] font-bold text-[#111827] text-center mb-[20px]">{title}</h3>
          <div className="relative h-[48px] w-full bg-[#F3F4F6] rounded-[14px] flex items-center px-[16px] focus-within:ring-2 focus-within:ring-[#FF8A00]/20 transition-all">
            <Search size={18} className="text-[#6B7280] mr-[12px]" />
            <input 
              autoFocus
              type="text" 
              placeholder="Search..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="flex-1 bg-transparent border-none focus:outline-none text-[#111827] text-[16px]" 
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-[12px] py-[12px] no-scrollbar pb-[40px]">
          {filtered.map((opt: string) => (
            <button 
              key={opt}
              type="button"
              onClick={() => onSelect(opt)}
              className={`w-full flex items-center justify-between px-[16px] py-[16px] rounded-[16px] mb-[4px] transition-colors ${selectedValue === opt ? 'bg-[#FF8A00]/10 text-[#FF8A00]' : 'text-[#374151] hover:bg-gray-50 active:bg-gray-100'}`}
            >
              <span className={`text-[16px] ${selectedValue === opt ? 'font-bold' : 'font-medium'}`}>{opt}</span>
              {selectedValue === opt && <Check size={20} strokeWidth={2.5} />}
            </button>
          ))}
          {filtered.length === 0 && (
             <div className="p-[32px] text-center text-[#6B7280] font-medium text-[15px]">No matches found</div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

