import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Loader2, Mail } from 'lucide-react';
import { LOGO_URL } from '../data';
import { Screen } from '../types';
import { signUpWithEmail } from '../services/auth/emailAuth';

interface SignupScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
}

export default function SignupScreen({ onNavigate }: SignupScreenProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  const handleSignup = async () => {
    if (loading) return;
    
    if (!fullName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: signUpError, needsVerification: verification } = await signUpWithEmail(email, password, fullName);
    
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (verification) {
      setNeedsVerification(true);
    } else {
      // Automatic login happened via AuthProvider state change listener.
      // App.tsx handles redirection to create-profile or home.
    }
  };

  if (needsVerification) {
    return (
      <div className="flex flex-col h-[100dvh] w-full bg-[#FFFFFF] items-center justify-center p-8 text-center">
        <Mail size={48} className="text-[#FF8A00] mb-6" />
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Check your email</h2>
        <p className="text-neutral-500 mb-8">We've sent a verification link to {email}. Please click the link to activate your account.</p>
        <button
          onClick={() => onNavigate('login')}
          className="text-[#FF8A00] font-semibold"
        >
          Return to Login
        </button>
      </div>
    );
  }

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
            Create Account
          </h1>
          <p className="w-[90%] sm:w-[85%] mt-[8px] text-[14px] sm:text-[15px] text-[#6B7280] text-center leading-[1.5] font-normal">
            Join Kundli Nova for your astrological journey.
          </p>
        </div>

        <div className="flex flex-col gap-[12px] mb-[16px] shrink-0">
          <div className="relative h-[50px] w-full bg-[#FFFFFF] rounded-[16px] border border-[#E5E7EB] flex items-center px-[16px] focus-within:border-[#FF8A00] focus-within:ring-1 focus-within:ring-[#FF8A00]/20 transition-all duration-200 shadow-sm">
            <input 
              type="text" 
              placeholder="Full Name" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="flex-1 bg-transparent border-none focus:outline-none text-[#111827] placeholder:text-[#9CA3AF] text-[15px] font-medium" 
            />
          </div>
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
              className="flex-1 bg-transparent border-none focus:outline-none text-[#111827] placeholder:text-[#9CA3AF] text-[15px] font-medium" 
            />
          </div>
          <div className="relative h-[50px] w-full bg-[#FFFFFF] rounded-[16px] border border-[#E5E7EB] flex items-center px-[16px] focus-within:border-[#FF8A00] focus-within:ring-1 focus-within:ring-[#FF8A00]/20 transition-all duration-200 shadow-sm">
            <input 
              type="password" 
              placeholder="Confirm Password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="flex-1 bg-transparent border-none focus:outline-none text-[#111827] placeholder:text-[#9CA3AF] text-[15px] font-medium" 
            />
          </div>
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
          onClick={handleSignup}
          disabled={loading || !email || !password || !fullName || !confirmPassword}
          className="w-full h-[52px] bg-gradient-to-r from-[#FF8A00] to-[#FFA733] text-white rounded-[16px] font-[700] text-[16px] flex items-center justify-center shadow-[0_4px_16px_rgba(255,138,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,138,0,0.4)] transition-all duration-300 disabled:opacity-70 disabled:shadow-none disabled:transform-none active:scale-[0.98] shrink-0"
        >
          {loading ? <Loader2 size={22} className="animate-spin text-white" /> : 'Create Account'}
        </button>

        <p className="text-center text-[13.5px] font-medium text-neutral-500 mt-[24px] mb-[16px] shrink-0">
          Already have an account?{' '}
          <button onClick={() => onNavigate('login')} className="text-[#FF8A00] font-[700] hover:underline">
            Log in
          </button>
        </p>
      </motion.div>
    </div>
  );
}
