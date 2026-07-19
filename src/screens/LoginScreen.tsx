import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { LOGO_URL } from '../data';
import { Screen } from '../types';
import { signInWithEmail } from '../services/auth/emailAuth';
import { signInWithOAuth } from '../services/auth/oauthAuth';
// import { normalizeIndianPhone, sendOtp } from '../services/auth/phoneAuth';

interface LoginScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
}

export default function LoginScreen({ onNavigate }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // const [phone, setPhone] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /*
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(value);
    if (error) setError('');
  };

  const handlePhoneContinue = async () => {
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
  */

  const handleEmailContinue = async () => {
    if (loading) return;

    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: signInError } = await signInWithEmail(email, password);
    
    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }
  };

  const handleOAuth = (provider: 'google' | 'apple') => {
    signInWithOAuth(provider);
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
        className="flex-1 flex flex-col z-10 w-full h-full max-w-[400px] mx-auto justify-center px-[28px] sm:px-[32px] py-[20px] overflow-y-auto no-scrollbar"
      >
        <div className="relative w-full flex justify-center mb-[20px] shrink-0 mt-[10vh] sm:mt-0">
          {/* Detailed Zodiac Wheel behind the logo */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] pointer-events-none flex items-center justify-center">
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
            className="w-[160px] sm:w-[180px] object-contain drop-shadow-none relative z-10"
          />
        </div>

        <div className="w-full flex flex-col items-center mb-[24px] shrink-0">
          <h1 className="text-[24px] sm:text-[26px] font-bold text-[#111827] text-center tracking-[-0.02em] leading-tight">
            Welcome to Kundli Nova
          </h1>
          
          <p className="w-[90%] sm:w-[85%] mt-[8px] text-[14px] sm:text-[15px] text-[#6B7280] text-center leading-[1.5] font-normal">
            Unlock the secrets of your destiny and connect with trusted astrologers.
          </p>
        </div>

        <div className="flex flex-col gap-[12px] mb-[12px] shrink-0">
          <div className="relative h-[50px] w-full bg-[#FFFFFF] rounded-[16px] border border-[#E5E7EB] flex items-center px-[16px] focus-within:border-[#FF8A00] focus-within:ring-1 focus-within:ring-[#FF8A00]/20 transition-all duration-200 shadow-sm">
            <input 
              type="email" 
              placeholder="Email address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-transparent border-none focus:outline-none text-[#111827] placeholder:text-[#9CA3AF] text-[15px] font-medium" 
            />
          </div>
          <div className="relative h-[50px] w-full bg-[#FFFFFF] rounded-[16px] border border-[#E5E7EB] flex items-center px-[16px] focus-within:border-[#FF8A00] focus-within:ring-1 focus-within:ring-[#FF8A00]/20 transition-all duration-200 shadow-sm">
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleEmailContinue(); }}
              className="flex-1 bg-transparent border-none focus:outline-none text-[#111827] placeholder:text-[#9CA3AF] text-[15px] font-medium" 
            />
          </div>
        </div>

        <div className="flex justify-end mb-[20px] shrink-0">
          <button onClick={() => onNavigate('forgot-password')} className="text-[#FF8A00] text-[13px] font-semibold hover:underline">
            Forgot Password?
          </button>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -5, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-[16px] p-[10px] bg-red-50 border border-red-100 rounded-[12px] flex items-center justify-center overflow-hidden shrink-0"
            >
              <p className="text-red-500 text-[13px] font-semibold text-center">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={handleEmailContinue}
          disabled={loading || email.length === 0 || password.length === 0}
          className="w-full h-[52px] bg-gradient-to-r from-[#FF8A00] to-[#FFA733] text-white rounded-[16px] font-[700] text-[16px] flex items-center justify-center shadow-[0_4px_16px_rgba(255,138,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,138,0,0.4)] transition-all duration-300 disabled:opacity-70 disabled:shadow-none disabled:transform-none active:scale-[0.98] shrink-0"
        >
          {loading ? <Loader2 size={22} className="animate-spin text-white" /> : 'Continue'}
        </button>

        <div className="flex items-center my-[20px] shrink-0">
          <div className="flex-1 h-[1px] bg-neutral-200"></div>
          <span className="px-[12px] text-[12px] text-neutral-400 font-medium">OR</span>
          <div className="flex-1 h-[1px] bg-neutral-200"></div>
        </div>

        <div className="flex flex-col gap-[10px] mb-[20px] shrink-0">
          <button 
            onClick={() => handleOAuth('google')}
            className="w-full h-[46px] bg-white border border-neutral-200 rounded-[16px] flex items-center justify-center gap-[10px] text-neutral-700 font-semibold text-[14px] hover:bg-neutral-50 transition-colors shadow-sm active:scale-[0.98]"
          >
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>
          
          <button 
            onClick={() => handleOAuth('apple')}
            className="w-full h-[46px] bg-black text-white rounded-[16px] flex items-center justify-center gap-[10px] font-semibold text-[14px] hover:bg-neutral-900 transition-colors shadow-sm active:scale-[0.98]"
          >
            <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16.365 21.436c-1.161.769-2.31 1.157-3.447 1.157-1.11 0-2.29-.39-3.541-1.165-1.332-.821-2.627-.811-3.882 0-1.139.756-2.277 1.144-3.415 1.144-.814 0-1.579-.19-2.296-.566-3.376-1.803-5.228-5.385-5.556-10.748-.11-1.748.163-3.327.818-4.735a7.356 7.356 0 0 1 2.333-2.887c1.373-1.026 2.923-1.543 4.653-1.554 1.16 0 2.457.388 3.892 1.165.733.4 1.258.599 1.574.599.305 0 .847-.202 1.625-.607a7.591 7.591 0 0 1 3.766-1.144c1.332 0 2.553.308 3.663.924a6.764 6.764 0 0 1 2.502 2.366c-2.473 1.488-3.668 3.606-3.585 6.353.078 2.213.916 4.025 2.513 5.437.368.324.77.618 1.206.883-.715 1.706-1.637 3.235-2.766 4.587l-.054.062zM15.42 6.643c-1.365 0-2.607-.587-3.727-1.761-1.01-1.054-1.575-2.359-1.696-3.916 1.341.042 2.61.649 3.805 1.822 1.023 1.011 1.635 2.302 1.836 3.874-.072.001-.144.001-.218.001z" />
            </svg>
            Continue with Apple
          </button>
        </div>

        <p className="text-center text-[13.5px] font-medium text-neutral-500">
          Don't have an account?{' '}
          <button onClick={() => onNavigate('signup')} className="text-[#FF8A00] font-[700] hover:underline">
            Sign up
          </button>
        </p>
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
