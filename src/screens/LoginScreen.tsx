import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ShieldCheck, Loader2 } from 'lucide-react';
import { LOGO_URL } from '../data';
import { Screen } from '../types';
import { normalizeIndianPhone, sendOtp } from '../services/auth/phoneAuth';

interface LoginScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
}

export default function LoginScreen({ onNavigate }: LoginScreenProps) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(value);
    if (error) setError('');
  };

  const handleContinue = async () => {
    if (loading) return;

    const normalized = normalizeIndianPhone(phone);
    if (!normalized) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: otpError } = await sendOtp(normalized);

    setLoading(false);

    if (otpError) {
      setError(otpError.message);
      return;
    }

    onNavigate('otp', { phone: normalized });
  };

  return (
    <div className="relative flex flex-col h-[100dvh] w-full bg-[#FFFFFF] overflow-hidden font-sans antialiased selection:bg-[#FF8A00]/20">
      
      {/* Subtle Full-page Astrology Background Pattern */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-[0.02] flex items-center justify-center">
        <svg className="w-[150%] h-[150%] max-w-none" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
          <g stroke="#1A1A1A" fill="none" strokeWidth="0.5">
            <ellipse cx="500" cy="500" rx="450" ry="200" transform="rotate(15 500 500)" strokeWidth="0.25" />
            <ellipse cx="500" cy="500" rx="600" ry="250" transform="rotate(-25 500 500)" strokeWidth="0.25" />
            <circle cx="500" cy="500" r="400" strokeWidth="0.25" />
            <circle cx="500" cy="500" r="390" strokeDasharray="1 4" strokeWidth="0.5" />
            <circle cx="500" cy="500" r="360" strokeWidth="0.25" />
            <path d="M 500 140 L 811.7 680 L 188.3 680 Z" strokeWidth="0.25" />
            <path d="M 500 860 L 811.7 320 L 188.3 320 Z" strokeWidth="0.25" />
            <circle cx="500" cy="500" r="200" strokeWidth="0.25" />
            <circle cx="500" cy="500" r="180" strokeDasharray="4 8" strokeWidth="0.25" />
          </g>
        </svg>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex-1 flex flex-col z-10 w-full h-full max-w-[400px] mx-auto justify-center px-[28px] sm:px-[32px]"
      >
        <div className="relative w-full flex justify-center mb-[32px] -mt-[8vh]">
          {/* Detailed Zodiac Wheel behind the logo */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] sm:w-[380px] sm:h-[380px] pointer-events-none flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-full h-full text-[#FF8A00] opacity-[0.15]">
              <g stroke="currentColor" fill="none" strokeWidth="0.3">
                <circle cx="100" cy="100" r="96" strokeWidth="0.2" />
                <circle cx="100" cy="100" r="90" strokeWidth="0.5" />
                <circle cx="100" cy="100" r="86" strokeDasharray="1 2" strokeWidth="0.4" />
                <circle cx="100" cy="100" r="65" strokeWidth="0.5" />
                <circle cx="100" cy="100" r="58" strokeWidth="0.2" />
                <circle cx="100" cy="100" r="50" strokeWidth="0.4" />
                {[...Array(12)].map((_, i) => {
                  const angle = (i * 30 * Math.PI) / 180;
                  return (
                    <line 
                      key={`line-${i}`}
                      x1={100 + 50 * Math.cos(angle)}
                      y1={100 + 50 * Math.sin(angle)}
                      x2={100 + 90 * Math.cos(angle)}
                      y2={100 + 90 * Math.sin(angle)}
                      strokeWidth="0.3"
                    />
                  );
                })}
                <polygon points="100,35 156.2,132.5 43.8,132.5" strokeWidth="0.2" />
                <polygon points="100,165 43.8,67.5 156.2,67.5" strokeWidth="0.2" />
                {[...Array(12)].map((_, i) => {
                   const angle = (i * 30 * Math.PI) / 180 + (15 * Math.PI / 180);
                   return (
                     <circle 
                       key={`dot-${i}`}
                       cx={100 + 77.5 * Math.cos(angle)}
                       cy={100 + 77.5 * Math.sin(angle)}
                       r="1.2"
                       fill="currentColor"
                       stroke="none"
                     />
                   );
                })}
              </g>
            </svg>
          </div>
          
          <img 
            src={LOGO_URL} 
            alt="Kundli Nova" 
            className="w-[200px] sm:w-[220px] object-contain drop-shadow-none relative z-10"
          />
        </div>

        <div className="w-full flex flex-col items-center">
          <h1 className="text-[26px] sm:text-[28px] font-bold text-[#111827] text-center tracking-[-0.02em] leading-tight">
            Welcome to Kundli Nova
          </h1>
          
          <p className="w-[90%] sm:w-[85%] mt-[10px] text-[15px] sm:text-[16px] text-[#6B7280] text-center leading-[1.5] font-normal">
            Unlock the secrets of your destiny and connect with trusted astrologers.
          </p>
        </div>

        <div className="w-full mt-[36px] flex flex-col">
          {/* Phone Input */}
          <div className={`h-[56px] w-full bg-[#FFFFFF] rounded-[16px] border flex items-center px-[16px] shrink-0 focus-within:ring-1 transition-all duration-200 shadow-sm ${
            error
              ? 'border-red-400 focus-within:border-red-400 focus-within:ring-red-200'
              : 'border-[#E5E7EB] focus-within:border-[#FF8A00] focus-within:ring-[#FF8A00]/20'
          }`}>
            <div className="flex items-center space-x-[8px] border-r border-[#E5E7EB] pr-[12px] mr-[12px]">
              <span className="text-[20px] leading-none">🇮🇳</span>
              <span className="text-[#1A1A1A] font-medium text-[16px]">+91</span>
              <ChevronDown size={16} className="text-[#6B7280]" />
            </div>
            <input 
              id="phone-input"
              type="tel"
              inputMode="numeric"
              placeholder="Enter Mobile Number"
              value={phone}
              onChange={handlePhoneChange}
              onKeyDown={(e) => { if (e.key === 'Enter') handleContinue(); }}
              className="flex-1 bg-transparent border-none focus:outline-none text-[#1A1A1A] font-medium text-[16px] placeholder:text-[#9CA3AF] placeholder:font-normal h-full"
              maxLength={10}
              autoFocus
            />
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-[10px] text-[13px] text-red-500 font-medium px-[4px]"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Continue Button */}
          <button 
            id="continue-btn"
            onClick={handleContinue}
            disabled={loading}
            className="w-full h-[56px] mt-[20px] bg-[#FF8A00] rounded-[16px] text-[#FFFFFF] flex items-center justify-center active:scale-[0.98] transition-all hover:bg-[#E97700] shrink-0 shadow-[0_4px_14px_rgba(255,138,0,0.25)] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 size={22} className="animate-spin" />
            ) : (
              <span className="font-semibold text-[17px] tracking-wide">Continue</span>
            )}
          </button>

          {/* Security Text */}
          <div className="mt-[32px] flex items-center justify-center space-x-[6px]">
            <ShieldCheck size={16} className="text-[#10B981]" strokeWidth={2.5} />
            <p className="text-[13px] text-[#6B7280] font-medium tracking-tight">
              Your data is 100% secure and protected.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Decorative Landscape Layer */}
      <div className="absolute bottom-0 left-0 w-full h-[40vh] min-h-[300px] pointer-events-none z-0 flex items-end justify-center">
        <img 
          src="https://i.ibb.co/zHFNDCps/image.png" 
          alt="Landscape background" 
          className="w-full h-full object-cover object-bottom"
        />
      </div>
    </div>
  );
}
