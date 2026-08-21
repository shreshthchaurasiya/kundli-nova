import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Share2, AlertCircle, RefreshCw, Lock } from 'lucide-react';
import { Screen } from '../types';
import { useProfile } from '../contexts/ProfileContext';
import { ZodiacSign, ZODIAC_SIGNS, KundliNovaDailyHoroscope } from '../server/types/astrologyProvider';
import { getWesternSunSign, ZODIAC_METADATA } from '../utils/astrology';
import { AstrologyApi } from '../services/api/astrologyApi';
import { ApiError } from '../services/api/apiErrors';
import ZODIAC_IMAGES from '../assets/zodiac/index';

interface HoroscopeScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
}

type LoadingState = 'idle' | 'loading' | 'success' | 'error';
type TabName = 'Yesterday' | 'Today' | 'Tomorrow';

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

  const fetchHoroscope = useCallback(async (sign: ZodiacSign, tab: TabName) => {
    setStatus('loading');
    setErrorMessage('');
    setIsStaleFallback(false);
    // Calculate date string based on tab
    const dateObj = new Date();
    if (tab === 'Yesterday') dateObj.setDate(dateObj.getDate() - 1);
    if (tab === 'Tomorrow') dateObj.setDate(dateObj.getDate() + 1);
    const dateStr = dateObj.toISOString().split('T')[0];

    try {
      const data = await AstrologyApi.getDailyHoroscope(sign, dateStr);
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
    fetchHoroscope(selectedSign, activeTab);
  }, [selectedSign, activeTab, fetchHoroscope]);

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
          {ZODIAC_SIGNS.map((sign, i) => {
            const isSelected = sign === selectedSign;
            return (
              <motion.button
                key={sign}
                role="tab"
                aria-selected={isSelected}
                aria-controls="horoscope-panel"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, type: 'spring', stiffness: 320, damping: 24 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  if (!isSelected && status !== 'loading') {
                    setSelectedSign(sign);
                  }
                }}
                className={`flex flex-col items-center justify-center min-w-[64px] py-2.5 px-1.5 rounded-2xl transition-all relative overflow-hidden ${
                  isSelected
                    ? 'shadow-[0_4px_16px_rgba(255,138,0,0.30)] scale-105'
                    : 'bg-[#FAFAFA] hover:bg-[#FFF3E0]'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="zodiac-selector-pill"
                    className="absolute inset-0 bg-[#FF8A00] rounded-2xl"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <div className="relative z-10 mb-1">
                  {ZODIAC_IMAGES[sign] ? (
                    <img
                      src={ZODIAC_IMAGES[sign]}
                      alt={sign}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[#FFE0B2] text-[#E65100]'
                    }`}>
                      {sign.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className={`relative z-10 text-[9px] font-[800] uppercase tracking-wider mt-0.5 ${
                  isSelected ? 'text-white' : 'text-neutral-500'
                }`}>
                  {sign}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>


      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-5 py-6 bg-[#FAFAFA]" id="horoscope-panel" role="tabpanel">
        
        {/* Selected Sign Banner */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedSign}
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="flex items-center gap-4 mb-6 bg-gradient-to-r from-[#FFF9F0] to-[#FFFDF9] rounded-[22px] p-4 border border-[#FFE0B2] shadow-[0_2px_16px_rgba(255,138,0,0.08)]"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.06, 1] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
              className="shrink-0"
            >
              {ZODIAC_IMAGES[selectedSign] ? (
                <img
                  src={ZODIAC_IMAGES[selectedSign]}
                  alt={selectedSign}
                  className="w-16 h-16 rounded-full object-cover shadow-[0_4px_16px_rgba(255,138,0,0.25)]"
                />
              ) : null}
            </motion.div>
            <div className="flex-1">
              <h2 className="text-[24px] font-[900] text-neutral-900 tracking-tight capitalize leading-tight">
                {selectedSign}
              </h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[11px] font-[700] text-[#FF8A00] bg-[#FFF3E0] px-2.5 py-1 rounded-lg">
                  {metadata.element}
                </span>
                <span className="text-[11px] font-[700] text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-lg">
                  {metadata.planet}
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

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

              {horoscopeData.categories ? (
                <div className="flex flex-col gap-4">
                  {/* General Overview */}
                  {horoscopeData.overview && (
                    <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-neutral-100/60 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#FFFBEB] to-transparent opacity-50 -mr-10 -mt-10 rounded-full blur-2xl"></div>
                      <div className="flex justify-between items-center mb-4 relative z-10">
                        <h3 className="text-[12px] font-[800] text-[#FF8A00] uppercase tracking-widest">
                          {activeTab}'s Overview
                        </h3>
                        <span className="text-[11px] font-[750] text-[#FF8A00] bg-[#FFF9E6] px-2 py-0.5 rounded-md border border-[#FFE0B2]">
                          {new Date(horoscopeData.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <p className="text-[15px] leading-[1.6] font-[500] text-neutral-700 relative z-10">
                        {horoscopeData.overview}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    {horoscopeData.categories.personal && (
                      <div className="bg-white rounded-2xl p-5 shadow-sm border border-pink-100 relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[18px]">💖</span>
                          <h4 className="text-[13px] font-[800] text-pink-500 uppercase tracking-wider">Personal & Love</h4>
                        </div>
                        <p className="text-[14px] font-[500] text-neutral-700 leading-relaxed">{horoscopeData.categories.personal}</p>
                      </div>
                    )}
                    {horoscopeData.categories.profession && (
                      <div className="bg-white rounded-2xl p-5 shadow-sm border border-blue-100 relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[18px]">💼</span>
                          <h4 className="text-[13px] font-[800] text-blue-500 uppercase tracking-wider">Career & Finance</h4>
                        </div>
                        <p className="text-[14px] font-[500] text-neutral-700 leading-relaxed">{horoscopeData.categories.profession}</p>
                      </div>
                    )}
                    {horoscopeData.categories.health && (
                      <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-100 relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[18px]">🌿</span>
                          <h4 className="text-[13px] font-[800] text-green-500 uppercase tracking-wider">Health & Wellness</h4>
                        </div>
                        <p className="text-[14px] font-[500] text-neutral-700 leading-relaxed">{horoscopeData.categories.health}</p>
                      </div>
                    )}
                    {horoscopeData.categories.travel && (
                      <div className="bg-white rounded-2xl p-5 shadow-sm border border-purple-100 relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[18px]">✈️</span>
                          <h4 className="text-[13px] font-[800] text-purple-500 uppercase tracking-wider">Travel</h4>
                        </div>
                        <p className="text-[14px] font-[500] text-neutral-700 leading-relaxed">{horoscopeData.categories.travel}</p>
                      </div>
                    )}
                    {horoscopeData.categories.emotions && (
                      <div className="bg-white rounded-2xl p-5 shadow-sm border border-indigo-100 relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[18px]">🎭</span>
                          <h4 className="text-[13px] font-[800] text-indigo-500 uppercase tracking-wider">Emotions & Mind</h4>
                        </div>
                        <p className="text-[14px] font-[500] text-neutral-700 leading-relaxed">{horoscopeData.categories.emotions}</p>
                      </div>
                    )}
                    {horoscopeData.categories.luck && (
                      <div className="bg-white rounded-2xl p-5 shadow-sm border border-amber-100 relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[18px]">🍀</span>
                          <h4 className="text-[13px] font-[800] text-amber-500 uppercase tracking-wider">Luck & Fortune</h4>
                        </div>
                        <p className="text-[14px] font-[500] text-neutral-700 leading-relaxed">{horoscopeData.categories.luck}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-neutral-100/60 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#FFFBEB] to-transparent opacity-50 -mr-10 -mt-10 rounded-full blur-2xl"></div>
                  
                  <div className="flex justify-between items-center mb-4 relative z-10">
                    <h3 className="text-[12px] font-[800] text-[#FF8A00] uppercase tracking-widest">
                      {activeTab}'s Overview
                    </h3>
                    <span className="text-[11px] font-[750] text-[#FF8A00] bg-[#FFF9E6] px-2 py-0.5 rounded-md border border-[#FFE0B2]">
                      {new Date(horoscopeData.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <p className="text-[16px] leading-[1.65] font-[500] text-neutral-700 relative z-10">
                    {horoscopeData.overview}
                  </p>
                </div>
              )}

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


            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
