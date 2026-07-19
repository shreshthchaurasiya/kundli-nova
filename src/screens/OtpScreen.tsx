import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { Screen } from '../types';

interface OtpScreenProps {
  onNavigate: (screen: Screen) => void;
}

export default function OtpScreen({ onNavigate }: OtpScreenProps) {
  const [timer, setTimer] = useState(30);
  const [otp, setOtp] = useState(['', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
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

      {/* Top Navigation Bar */}
      <div className="absolute top-0 left-0 w-full px-[20px] pt-[24px] sm:pt-[32px] z-20 flex items-center">
        <button 
          onClick={() => onNavigate('login')}
          className="p-[10px] -ml-[10px] rounded-full hover:bg-gray-50 active:bg-gray-100 transition-colors text-[#111827]"
        >
          <ArrowLeft size={24} strokeWidth={2} />
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, x: 15 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex-1 flex flex-col z-10 w-full h-full max-w-[400px] mx-auto justify-center px-[28px] sm:px-[32px]"
      >
        <div className="w-full flex flex-col items-start mb-[36px]">
          <h1 className="text-[26px] sm:text-[28px] font-bold text-[#111827] tracking-[-0.02em] leading-tight">
            Verify your number
          </h1>
          <p className="mt-[10px] text-[15px] sm:text-[16px] text-[#6B7280] leading-[1.5] font-normal">
            Enter the 4-digit code sent to<br/>
            <span className="font-medium text-[#111827]">+91 98765 43210</span>
          </p>
        </div>

        <div className="w-full flex flex-col">
          {/* OTP Inputs */}
          <div className="flex justify-between mb-[32px] space-x-[12px]">
            {[0, 1, 2, 3].map((index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="number"
                value={otp[index]}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                maxLength={1}
                autoFocus={index === 0}
                className="w-[60px] h-[64px] sm:w-[70px] sm:h-[72px] bg-[#FFFFFF] border border-[#E5E7EB] rounded-[16px] text-center text-[24px] font-medium text-[#1A1A1A] focus:outline-none focus:border-[#FF8A00] focus:ring-1 focus:ring-[#FF8A00]/20 shadow-sm transition-all duration-200"
              />
            ))}
          </div>

          {/* Resend Code */}
          <div className="flex items-center mb-[36px]">
            {timer > 0 ? (
              <p className="text-[14px] text-[#6B7280] font-medium">
                Resend code in <span className="text-[#111827]">00:{timer.toString().padStart(2, '0')}</span>
              </p>
            ) : (
              <button 
                onClick={() => setTimer(30)}
                className="text-[14px] font-semibold text-[#FF8A00] hover:text-[#E97700] active:scale-[0.98] transition-all"
              >
                Resend Code
              </button>
            )}
          </div>

          {/* Verify Button */}
          <button 
            onClick={() => onNavigate('create-profile')}
            className="w-full h-[56px] bg-[#FF8A00] rounded-[16px] text-[#FFFFFF] flex items-center justify-center active:scale-[0.98] transition-all hover:bg-[#E97700] shadow-[0_4px_14px_rgba(255,138,0,0.25)] shrink-0"
          >
            <span className="font-semibold text-[17px] tracking-wide">Verify</span>
          </button>
        </div>
      </motion.div>

      {/* Decorative Landscape Layer (Bottom behind buttons) */}
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
