import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { Screen } from '../types';
import { sendOtp, verifyOtp } from '../services/auth/phoneAuth';

const OTP_LENGTH = 6;
const RESEND_TIMER_SECONDS = 60;

interface OtpScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
  routeParams?: { phone?: string };
}

export default function OtpScreen({ onNavigate, routeParams }: OtpScreenProps) {
  const phone = routeParams?.phone || '';
  const [timer, setTimer] = useState(RESEND_TIMER_SECONDS);
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  // Auto-focus first box on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const focusBox = (index: number) => {
    inputRefs.current[Math.max(0, Math.min(OTP_LENGTH - 1, index))]?.focus();
  };

  const handleChange = (index: number, value: string) => {
    // Only accept single digit
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setError('');
    if (digit && index < OTP_LENGTH - 1) {
      focusBox(index + 1);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (otp[index]) {
        const next = [...otp];
        next[index] = '';
        setOtp(next);
      } else if (index > 0) {
        focusBox(index - 1);
        const next = [...otp];
        next[index - 1] = '';
        setOtp(next);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focusBox(index - 1);
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      focusBox(index + 1);
    }
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = [...Array(OTP_LENGTH).fill('')];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setOtp(next);
    setError('');
    // Focus the box after the last filled digit
    focusBox(Math.min(pasted.length, OTP_LENGTH - 1));
  }, []);

  const handleVerify = async () => {
    const token = otp.join('');
    if (token.length < OTP_LENGTH) {
      setError('Please enter all 6 digits.');
      return;
    }
    if (!phone) {
      setError('Phone number missing. Please go back and try again.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: verifyError } = await verifyOtp(phone, token);

    setLoading(false);

    if (verifyError) {
      setError(verifyError.message);
      // Clear OTP on failure so user can re-enter cleanly
      setOtp(Array(OTP_LENGTH).fill(''));
      focusBox(0);
      return;
    }

    // Auth state change will be picked up by AuthProvider → App will re-route
    // No manual navigate needed here
  };

  const handleResend = async () => {
    if (resending || !phone) return;
    setResending(true);
    setError('');
    setOtp(Array(OTP_LENGTH).fill(''));
    focusBox(0);

    const { error: sendError } = await sendOtp(phone);

    setResending(false);
    if (sendError) {
      setError(sendError.message);
    } else {
      setTimer(RESEND_TIMER_SECONDS);
    }
  };

  // Format phone for display: +91XXXXXXXXXX → +91 XXXXX XXXXX
  const displayPhone = phone.replace(/^\+91(\d{5})(\d{5})$/, '+91 $1 $2');

  const isComplete = otp.every((d) => d !== '');

  return (
    <div className="relative flex flex-col h-[100dvh] w-full bg-[#FFFFFF] overflow-hidden font-sans antialiased selection:bg-[#FF8A00]/20">
      
      {/* Subtle Background Pattern */}
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
          id="back-btn"
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
            Enter the 6-digit code sent to<br/>
            <span className="font-semibold text-[#111827]">{displayPhone || '+91 XXXXX XXXXX'}</span>
          </p>
        </div>

        <div className="w-full flex flex-col">
          {/* 6-Box OTP Input */}
          <div
            id="otp-inputs"
            className="flex justify-between mb-[12px] gap-[8px]"
            onPaste={handlePaste}
          >
            {Array.from({ length: OTP_LENGTH }).map((_, index) => (
              <input
                key={index}
                id={`otp-box-${index}`}
                ref={(el) => (inputRefs.current[index] = el)}
                type="tel"
                inputMode="numeric"
                value={otp[index]}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                maxLength={1}
                className={`flex-1 min-w-0 h-[56px] sm:h-[62px] bg-[#FFFFFF] border rounded-[14px] text-center text-[22px] font-semibold text-[#1A1A1A] focus:outline-none transition-all duration-200 shadow-sm ${
                  otp[index]
                    ? 'border-[#FF8A00] bg-[#FF8A00]/[0.03]'
                    : error
                      ? 'border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-200'
                      : 'border-[#E5E7EB] focus:border-[#FF8A00] focus:ring-1 focus:ring-[#FF8A00]/20'
                }`}
              />
            ))}
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-[16px] text-[13px] text-red-500 font-medium text-center"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Resend + Change Number */}
          <div className="flex items-center justify-between mb-[32px] mt-[8px]">
            <button
              id="change-number-btn"
              onClick={() => onNavigate('login')}
              className="text-[13px] font-semibold text-[#6B7280] hover:text-[#374151] transition-colors"
            >
              Change number
            </button>

            {timer > 0 ? (
              <p className="text-[14px] text-[#6B7280] font-medium">
                Resend in <span className="text-[#111827] font-bold">
                  00:{timer.toString().padStart(2, '0')}
                </span>
              </p>
            ) : (
              <button 
                id="resend-btn"
                onClick={handleResend}
                disabled={resending}
                className="flex items-center space-x-[4px] text-[14px] font-semibold text-[#FF8A00] hover:text-[#E97700] active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {resending
                  ? <Loader2 size={14} className="animate-spin" />
                  : <RefreshCw size={14} />
                }
                <span>Resend Code</span>
              </button>
            )}
          </div>

          {/* Verify Button */}
          <button 
            id="verify-btn"
            onClick={handleVerify}
            disabled={loading}
            className={`w-full h-[56px] bg-[#FF8A00] rounded-[16px] text-[#FFFFFF] flex items-center justify-center active:scale-[0.98] transition-all hover:bg-[#E97700] shadow-[0_4px_14px_rgba(255,138,0,0.25)] shrink-0 disabled:opacity-60 disabled:cursor-not-allowed ${!isComplete && !loading ? 'opacity-70' : ''}`}
          >
            {loading ? (
              <Loader2 size={22} className="animate-spin" />
            ) : (
              <span className="font-semibold text-[17px] tracking-wide">Verify OTP</span>
            )}
          </button>
        </div>
      </motion.div>

      {/* Decorative Landscape */}
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
