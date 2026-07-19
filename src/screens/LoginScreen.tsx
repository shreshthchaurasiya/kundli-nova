import React from 'react';
import { motion } from 'motion/react';
import { ChevronDown, ShieldCheck } from 'lucide-react';
import { LOGO_URL } from '../data';
import { Screen } from '../types';

interface LoginScreenProps {
  onNavigate: (screen: Screen) => void;
}

export default function LoginScreen({ onNavigate }: LoginScreenProps) {
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
                {/* Outer rings */}
                <circle cx="100" cy="100" r="96" strokeWidth="0.2" />
                <circle cx="100" cy="100" r="90" strokeWidth="0.5" />
                <circle cx="100" cy="100" r="86" strokeDasharray="1 2" strokeWidth="0.4" />
                
                {/* Inner rings */}
                <circle cx="100" cy="100" r="65" strokeWidth="0.5" />
                <circle cx="100" cy="100" r="58" strokeWidth="0.2" />
                <circle cx="100" cy="100" r="50" strokeWidth="0.4" />
                
                {/* 12 Astrology Houses Lines */}
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
                
                {/* Inner triangles/geometry */}
                <polygon points="100,35 156.2,132.5 43.8,132.5" strokeWidth="0.2" />
                <polygon points="100,165 43.8,67.5 156.2,67.5" strokeWidth="0.2" />

                {/* Dots in the outer ring */}
                {[...Array(12)].map((_, i) => {
                   const angle = (i * 30 * Math.PI) / 180 + (15 * Math.PI / 180); // offset by 15 deg
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

                {/* Additional outer decoration (Stars) */}
                {[...Array(8)].map((_, i) => {
                  const angle = (i * 45 * Math.PI) / 180 + (22.5 * Math.PI / 180);
                  const cx = 100 + 98 * Math.cos(angle);
                  const cy = 100 + 98 * Math.sin(angle);
                  return (
                    <g key={`star-${i}`} transform={`translate(${cx}, ${cy}) scale(0.4)`}>
                      <path d="M0 -5 L1 -1 L5 0 L1 1 L0 5 L-1 1 L-5 0 L-1 -1 Z" fill="currentColor" stroke="none" />
                    </g>
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
          <div className="h-[56px] w-full bg-[#FFFFFF] rounded-[16px] border border-[#E5E7EB] flex items-center px-[16px] shrink-0 focus-within:border-[#FF8A00] focus-within:ring-1 focus-within:ring-[#FF8A00]/20 transition-all duration-200 shadow-sm">
            <div className="flex items-center space-x-[8px] border-r border-[#E5E7EB] pr-[12px] mr-[12px]">
              <span className="text-[20px] leading-none">🇮🇳</span>
              <span className="text-[#1A1A1A] font-medium text-[16px]">+91</span>
              <ChevronDown size={16} className="text-[#6B7280]" />
            </div>
            <input 
              type="tel" 
              placeholder="Enter Mobile Number" 
              className="flex-1 bg-transparent border-none focus:outline-none text-[#1A1A1A] font-medium text-[16px] placeholder:text-[#9CA3AF] placeholder:font-normal h-full"
              maxLength={10}
            />
          </div>

          {/* Continue Button */}
          <button 
            onClick={() => onNavigate('otp')}
            className="w-full h-[56px] mt-[20px] bg-[#FF8A00] rounded-[16px] text-[#FFFFFF] flex items-center justify-center active:scale-[0.98] transition-all hover:bg-[#E97700] shrink-0 shadow-[0_4px_14px_rgba(255,138,0,0.25)]"
          >
            <span className="font-semibold text-[17px] tracking-wide">Continue</span>
          </button>

          {/* Divider */}
          <div className="mt-[24px] flex items-center w-full opacity-80">
            <div className="flex-1 h-[1px] bg-[#E5E7EB]"></div>
            <span className="px-[16px] text-[12px] text-[#9CA3AF] uppercase tracking-wider font-semibold">Or continue with</span>
            <div className="flex-1 h-[1px] bg-[#E5E7EB]"></div>
          </div>

          {/* Google Button */}
          <button className="w-full h-[56px] mt-[24px] bg-[#FFFFFF] rounded-[16px] flex items-center justify-center space-x-[10px] border border-[#E5E7EB] shadow-sm active:bg-gray-50 transition-colors shrink-0">
            <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="text-[#374151] font-semibold text-[16px]">Continue with Google</span>
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

