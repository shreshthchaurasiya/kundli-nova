import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Gift, ArrowRight, Lock } from 'lucide-react';
import { Screen } from '../types';

interface WelcomeGiftScreenProps {
  onNavigate: (screen: Screen) => void;
}

export default function WelcomeGiftScreen({ onNavigate }: WelcomeGiftScreenProps) {
  return (
    <div className="relative flex flex-col h-[100dvh] w-full bg-[#FFFFFF] overflow-hidden font-sans antialiased selection:bg-[#FF8A00]/20">
      
      {/* Subtle Background Elements (Celestial Watermark) */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-[0.03] flex items-center justify-center">
        <svg className="w-[150%] h-[150%] max-w-none text-[#FF8A00]" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
          <g stroke="currentColor" fill="none" strokeWidth="0.5">
            <ellipse cx="200" cy="200" rx="400" ry="400" strokeDasharray="2 6" />
            <ellipse cx="800" cy="800" rx="400" ry="400" strokeDasharray="2 6" />
            
            {/* Constellation lines */}
            <path d="M150 150 L200 220 L280 180 Z" strokeWidth="1" />
            <path d="M850 850 L800 780 L720 820 Z" strokeWidth="1" />
            
            {/* Sun/Moon shapes */}
            <circle cx="100" cy="800" r="40" strokeWidth="1.5" />
            <path d="M100 740 L100 720 M100 860 L100 880 M40 800 L20 800 M160 800 L180 800" strokeWidth="1.5" />
            <path d="M800 150 A 40 40 0 1 1 850 100 A 50 50 0 0 0 800 150" fill="currentColor" stroke="none" opacity="0.5" />
          </g>
        </svg>
      </div>

      {/* Top Header */}
      <div className="w-full flex justify-between items-center px-[20px] sm:px-[24px] pt-[24px] sm:pt-[32px] z-20">
        <button 
          onClick={() => onNavigate('create-profile')}
          className="p-[10px] -ml-[10px] rounded-full hover:bg-gray-50 active:bg-gray-100 transition-colors text-[#111827]"
        >
          <ArrowLeft size={24} strokeWidth={2} />
        </button>

        <button 
          onClick={() => onNavigate('home')}
          className="text-[14px] font-medium text-[#6B7280] hover:text-[#374151] active:scale-[0.98] transition-all px-[16px] py-[6px] border border-[#E5E7EB] rounded-full bg-white shadow-sm"
        >
          Skip
        </button>
      </div>

      <div className="flex-1 w-full flex flex-col px-[28px] sm:px-[32px] pb-[32px] z-10 overflow-y-auto no-scrollbar">
        <div className="flex-1 w-full max-w-[480px] mx-auto flex flex-col justify-center items-center">
          
          {/* Illustration Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="w-[90%] max-w-[360px] aspect-square flex items-center justify-center mb-[20px] sm:mb-[24px] pointer-events-none select-none"
          >
            <img 
              src="https://i.ibb.co/4ZrDyD6C/image.png" 
              alt="Free Astrology Chat Gift" 
              className="w-full h-full object-contain"
              draggable={false}
            />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-[48px] h-[48px] rounded-full bg-[#FFF5ED] flex items-center justify-center text-[#FF8A00] mb-[20px]"
          >
            <Gift size={22} strokeWidth={2} />
          </motion.div>

          {/* Typography */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
            className="w-full flex flex-col items-center mb-[32px]"
          >
            <h1 className="text-[26px] sm:text-[30px] font-bold text-[#111827] tracking-[-0.02em] leading-[1.2] text-center mb-[16px] font-serif">
              Your Free Astrology<br/>
              <span className="text-[#FF8A00]">Chat</span> is Ready
            </h1>

            <div className="flex items-center space-x-[12px] mb-[20px] opacity-40">
              <div className="w-[30px] h-[1px] bg-[#FF8A00]" />
              <div className="w-[6px] h-[6px] rotate-45 bg-[#FF8A00]" />
              <div className="w-[30px] h-[1px] bg-[#FF8A00]" />
            </div>

            <p className="text-[14px] sm:text-[15px] text-[#6B7280] leading-[1.6] font-normal text-center max-w-[320px]">
              As a welcome gift from Kundli Nova, you can start one free consultation with a verified astrologer and experience personalized guidance.
            </p>
          </motion.div>

          {/* Actions */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="w-full flex flex-col items-center mt-auto sm:mt-0"
          >
            <button 
              onClick={() => onNavigate('nova-ai-chat')}
              className="w-full h-[56px] bg-[#FF8A00] rounded-[16px] text-[#FFFFFF] flex items-center justify-center active:scale-[0.98] transition-all hover:bg-[#E97700] shadow-[0_4px_14px_rgba(255,138,0,0.25)] shrink-0 mb-[16px]"
            >
              <span className="font-semibold text-[17px] tracking-wide mr-[8px]">Continue to AI Free Chat</span>
              <ArrowRight size={20} strokeWidth={2.5} />
            </button>
            
            <button 
              onClick={() => onNavigate('home')}
              className="h-[44px] px-[24px] rounded-[12px] text-[#6B7280] font-medium text-[15px] hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center justify-center"
            >
              <span className="mr-[8px]">Start Later</span>
              <ArrowRight size={18} strokeWidth={2} />
            </button>
          </motion.div>
          
        </div>
        
        {/* Security Reassurance */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ duration: 0.6, delay: 0.5 }}
          className="w-full mt-[32px] sm:mt-[40px]"
        >
          <div className="w-full max-w-[340px] mx-auto bg-[#FFF5ED] border border-[#FF8A00]/10 rounded-[12px] py-[12px] px-[16px] flex items-center justify-center space-x-[12px]">
            <Lock size={16} className="text-[#FF8A00] shrink-0" strokeWidth={2.5} />
            <p className="text-[12px] text-[#6B7280] font-medium leading-[1.4] text-left">
              Your details are private and <br/>only used to generate your horoscope.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
