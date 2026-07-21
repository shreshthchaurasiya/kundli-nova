import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Share2, AlertCircle, RefreshCw, Lock } from 'lucide-react';
import { Screen } from '../types';
import { useProfile } from '../contexts/ProfileContext';
import { ZodiacSign, ZODIAC_SIGNS, KundliNovaDailyHoroscope } from '../server/types/astrologyProvider';
import { getWesternSunSign, ZODIAC_METADATA } from '../utils/astrology';
import { AstrologyApi } from '../services/api/astrologyApi';
import { ApiError } from '../services/api/apiErrors';

interface HoroscopeScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
}

type LoadingState = 'idle' | 'loading' | 'success' | 'error';
type TabName = 'Today' | 'Tomorrow' | 'Month';

export default function HoroscopeScreen({ onNavigate }: HoroscopeScreenProps) {
  const { profile } = useProfile();
  
  // Default sign logic
  const defaultSign = useMemo(() => {
    if (profile?.dateOfBirth) {
      const derived = getWesternSunSign(profile.dateOfBirth);
      if (derived) return derived;
    }
    return 'aries' as ZodiacSign;
  }, [profile?.dateOfBirth]);

  const [selectedSign, setSelectedSign] = useState<ZodiacSign>(defaultSign);
  const [activeTab, setActiveTab] = useState<TabName>('Today');
  const [horoscopeData, setHoroscopeData] = useState<KundliNovaDailyHoroscope | null>(null);
  const [status, setStatus] = useState<LoadingState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isRetryable, setIsRetryable] = useState(true);
  const [isStaleFallback, setIsStaleFallback] = useState(false);

  const fetchHoroscope = useCallback(async (sign: ZodiacSign) => {
    setStatus('loading');
    setErrorMessage('');
    setIsStaleFallback(false);
    try {
      const data = await AstrologyApi.getDailyHoroscope(sign);
      setHoroscopeData(data);
      setStatus('success');
      if (data.isStaleFallback) {
        setIsStaleFallback(true);
      }
    } catch (error) {
      setHoroscopeData(null);
      setStatus('error');
      
      if (error instanceof ApiError) {
        if (error.statusCode === 401 || error.statusCode === 403) {
          setErrorMessage('Your session has expired. Please log in again.');
          setIsRetryable(false);
          // Assuming existing auth behavior kicks in or user navigates
        } else if (error.statusCode === 429) {
          setErrorMessage('Too many requests. Please try again in a moment.');
          setIsRetryable(true);
        } else if (error.statusCode === 503 || error.statusCode === 504) {
          setErrorMessage('The horoscope service is temporarily updating. Please check back shortly.');
          setIsRetryable(true);
        } else {
          setErrorMessage('Unable to load horoscope. Please try again.');
          setIsRetryable(true);
        }
      } else {
        setErrorMessage('An unexpected error occurred. Please check your connection.');
        setIsRetryable(true);
      }
    }
  }, []);

  useEffect(() => {
    fetchHoroscope(selectedSign);
  }, [selectedSign, fetchHoroscope]);

  const handleShare = async () => {
    if (!horoscopeData) return;
    
    const textToShare = `${selectedSign.charAt(0).toUpperCase() + selectedSign.slice(1)} Daily Horoscope:\n\n${horoscopeData.overview}\n\n- Kundli Nova`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Daily Horoscope',
          text: textToShare,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(textToShare);
      alert('Horoscope copied to clipboard!');
    }
  };

  const metadata = ZODIAC_METADATA[selectedSign];

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA]">
      {/* Header */}
      <div className="pt-[max(48px,env(safe-area-inset-top))] pb-[16px] px-[24px] bg-white border-b border-neutral-100 flex items-center shadow-sm shrink-0">
        <button
          onClick={() => onNavigate('home')}
          className="w-[40px] h-[40px] rounded-full bg-neutral-50 flex items-center justify-center mr-[12px] hover:bg-neutral-100 transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft size={20} className="text-neutral-700" strokeWidth={2.5} />
        </button>
        <div className="flex-1">
          <h1 className="text-[20px] font-[800] text-neutral-900 tracking-tight leading-none">Daily Horoscope</h1>
        </div>
        <button
          onClick={handleShare}
          disabled={status !== 'success' || !horoscopeData}
          className="w-[40px] h-[40px] rounded-full bg-[#FFF9E6] text-[#FF8A00] flex items-center justify-center disabled:opacity-50 disabled:bg-neutral-100 disabled:text-neutral-400 transition-colors"
          aria-label="Share horoscope"
        >
          <Share2 size={18} strokeWidth={2} />
        </button>
      </div>

      {/* Zodiac Selector */}
      <div className="bg-white border-b border-neutral-100 py-3 shrink-0">
        <div className="overflow-x-auto no-scrollbar px-[20px] flex gap-2" role="tablist" aria-label="Zodiac signs">
          {ZODIAC_SIGNS.map((sign) => {
            const isSelected = sign === selectedSign;
            return (
              <button
                key={sign}
                role="tab"
                aria-selected={isSelected}
                aria-controls="horoscope-panel"
                onClick={() => {
                  if (!isSelected && status !== 'loading') {
                    setSelectedSign(sign);
                  }
                }}
                className={`flex flex-col items-center justify-center min-w-[70px] py-2 px-1 rounded-xl transition-all ${
                  isSelected 
                    ? 'bg-[#FF8A00] text-white shadow-md' 
                    : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <span className="text-xl mb-1">{/* Replace with actual SVG or emoji if desired, using basic symbol representation */}
                  {ZODIAC_METADATA[sign].symbol.charAt(0)}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wide ${isSelected ? 'text-white' : 'text-neutral-500'}`}>
                  {sign}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 py-4 flex gap-4 shrink-0 border-b border-neutral-100 bg-white">
        {(['Today', 'Tomorrow', 'Month'] as TabName[]).map((tab) => {
          const isActive = tab === activeTab;
          const isDisabled = tab !== 'Today';
          
          return (
            <button
              key={tab}
              disabled={isDisabled}
              onClick={() => !isDisabled && setActiveTab(tab)}
              className={`pb-2 text-[14px] font-[700] tracking-wide relative ${
                isActive ? 'text-[#FF8A00]' : 'text-neutral-400'
              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-disabled={isDisabled}
            >
              <div className="flex items-center gap-1">
                {isDisabled && <Lock size={12} />}
                {tab}
              </div>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#FF8A00] rounded-t-full"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-5 py-6 bg-[#FAFAFA]" id="horoscope-panel" role="tabpanel">
        
        {/* Selected Sign Banner */}
        <div className="flex justify-between items-center mb-6 px-1">
          <div>
            <h2 className="text-[28px] font-[800] text-neutral-900 tracking-tight capitalize">
              {selectedSign}
            </h2>
            <p className="text-[13px] font-[600] text-neutral-500 mt-1">
              {metadata.dateRange}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[12px] font-[700] text-neutral-400 uppercase tracking-widest">Element</p>
            <p className="text-[15px] font-[700] text-neutral-800">{metadata.element}</p>
          </div>
        </div>

        {/* State rendering */}
        <AnimatePresence mode="wait">
          {status === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100"
            >
              <div className="animate-pulse flex flex-col gap-3">
                <div className="h-4 bg-neutral-100 rounded w-1/3"></div>
                <div className="h-4 bg-neutral-100 rounded w-full mt-2"></div>
                <div className="h-4 bg-neutral-100 rounded w-5/6"></div>
                <div className="h-4 bg-neutral-100 rounded w-4/6"></div>
              </div>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-red-50 rounded-2xl p-6 border border-red-100 flex flex-col items-center text-center"
            >
              <AlertCircle size={32} className="text-red-400 mb-3" />
              <p className="text-[14px] font-[600] text-red-800 mb-4">{errorMessage}</p>
              {isRetryable && (
                <button
                  onClick={() => fetchHoroscope(selectedSign)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white text-red-600 font-[700] text-[13px] rounded-xl shadow-sm border border-red-200 active:scale-95 transition-all"
                >
                  <RefreshCw size={16} />
                  Retry
                </button>
              )}
            </motion.div>
          )}

          {status === 'success' && horoscopeData && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4"
            >
              {isStaleFallback && (
                <div className="bg-[#FFF9E6] border border-[#F4A300]/30 rounded-xl p-3 flex items-start gap-2.5 mb-2">
                  <AlertCircle size={16} className="text-[#D68B00] shrink-0 mt-0.5" />
                  <p className="text-[12.5px] font-[600] text-[#B07300] leading-snug">
                    Showing today's last available horoscope while the service reconnects.
                  </p>
                </div>
              )}

              <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-neutral-100/60 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#FFFBEB] to-transparent opacity-50 -mr-10 -mt-10 rounded-full blur-2xl"></div>
                
                <h3 className="text-[12px] font-[800] text-[#FF8A00] uppercase tracking-widest mb-4">Today's Overview</h3>
                <p className="text-[16px] leading-[1.65] font-[500] text-neutral-700 relative z-10">
                  {horoscopeData.overview}
                </p>
              </div>

              {/* Static Metadata Cards */}
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100 flex flex-col">
                  <span className="text-[11px] font-[700] text-neutral-400 uppercase tracking-widest mb-1">Ruling Planet</span>
                  <span className="text-[14px] font-[700] text-neutral-800">{metadata.planet}</span>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100 flex flex-col">
                  <span className="text-[11px] font-[700] text-neutral-400 uppercase tracking-widest mb-1">Symbol</span>
                  <span className="text-[14px] font-[700] text-neutral-800">{metadata.symbol}</span>
                </div>
              </div>

              {/* Detailed Insights Placeholder */}
              <div className="mt-4 bg-gradient-to-r from-neutral-800 to-neutral-900 rounded-2xl p-5 flex items-center justify-between border border-neutral-950/20 shadow-lg relative overflow-hidden group">
                <div className="relative z-10">
                  <h4 className="text-[15px] font-[800] text-white tracking-tight mb-1">Detailed Insights</h4>
                  <p className="text-[13px] font-[500] text-white/70">Coming soon in the next update</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center relative z-10 backdrop-blur-sm">
                  <Lock size={16} className="text-white/80" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
