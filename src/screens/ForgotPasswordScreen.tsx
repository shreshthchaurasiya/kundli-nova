import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { LOGO_URL } from '../data';
import { Screen } from '../types';
import { resetPasswordForEmail } from '../services/auth/emailAuth';

interface ForgotPasswordScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
}

export default function ForgotPasswordScreen({ onNavigate }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    if (loading) return;
    
    if (!email) {
      setError('Please enter your email.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: resetError } = await resetPasswordForEmail(email);
    
    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSuccess(true);
  };

  return (
    <div className="relative flex flex-col h-[100dvh] w-full bg-[#FFFFFF] overflow-hidden font-sans antialiased">
      <button 
        onClick={() => onNavigate('login')}
        className="absolute top-[20px] left-[20px] w-[40px] h-[40px] rounded-full bg-neutral-100 flex items-center justify-center z-20 hover:bg-neutral-200 transition-colors"
      >
        <ChevronLeft size={24} className="text-neutral-700" />
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex-1 flex flex-col w-full h-full max-w-[400px] mx-auto justify-center px-[28px] sm:px-[32px] py-[20px] z-10 overflow-y-auto no-scrollbar"
      >
        <div className="relative w-full flex justify-center mb-[20px] shrink-0 mt-[8vh] sm:mt-0">
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
            className="w-[140px] sm:w-[160px] object-contain drop-shadow-none relative z-10"
          />
        </div>

        <div className="w-full flex flex-col items-center mb-[20px] shrink-0">
          <h1 className="text-[24px] sm:text-[26px] font-bold text-[#111827] text-center tracking-[-0.02em] leading-tight">
            Reset Password
          </h1>
          <p className="w-[90%] sm:w-[85%] mt-[8px] text-[14px] sm:text-[15px] text-[#6B7280] text-center leading-[1.5] font-normal">
            Enter your email to receive a password reset link.
          </p>
        </div>

        <div className="flex flex-col gap-[12px] mb-[20px] shrink-0">
          <div className="relative h-[50px] w-full bg-[#FFFFFF] rounded-[16px] border border-[#E5E7EB] flex items-center px-[16px] focus-within:border-[#FF8A00] focus-within:ring-1 focus-within:ring-[#FF8A00]/20 transition-all duration-200 shadow-sm">
            <input 
              type="email" 
              placeholder="Email address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-transparent border-none focus:outline-none text-[#111827] placeholder:text-[#9CA3AF] text-[15px] font-medium" 
            />
          </div>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mb-[16px] p-[10px] bg-red-50 border border-red-100 rounded-[12px] flex items-center justify-center shrink-0">
            <p className="text-red-500 text-[13px] font-semibold text-center">{error}</p>
          </motion.div>
        )}

        {success && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mb-[16px] p-[10px] bg-green-50 border border-green-100 rounded-[12px] flex items-center justify-center shrink-0">
            <p className="text-green-600 text-[13px] font-semibold text-center">Reset link sent! Check your email.</p>
          </motion.div>
        )}

        <button 
          onClick={handleReset}
          disabled={loading || !email}
          className="w-full h-[52px] bg-gradient-to-r from-[#FF8A00] to-[#FFA733] text-white rounded-[16px] font-[700] text-[16px] flex items-center justify-center shadow-[0_4px_16px_rgba(255,138,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,138,0,0.4)] transition-all duration-300 disabled:opacity-70 disabled:shadow-none disabled:transform-none active:scale-[0.98] shrink-0"
        >
          {loading ? <Loader2 size={22} className="animate-spin text-white" /> : 'Send Reset Link'}
        </button>

        <p className="text-center text-[13.5px] font-medium text-neutral-500 mt-[24px] mb-[16px] shrink-0">
          Remember your password?{' '}
          <button onClick={() => onNavigate('login')} className="text-[#FF8A00] font-[700] hover:underline">
            Log in
          </button>
        </p>
      </motion.div>
    </div>
  );
}
