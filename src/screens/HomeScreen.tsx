import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Compass, Hash, Palette, ShieldAlert, Activity,  Menu, ChevronRight, Star, Sparkles, ShieldCheck, Heart, Clock, SlidersHorizontal, SunMoon, Plus, Zap, Briefcase, TrendingUp, Quote, History, Sun, RefreshCw, AlertCircle, User } from 'lucide-react';
import { Screen, Astrologer } from '../types';
import { useProfile } from '../contexts/ProfileContext';
import { useWallet } from '../contexts/WalletContext';
import { useAstrologerPartner } from '../features/astrologer';
import { usePersonalizedHome } from '../hooks/usePersonalizedHome';

interface HomeScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
  onOpenDrawer?: () => void;
}

const BANNERS = [
  {
    id: 1,
    image: 'https://i.ibb.co/qzDq1YN/unnamed.jpg',
    isImageOnly: true
  },
  {
    id: 2,
    image: 'https://i.ibb.co/SXjvqx2X/Gemini-Generated-Image-jorej9jorej9jore.png',
    isImageOnly: true
  }
];

export default function HomeScreen({ onNavigate, onOpenDrawer }: HomeScreenProps) {
  const { profile } = useProfile();
  const { wallet } = useWallet();
  const { directory: astrologers, isLoadingDirectory } = useAstrologerPartner();
  const [currentBanner, setCurrentBanner] = useState(0);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const walletBalance = wallet.balance;
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [onlineCount, setOnlineCount] = useState<number>(327);
  const { status: homeStatus, data: homeData, errorMessage, isProfileError, retry } = usePersonalizedHome();

  useEffect(() => {
    // profile is accessed from useProfile
    // setProfileData removed

    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % BANNERS.length);
    }, 5000);

    // Live Count Fluctuation
    const countInterval = setInterval(() => {
      setOnlineCount((prev) => {
        const delta = Math.floor(Math.random() * 5) - 2;
        const next = prev + delta;
        return next >= 315 && next <= 345 ? next : prev;
      });
    }, 4000);

    // Countdown logic
    const COUNTDOWN_KEY = 'kundli_nova_offer_countdown';
    let targetTime = localStorage.getItem(COUNTDOWN_KEY);
    if (!targetTime) {
      const futureTime = Date.now() + 2 * 60 * 60 * 1000 + 15 * 60 * 1000 + 45 * 1000; // 2h 15m 45s
      localStorage.setItem(COUNTDOWN_KEY, futureTime.toString());
      targetTime = futureTime.toString();
    }

    const target = parseInt(targetTime, 10);
    const updateTimer = () => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft(0);
      } else {
        setTimeLeft(diff);
      }
    };
    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(countInterval);
      clearInterval(timerInterval);
    };
  }, []);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':');
  };

  const userName = homeData?.profile?.firstName || profile?.name?.split(' ')[0] || 'Guest User';
  const userPhone = profile?.phone || '+91 - Not provided';
  const todayDate = homeData?.today?.formattedDate || '';
  const todayWeekday = homeData?.today?.weekday || '';
  const isHomeLoading = homeStatus === 'loading' || homeStatus === 'idle';

  // Stagger animation container
  const containerVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } }
  };

  const listContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const listCardVariants = {
    hidden: { opacity: 0, y: 16, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 26
      }
    },
    exit: {
      opacity: 0,
      y: -12,
      scale: 0.98,
      transition: {
        duration: 0.2
      }
    }
  };

  return (
    <div className="flex-1 relative overflow-hidden bg-[#FAFAFA] selection:bg-[#FF8A00]/20 flex flex-col">
      <div className="flex flex-col flex-1 overflow-y-auto no-scrollbar pb-24">

        {/* App Bar */}
        <div className="flex items-center justify-between px-[20px] py-[16px] bg-[#FFFFFF]/90 backdrop-blur-md sticky top-0 z-30 border-b border-gray-100/60 shadow-[0_2px_12px_rgba(0,0,0,0.015)]">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onOpenDrawer}
            className="p-[8px] -ml-[8px] rounded-full text-[#111827] hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <Menu size={22} strokeWidth={2.5} />
          </motion.button>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => onNavigate('wallet')}
              className="flex items-center space-x-1.5 border border-gray-300 rounded-full pl-3 pr-1 py-1 hover:bg-gray-50 transition-colors"
            >
              <span className="text-[14px] font-semibold text-[#111827]">₹{walletBalance}</span>
              <div className="w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center">
                <Plus size={14} strokeWidth={3} />
              </div>
            </button>

            <button className="text-gray-600 hover:text-gray-900 transition-colors">
              <Search size={22} strokeWidth={2} />
            </button>

            <button
              onClick={() => onNavigate('chat-history')}
              className="text-gray-600 hover:text-gray-900 transition-colors relative"
            >
              <History size={22} strokeWidth={2} />
            </button>
          </div>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="px-[20px] space-y-[24px] mt-[16px]"
        >

          {/* Banner Carousel */}
          <motion.div
            variants={itemVariants}
            className="relative rounded-[20px] overflow-hidden aspect-[2.75/1] shadow-[0_8px_30px_rgba(0,0,0,0.04)] bg-gray-950 border border-gray-100/50"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentBanner}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0"
              >
                <img
                  src={BANNERS[currentBanner].image}
                  className="w-full h-full object-cover select-none pointer-events-none"
                  alt="Banner"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  loading="eager"
                  fetchPriority="high"
                />
              </motion.div>
            </AnimatePresence>

            {/* Pagination Dots */}
            <div className="absolute bottom-[10px] left-0 right-0 flex justify-center z-10">
              <div className="flex space-x-[5px] bg-black/15 backdrop-blur-md px-[8px] py-[5px] rounded-full">
                {BANNERS.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentBanner(idx)}
                    className={`h-[4.5px] rounded-full transition-all duration-300 focus:outline-none ${currentBanner === idx ? 'w-[14px] bg-[#FFFFFF]' : 'w-[4.5px] bg-[#FFFFFF]/60 hover:bg-[#FFFFFF]/90'}`}
                  />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Offer Countdown Strip */}
          <motion.div
            variants={itemVariants}
            className="bg-[#FFFFFF] rounded-[16px] border border-[#F4A300]/20 shadow-[0_2px_10px_rgba(0,0,0,0.015)] px-4 py-2.5 flex items-center justify-between relative overflow-hidden"
          >
            {/* Soft decorative light gold gradient overlay */}
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#F4A300]/5 to-transparent pointer-events-none"></div>

            <div className="flex items-center gap-2 relative z-10">
              <Zap size={14} className="text-[#FF8A00] fill-[#FF8A00]/10" />
              <span className="text-[12px] font-extrabold text-gray-900 tracking-wide">Special Welcome Offer Active</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 bg-[#FFF9E6] border border-[#F4A300]/15 px-2.5 py-1 rounded-full relative z-10">
              <span className="text-[9.5px] font-[800] text-[#D68B00] uppercase tracking-wider">Offer Ends In</span>
              <span className="text-[12.5px] font-black text-gray-900 font-mono tracking-wider min-w-[64px] text-center">
                {timeLeft === null ? '02:15:45' : timeLeft === 0 ? 'Offer Expired' : formatTime(timeLeft)}
              </span>
            </div>
          </motion.div>

          {/* Quick Services Grid */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-4 gap-[8px]"
          >
            {[
              { icon: <img src="https://i.ibb.co/B5sjrYXW/image-removebg-preview-1.png" alt="Daily Horoscope" loading="eager" fetchPriority="high" draggable={false} onContextMenu={(e) => e.preventDefault()} className="w-full h-full object-cover scale-[1.3] select-none pointer-events-none transition-transform duration-300 group-hover:scale-[1.38]" />, bg: 'bg-gradient-to-br from-[#FFFBEB] to-[#F7E7C4]', borderColor: 'border-[#F7E7C4]/40', label: 'DAILY\nHOROSCOPE', action: () => onNavigate('horoscope') },
              { icon: <img src="https://i.ibb.co/N2z5f8Gh/image-removebg-preview-2.png" alt="Free Kundli" loading="eager" fetchPriority="high" draggable={false} onContextMenu={(e) => e.preventDefault()} className="w-full h-full object-cover scale-[1.3] select-none pointer-events-none transition-transform duration-300 group-hover:scale-[1.38]" />, bg: 'bg-gradient-to-br from-[#EFF6FF] to-[#D3E2F2]', borderColor: 'border-[#D3E2F2]/40', label: 'FREE\nKUNDLI', action: () => onNavigate('nova-kundli', { mode: 'kundli', returnTo: 'home' }) },
              { icon: <img src="https://i.ibb.co/4nKbYhZw/image-removebg-preview-3.png" alt="Kundli Matching" loading="eager" fetchPriority="high" draggable={false} onContextMenu={(e) => e.preventDefault()} className="w-full h-full object-cover scale-[1.3] select-none pointer-events-none transition-transform duration-300 group-hover:scale-[1.38]" />, bg: 'bg-gradient-to-br from-[#FEF2FE] to-[#F5D6D6]', borderColor: 'border-[#F5D6D6]/40', label: 'KUNDLI\nMATCHING', action: () => onNavigate('nova-kundli', { mode: 'matching', returnTo: 'home' }) },
              { icon: <img src="https://i.ibb.co/sJRdZrtC/image-removebg-preview-4.png" alt="Numerology" loading="eager" fetchPriority="high" draggable={false} onContextMenu={(e) => e.preventDefault()} className="w-full h-full object-cover scale-[1.3] select-none pointer-events-none transition-transform duration-300 group-hover:scale-[1.38]" />, bg: 'bg-gradient-to-br from-[#FAF5FF] to-[#E2D6F5]', borderColor: 'border-[#E2D6F5]/40', label: 'NUMEROLOGY' },
            ].map((item, i) => (
              <motion.div
                key={i}
                whileTap={{ scale: 0.95 }}
                onClick={() => item.action?.()}
                className={`flex flex-col items-center justify-start pt-[14px] pb-[10px] px-[2px] rounded-[20px] bg-[#FFFFFF] border ${item.borderColor} shadow-[0_4px_16px_rgba(0,0,0,0.015)] active:shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all h-[118px] cursor-pointer group hover:border-[#FF8A00]/20`}
              >
                <div className={`w-[54px] h-[54px] rounded-full ${item.bg} flex items-center justify-center overflow-hidden mb-[8px] shrink-0 shadow-inner`}>
                  {item.icon}
                </div>
                <div className="flex-1 flex items-center justify-center w-full">
                  <span className="text-[10px] font-extrabold text-[#111827] text-center leading-[1.3] tracking-[0.3px] whitespace-pre-line group-hover:text-[#FF8A00] transition-colors">{item.label}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Filters Row */}
          <motion.div
            id="astrologer-section"
            variants={itemVariants}
            className="flex items-center overflow-x-auto no-scrollbar space-x-[8px] -mx-[20px] px-[20px] pb-[16px] pt-[2px]"
          >
            {[
              { label: 'All', value: null, icon: <SlidersHorizontal size={13} className="stroke-[2.4]" /> },
              { label: 'Love', value: 'Love' },
              { label: 'Career', value: 'Career' },
              { label: 'Marriage', value: 'Marriage' },
              { label: 'Business', value: 'Business' },
              { label: 'Health', value: 'Health' },
              { label: 'Education', value: 'Education' },
              { label: 'Numerology', value: 'Numerology' },
              { label: 'Remedies', value: 'Remedies' }
            ].map((filter, i) => {
              const isActive = activeFilter === filter.value;
              return (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setActiveFilter(filter.value)}
                  className="relative flex items-center space-x-[6px] px-[18px] py-[9.5px] rounded-full whitespace-nowrap transition-colors duration-300 shrink-0 focus:outline-none"
                >
                  {/* Base subtle background for unselected */}
                  {!isActive && (
                    <div className="absolute inset-0 rounded-full border border-gray-200/75 bg-[#FFFFFF] shadow-[0_2px_8px_rgba(0,0,0,0.015)] hover:border-gray-300/90 transition-all duration-300" />
                  )}

                  {/* Gliding premium background indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeCategoryBg"
                      className="absolute inset-0 bg-[#FF8A00] rounded-full shadow-[0_4px_16px_rgba(255,138,0,0.22)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}

                  <span className={`relative text-[13px] font-[600] tracking-tight transition-colors duration-300 ${isActive ? 'text-white font-[700]' : 'text-[#4B5563]'}`}>
                    {filter.label}
                  </span>

                  {filter.icon && (
                    <span className={`relative transition-colors duration-300 ${isActive ? 'text-white' : 'text-[#9CA3AF]'}`}>
                      {filter.icon}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </motion.div>

          {/* Dynamic Top Astrologer Feature */}
          <motion.div variants={itemVariants} className="space-y-[12px]">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-[800] text-[#111827] uppercase tracking-wider">Recommended For You</h3>
              <div className="flex items-center space-x-[12px]">
                <div className="flex space-x-[4px]">
                  {astrologers.slice(0, 3).map((_, idx) => (
                    <div key={idx} className={`h-[4px] rounded-full transition-all duration-300 ${currentBanner % Math.min(3, astrologers.length || 1) === idx ? 'w-[12px] bg-[#FF8A00]' : 'w-[4px] bg-[#E5E7EB]'}`} />
                  ))}
                </div>
                <button
                  onClick={() => setActiveFilter(null)}
                  className="text-[11px] font-[800] text-[#FF8A00] hover:text-[#E07A00] active:scale-95 transition-all uppercase tracking-wider focus:outline-none"
                >
                  View All
                </button>
              </div>
            </div>
            {isLoadingDirectory ? (
              <div className="h-[142px] animate-pulse rounded-[20px] bg-neutral-100" />
            ) : astrologers.length > 0 ? <AnimatePresence mode="wait">
              <motion.div
                key={currentBanner % Math.min(3, astrologers.length)}
                initial={{ opacity: 0, scale: 0.97, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: -4 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
              >
                <TopAstrologerCard
                  astro={astrologers[currentBanner % Math.min(3, astrologers.length)]}
                  onClick={() => onNavigate('astrologer-profile', { astrologerId: astrologers[currentBanner % Math.min(3, astrologers.length)].id })}
                  onChat={() => onNavigate('consultation-chat', { astrologerId: astrologers[currentBanner % Math.min(3, astrologers.length)].id })}
                />
              </motion.div>
            </AnimatePresence> : (
              <div className="rounded-[18px] border border-neutral-100 bg-white p-5 text-center text-xs font-semibold text-neutral-500">Verified astrologers will appear here.</div>
            )}
          </motion.div>

          {/* Normal Astrologers List */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFilter || 'all'}
              variants={listContainerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="flex flex-col space-y-[14px] pb-4"
            >
              {astrologers.filter(a => !activeFilter || a.skills.includes(activeFilter)).map((astro) => (
                <motion.div
                  key={astro.id}
                  variants={listCardVariants}
                  layout
                >
                  <TopAstrologerCard
                    astro={astro}
                    onClick={() => onNavigate('astrologer-profile', { astrologerId: astro.id })}
                    onChat={() => onNavigate('consultation-chat', { astrologerId: astro.id })}
                  />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>

          {/* Today's Cosmic Dashboard - Luxury Vedic Layout */}
          <motion.div
            variants={itemVariants}
            className="bg-[#FFFFFF] rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-[#F4A300]/20 relative overflow-hidden"
          >
            {/* Subtle Celestial Decorative Elements */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-b from-[#F4A300]/6 to-transparent rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-gradient-to-t from-[#F4A300]/4 to-transparent rounded-full blur-xl pointer-events-none"></div>

            {/* Custom low-opacity constellation lines decorative vector */}
            <svg className="absolute -top-4 -right-4 w-28 h-28 text-[#F4A300]/6 pointer-events-none" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.5">
              <circle cx="50" cy="50" r="40" strokeDasharray="2 2" />
              <circle cx="50" cy="50" r="30" />
              <path d="M10 50h80M50 10v80" />
              <path d="M20 20l60 60M20 80l60-60" strokeDasharray="1 3" />
            </svg>

            <div className="p-4 relative z-10">

              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
                    {todayWeekday ? `${todayWeekday}, ` : ''}{todayDate || 'Today'} ✨
                  </h3>
                  <h2 className="text-[16px] font-extrabold text-gray-900">Good Morning, {userName}</h2>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FFF4D6] to-[#FFF9E6] border border-[#F4A300]/20 flex items-center justify-center shrink-0 shadow-sm">
                  <Sparkles size={14} className="text-[#D68B00]" strokeWidth={1.5} />
                </div>
              </div>

              {/* Loading Skeleton */}
              {isHomeLoading && (
                <div className="space-y-3 animate-pulse">
                  <div className="h-[80px] bg-gray-100 rounded-[18px]" />
                  <div className="grid grid-cols-3 gap-2">
                    <div className="h-[70px] bg-gray-100 rounded-[16px]" />
                    <div className="h-[70px] bg-gray-100 rounded-[16px]" />
                    <div className="h-[70px] bg-gray-100 rounded-[16px]" />
                  </div>
                  <div className="h-[44px] bg-gray-100 rounded-[14px]" />
                </div>
              )}

              {/* Error State */}
              {(homeStatus === 'error') && (
                <div className="bg-rose-50 border border-rose-100/80 rounded-[16px] p-4 flex flex-col items-center text-center gap-3">
                  <AlertCircle size={22} className="text-rose-400" />
                  <p className="text-[12px] font-semibold text-gray-600 leading-relaxed">{errorMessage}</p>
                  <button
                    onClick={() => retry()}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-[#FF8A00] uppercase tracking-wider"
                  >
                    <RefreshCw size={11} strokeWidth={2.5} />
                    Try Again
                  </button>
                </div>
              )}

              {/* Empty Profile State */}
              {homeStatus === 'empty-profile' && (
                <div className="bg-amber-50 border border-amber-100/80 rounded-[16px] p-4 flex flex-col items-center text-center gap-3">
                  <User size={22} className="text-amber-400" />
                  <p className="text-[12px] font-semibold text-gray-600 leading-relaxed">{errorMessage}</p>
                  <button
                    onClick={() => onNavigate('kundli-profile-form')}
                    className="px-4 py-2 bg-[#FF8A00] text-white text-[12px] font-bold rounded-[10px]"
                  >
                    Complete Profile
                  </button>
                </div>
              )}

              {/* Partial Warning */}
              {homeStatus === 'partial' && (
                <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-100/60 rounded-[12px] flex items-center gap-2">
                  <AlertCircle size={12} className="text-amber-500 shrink-0" />
                  <span className="text-[10.5px] font-semibold text-amber-700">Some insights are temporarily unavailable.</span>
                </div>
              )}

              {/* Real Data — shown only when we have a successful or partial response */}
              {(homeStatus === 'success' || homeStatus === 'partial') && homeData && (() => {
                const insights = homeData.dailyInsights;
                const scoringAvailable = insights?.scoringAvailable === true;
                const cosmicScore = scoringAvailable ? Math.max(0, Math.min(100, insights.cosmicEnergy.score)) : null;
                const loveScore = scoringAvailable ? Math.max(0, Math.min(100, insights.love.score)) : null;
                const careerScore = scoringAvailable ? Math.max(0, Math.min(100, insights.career.score)) : null;
                const wealthScore = scoringAvailable ? Math.max(0, Math.min(100, insights.wealth.score)) : null;
                const dasharray = cosmicScore !== null ? `${cosmicScore}, 100` : '0, 100';

                return (
                  <>
                    {/* Energy Summary Card */}
                    <div className="bg-gradient-to-br from-[#FFFDF9] to-[#FAFAFA] border border-[#F4A300]/15 rounded-[18px] p-3 shadow-[0_2px_12px_rgba(0,0,0,0.015)] mb-3 flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <span className="text-[10px] font-bold text-[#D68B00]/80 uppercase tracking-wider block mb-0.5">Cosmic Energy</span>
                        {scoringAvailable && cosmicScore !== null ? (
                          <h4 className="text-[20px] font-extrabold text-gray-900 leading-tight">{cosmicScore}<span className="text-[12px] text-gray-400 font-semibold">/100</span></h4>
                        ) : (
                          <h4 className="text-[13px] font-semibold text-gray-400 leading-tight">Score unavailable</h4>
                        )}
                        <p className="text-[10.5px] text-gray-500 mt-1">
                          {homeData.dasha.mahadasha ? `Mahadasha: ${homeData.dasha.mahadasha}` : 'Based on your Kundli'}
                          {homeData.dasha.antardasha ? ` · ${homeData.dasha.antardasha}` : ''}
                        </p>
                      </div>
                      <div className="relative w-[60px] h-[60px] flex items-center justify-center shrink-0">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <path className="text-[#FFF9E6]" strokeWidth="3.2" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                          <path className="text-[#F4A300]" strokeWidth="3.5" strokeDasharray={dasharray} strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          {scoringAvailable && cosmicScore !== null ? (
                            <span className="text-[12.5px] font-black text-gray-900 leading-none">{cosmicScore}%</span>
                          ) : (
                            <span className="text-[9px] text-gray-400 font-semibold text-center leading-tight">N/A</span>
                          )}
                        </div>
                        <div className="absolute top-[1px] right-[1px] bg-white rounded-full p-[2px] shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-gray-100 flex items-center justify-center">
                          <Sun size={8} className="text-[#F4A300] fill-[#F4A300]" strokeWidth={2.5} />
                        </div>
                      </div>
                    </div>

                    {/* Three Insight Cards */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {/* Love */}
                      <div className="bg-white rounded-[16px] p-2.5 border border-gray-100/80 shadow-[0_3px_12px_rgba(0,0,0,0.01)] flex flex-col items-center text-center">
                        <div className="w-7 h-7 rounded-full bg-rose-50 border border-rose-100/30 flex items-center justify-center mb-1">
                          <Heart size={13} className="text-rose-500 fill-rose-500/10" strokeWidth={2} />
                        </div>
                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Love</span>
                        {loveScore !== null ? (
                          <div className="mb-0.5"><span className="text-[14px] font-extrabold text-gray-900">{loveScore}</span><span className="text-[9px] text-gray-400 font-semibold">/100</span></div>
                        ) : (
                          <span className="text-[9px] font-semibold text-gray-400 leading-tight">—</span>
                        )}
                        <span className="text-[9px] font-semibold text-gray-500 leading-tight">
                          {insights.love.confidence === 'high' ? 'Strong' : insights.love.confidence === 'medium' ? 'Moderate' : '—'}
                        </span>
                      </div>

                      {/* Career */}
                      <div className="bg-white rounded-[16px] p-2.5 border border-gray-100/80 shadow-[0_3px_12px_rgba(0,0,0,0.01)] flex flex-col items-center text-center">
                        <div className="w-7 h-7 rounded-full bg-amber-50 border border-amber-100/30 flex items-center justify-center mb-1">
                          <Briefcase size={13} className="text-amber-500" strokeWidth={2} />
                        </div>
                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Career</span>
                        {careerScore !== null ? (
                          <div className="mb-0.5"><span className="text-[14px] font-extrabold text-gray-900">{careerScore}</span><span className="text-[9px] text-gray-400 font-semibold">/100</span></div>
                        ) : (
                          <span className="text-[9px] font-semibold text-gray-400 leading-tight">—</span>
                        )}
                        <span className="text-[9px] font-semibold text-gray-500 leading-tight">
                          {insights.career.confidence === 'high' ? 'Focused' : insights.career.confidence === 'medium' ? 'Steady' : '—'}
                        </span>
                      </div>

                      {/* Wealth */}
                      <div className="bg-white rounded-[16px] p-2.5 border border-gray-100/80 shadow-[0_3px_12px_rgba(0,0,0,0.01)] flex flex-col items-center text-center">
                        <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-100/30 flex items-center justify-center mb-1">
                          <TrendingUp size={13} className="text-emerald-500" strokeWidth={2} />
                        </div>
                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Wealth</span>
                        {wealthScore !== null ? (
                          <div className="mb-0.5"><span className="text-[14px] font-extrabold text-gray-900">{wealthScore}</span><span className="text-[9px] text-gray-400 font-semibold">/100</span></div>
                        ) : (
                          <span className="text-[9px] font-semibold text-gray-400 leading-tight">—</span>
                        )}
                        <span className="text-[9px] font-semibold text-gray-500 leading-tight">
                          {insights.wealth.confidence === 'high' ? 'Growing' : insights.wealth.confidence === 'medium' ? 'Stable' : '—'}
                        </span>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <button disabled className="w-full py-2.5 bg-[#111827]/70 cursor-not-allowed rounded-[14px] flex items-center justify-between px-4 group shadow-none">
                      <div className="flex items-center gap-2.5 opacity-70">
                        <svg className="w-4 h-4 text-[#F4A300] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 2v20M2 12h20M12 12l7.07-7.07M4.93 19.07l14.14-14.14M4.93 4.93l14.14 14.14" />
                          <circle cx="12" cy="12" r="4" className="stroke-[#F4A300]/40" />
                        </svg>
                        <span className="text-[13px] font-bold text-white tracking-wide">Full Prediction (Coming Soon)</span>
                      </div>
                    </button>

                    <div className="flex items-center justify-center gap-1 mt-2.5 text-gray-400">
                      <Clock size={11} className="text-[#D68B00]/60" />
                      <span className="text-[9.5px] font-semibold uppercase tracking-wider">Updated daily at 5:00 AM</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </motion.div>

          {/* Today's Panchang Section */}
          <motion.div
            variants={itemVariants}
            className="bg-[#FFFFFF] rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-[#F4A300]/20 relative overflow-hidden"
          >
            {/* Subtle Celestial Decorative Gradients */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-b from-[#F4A300]/5 to-transparent rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-gradient-to-t from-[#F4A300]/4 to-transparent rounded-full blur-xl pointer-events-none"></div>

            <div className="p-4 relative z-10">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Vedic Time & Muhurat</h3>
                  <h2 className="text-[16px] font-extrabold text-gray-900">Today's Panchang</h2>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FFF4D6] to-[#FFF9E6] border border-[#F4A300]/20 flex items-center justify-center shrink-0 shadow-sm">
                  <SunMoon size={14} className="text-[#D68B00]" strokeWidth={1.5} />
                </div>
              </div>

              {/* 3x2 Grid for 6 Panchang Values — backend-driven */}
              {isHomeLoading ? (
                <div className="grid grid-cols-3 gap-2 animate-pulse">
                  {[...Array(6)].map((_, i) => <div key={i} className="h-[66px] bg-gray-100 rounded-[14px]" />)}
                </div>
              ) : homeData ? (
                <div className="grid grid-cols-3 gap-2">
                  {/* Tithi */}
                  <div className="bg-gradient-to-b from-white to-[#FAFAFA] rounded-[14px] border border-gray-100 p-2 flex flex-col items-center text-center justify-between min-h-[66px]">
                    <SunMoon size={13} className="text-[#D68B00] mb-0.5 shrink-0" strokeWidth={1.5} />
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Tithi</span>
                    <span className="text-[11.5px] font-extrabold text-gray-800 leading-tight">{homeData.panchang.tithi || '—'}</span>
                  </div>

                  {/* Nakshatra */}
                  <div className="bg-gradient-to-b from-white to-[#FAFAFA] rounded-[14px] border border-gray-100 p-2 flex flex-col items-center text-center justify-between min-h-[66px]">
                    <Sparkles size={13} className="text-[#D68B00] mb-0.5 shrink-0" strokeWidth={1.5} />
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Nakshatra</span>
                    <span className="text-[11.5px] font-extrabold text-gray-800 leading-tight">{homeData.panchang.nakshatra || '—'}</span>
                  </div>

                  {/* Cell 3: Rahu Kaal or Yoga */}
                  <div className="bg-gradient-to-b from-white to-[#FAFAFA] rounded-[14px] border border-gray-100 p-2 flex flex-col items-center text-center justify-between min-h-[66px]">
                    {homeData.panchang.rahuKaal ? (
                      <>
                        <Clock size={13} className="text-rose-500 mb-0.5 shrink-0" strokeWidth={1.5} />
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Rahu Kaal</span>
                        <span className="text-[10px] font-bold text-rose-600 leading-tight">{homeData.panchang.rahuKaal}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} className="text-purple-400 mb-0.5 shrink-0" strokeWidth={1.5} />
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Yoga</span>
                        <span className="text-[11.5px] font-extrabold text-gray-800 leading-tight">{homeData.panchang.yoga || '—'}</span>
                      </>
                    )}
                  </div>

                  {/* Cell 4: Abhijit Muhurat or Karana */}
                  <div className="bg-gradient-to-b from-white to-[#FAFAFA] rounded-[14px] border border-gray-100 p-2 flex flex-col items-center text-center justify-between min-h-[66px]">
                    {homeData.panchang.abhijitMuhurat ? (
                      <>
                        <Sun size={13} className="text-emerald-500 mb-0.5 shrink-0" strokeWidth={1.5} />
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Abhijit</span>
                        <span className="text-[10px] font-bold text-emerald-600 leading-tight">{homeData.panchang.abhijitMuhurat}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} className="text-blue-400 mb-0.5 shrink-0" strokeWidth={1.5} />
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Karana</span>
                        <span className="text-[11.5px] font-extrabold text-gray-800 leading-tight">{homeData.panchang.karana || '—'}</span>
                      </>
                    )}
                  </div>

                  {/* Cell 5: Sunrise */}
                  <div className="bg-gradient-to-b from-white to-[#FAFAFA] rounded-[14px] border border-gray-100 p-2 flex flex-col items-center text-center justify-between min-h-[66px]">
                    <Sun size={13} className="text-amber-500 mb-0.5 shrink-0" strokeWidth={1.5} />
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Sunrise</span>
                    <span className="text-[11.5px] font-extrabold text-gray-800 leading-tight">{homeData.panchang.sunrise || '—'}</span>
                  </div>

                  {/* Cell 6: Sunset */}
                  <div className="bg-gradient-to-b from-white to-[#FAFAFA] rounded-[14px] border border-gray-100 p-2 flex flex-col items-center text-center justify-between min-h-[66px]">
                    <SunMoon size={13} className="text-slate-600 mb-0.5 shrink-0" strokeWidth={1.5} />
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Sunset</span>
                    <span className="text-[11.5px] font-extrabold text-gray-800 leading-tight">{homeData.panchang.sunset || '—'}</span>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>

          {/* Daily Lucky Insights Section */}
          <motion.div
            variants={itemVariants}
            className="bg-[#FFFFFF] rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-[#F4A300]/20 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-b from-[#F4A300]/4 to-transparent rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="p-5 relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FFF4D6] to-[#FFF9E6] border border-[#F4A300]/20 flex items-center justify-center shadow-sm">
                  <Star size={14} className="text-[#D68B00]" strokeWidth={1.5} />
                </div>
                <h2 className="text-[15px] font-extrabold text-gray-900">Daily Lucky Insights</h2>
              </div>
              
              {homeStatus === 'loading' ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 animate-pulse">
                  {[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-50 rounded-[14px] border border-gray-100"></div>)}
                </div>
              ) : homeData && (!homeData.luckyInsights || Object.keys(homeData.luckyInsights).length <= 5) ? (
                <div className="py-5 text-center flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-[14px] bg-gray-50/50">
                  <p className="text-[12px] text-gray-500 font-medium">Lucky insights are temporarily unavailable.</p>
                </div>
              ) : homeData && homeData.luckyInsights ? (
                <div className="flex flex-col gap-3">
                  {homeData.luckyInsights.dataStatus === 'partial' && (
                    <div className="text-[11px] text-[#D68B00] bg-[#FFF9E6] px-3 py-2 rounded-[10px] border border-[#F4A300]/20 font-medium flex items-center gap-1.5">
                      <AlertCircle size={12} />
                      Some lucky insights are temporarily unavailable.
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {homeData.luckyInsights.luckyColor && (
                      <div className="bg-gradient-to-b from-white to-[#FAFAFA] rounded-[14px] border border-gray-100 p-3 flex flex-col min-h-[70px]">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Palette size={12} className="text-[#F4A300]" />
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Color</span>
                        </div>
                        <div className="text-[13px] font-extrabold text-gray-800 leading-tight flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full border border-gray-200/50 shadow-sm" style={{ backgroundColor: homeData.luckyInsights.luckyColor.value.toLowerCase().replace(' ', '') }}></span>
                          {homeData.luckyInsights.luckyColor.value}
                        </div>
                        {homeData.luckyInsights.luckyColor.confidence && (
                          <div className="text-[9px] text-gray-400 font-medium mt-1">
                            {homeData.luckyInsights.luckyColor.confidence === 'high' ? 'High confidence' : homeData.luckyInsights.luckyColor.confidence === 'medium' ? 'Moderate confidence' : 'Limited confidence'}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {homeData.luckyInsights.luckyNumber && (
                      <div className="bg-gradient-to-b from-white to-[#FAFAFA] rounded-[14px] border border-gray-100 p-3 flex flex-col min-h-[70px]">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Hash size={12} className="text-[#F4A300]" />
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Number</span>
                        </div>
                        <div className="text-[16px] font-extrabold text-[#F4A300] leading-tight">
                          {homeData.luckyInsights.luckyNumber.value}
                        </div>
                        {homeData.luckyInsights.luckyNumber.confidence && (
                          <div className="text-[9px] text-gray-400 font-medium mt-0.5">
                            {homeData.luckyInsights.luckyNumber.confidence === 'high' ? 'High confidence' : homeData.luckyInsights.luckyNumber.confidence === 'medium' ? 'Moderate confidence' : 'Limited confidence'}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {homeData.luckyInsights.luckyDirection && (
                      <div className="bg-gradient-to-b from-white to-[#FAFAFA] rounded-[14px] border border-gray-100 p-3 flex flex-col min-h-[70px]">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Compass size={12} className="text-[#F4A300]" />
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Direction</span>
                        </div>
                        <div className="text-[13px] font-extrabold text-gray-800 leading-tight">
                          {homeData.luckyInsights.luckyDirection.value}
                        </div>
                        {homeData.luckyInsights.luckyDirection.confidence && (
                          <div className="text-[9px] text-gray-400 font-medium mt-1">
                            {homeData.luckyInsights.luckyDirection.confidence === 'high' ? 'High confidence' : homeData.luckyInsights.luckyDirection.confidence === 'medium' ? 'Moderate confidence' : 'Limited confidence'}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {homeData.luckyInsights.bestActivity && (
                      <div className="bg-gradient-to-b from-white to-[#FAFAFA] rounded-[14px] border border-gray-100 p-3 flex flex-col min-h-[70px]">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Activity size={12} className="text-[#F4A300]" />
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Best For</span>
                        </div>
                        <div className="text-[12px] font-extrabold text-gray-800 leading-tight break-words">
                          {homeData.luckyInsights.bestActivity.value}
                        </div>
                        {homeData.luckyInsights.bestActivity.confidence && (
                          <div className="text-[9px] text-gray-400 font-medium mt-1">
                            {homeData.luckyInsights.bestActivity.confidence === 'high' ? 'High confidence' : homeData.luckyInsights.bestActivity.confidence === 'medium' ? 'Moderate confidence' : 'Limited confidence'}
                          </div>
                        )}
                      </div>
                    )}

                    {homeData.luckyInsights.bestTime && (
                      <div className="bg-gradient-to-b from-white to-[#FAFAFA] rounded-[14px] border border-gray-100 p-3 flex flex-col min-h-[70px] col-span-2 sm:col-span-1">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Clock size={12} className="text-[#16A34A]" />
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Best Time</span>
                        </div>
                        <div className="text-[12px] font-extrabold text-gray-800 leading-tight">
                          {new Date(homeData.luckyInsights.bestTime.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(homeData.luckyInsights.bestTime.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-[9px] text-gray-400 font-medium mt-1">
                          {homeData.luckyInsights.bestTime.label}
                        </div>
                      </div>
                    )}

                    {homeData.luckyInsights.cautionWindow && (
                      <div className="bg-gradient-to-b from-white to-[#FAFAFA] rounded-[14px] border border-gray-100 p-3 flex flex-col min-h-[70px] col-span-2 sm:col-span-1">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <ShieldAlert size={12} className="text-rose-500" />
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Caution Window</span>
                        </div>
                        <div className="text-[12px] font-extrabold text-gray-800 leading-tight">
                          {new Date(homeData.luckyInsights.cautionWindow.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(homeData.luckyInsights.cautionWindow.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-[9px] text-gray-400 font-medium mt-1">
                          {homeData.luckyInsights.cautionWindow.label}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>

          {/* Live Astrologers Status Row */}
          <motion.div
            variants={itemVariants}
            onClick={() => {
              const targetEl = document.getElementById('astrologer-section');
              if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            className="flex items-center justify-between px-4 py-3 bg-[#FFFFFF] rounded-[16px] border border-gray-100/80 shadow-[0_2px_12px_rgba(0,0,0,0.01)] cursor-pointer active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#16A34A]"></span>
              </span>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Connect with Experts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="bg-emerald-50/50 border border-emerald-100/30 px-2.5 py-0.5 rounded-full">
                <span className="text-[12px] font-extrabold text-[#16A34A] font-mono">
                  {onlineCount} Online
                </span>
              </div>
              <div className="flex items-center gap-0.5 text-gray-400 hover:text-gray-600 transition-colors">
                <span className="text-[10px] font-extrabold uppercase tracking-widest pl-1">View All</span>
                <ChevronRight size={12} className="text-gray-400 shrink-0" strokeWidth={2.5} />
              </div>
            </div>
          </motion.div>

        </motion.div>
      </div>

    </div>
  );
}

export const TopAstrologerCard: React.FC<{ astro: Astrologer, onClick: () => void, onChat: () => void }> = ({ astro, onClick, onChat }) => {
  const trustSignal = astro.consultations > 0 ? `${astro.consultations.toLocaleString('en-IN')} Consultations` : 'New on Kundli Nova';

  return (
    <motion.div
      whileHover={{ y: -3, shadow: "0_10px_30px_rgba(0,0,0,0.025)" }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-[#FFFFFF] rounded-[20px] border border-gray-100/80 shadow-[0_2px_16px_rgba(0,0,0,0.012)] p-[10px] flex items-stretch gap-[12px] relative transition-all duration-300 cursor-pointer"
    >
      {/* Left Portrait Block - nested with elevation & premium cropping */}
      <div className="relative shrink-0 w-[110px] h-[122px] rounded-[16px] overflow-hidden bg-gray-50 border border-gray-100/65 shadow-sm group">
        {astro.image ? <img
          src={astro.image}
          alt={astro.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-104"
          loading="lazy"
        /> : <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-3xl font-black text-neutral-400">{astro.name.charAt(0)}</div>}
      </div>

      {/* Right Details Section */}
      <div className="flex-1 flex flex-col justify-between py-[2px] pr-[2px]">
        {/* Title, Specialization & Online status */}
        <div className="space-y-[3px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-[5px]">
              <h4 className="font-[800] text-[#111827] text-[15.5px] leading-tight tracking-tight">{astro.name}</h4>
              <div className="flex items-center space-x-[2px] shrink-0">
                <Star size={10.5} className="fill-[#FBBF24] text-[#FBBF24] stroke-none" />
                <span className="text-[11px] font-[800] text-[#111827] leading-none">{astro.rating}</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] font-[600] text-[#6B7280] leading-none uppercase tracking-wider">
            {astro.skills.slice(0, 3).join(' • ')}
          </p>

          {/* Compact metrics on single horizontal line */}
          <p className="text-[11.5px] font-[500] text-[#4B5563] leading-none pt-[2px]">
            {astro.experience} Exp • {astro.languages.slice(0, 2).join(', ')}
          </p>
        </div>

        {/* Trust Signal Indicator */}
        <div className="flex items-center space-x-[4px] mt-[4px]">
          <ShieldCheck size={11.5} className="text-[#16A34A] stroke-[2.2]" />
          <span className="text-[10px] font-[750] tracking-wider text-[#16A34A] uppercase leading-none">{trustSignal}</span>
        </div>

        {/* Pricing and Action Button Row */}
        <div className="flex items-center justify-between mt-[6px] pt-[6px] border-t border-gray-100/80">
          <div className="flex flex-col justify-center">
            <span className="text-[15.5px] font-[900] text-[#16A34A] tracking-tight leading-none">
              ₹{astro.pricePerMinute}<span className="text-[10px] font-[600] text-[#9CA3AF] lowercase">/min</span>
            </span>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={(e) => {
              e.stopPropagation();
              onChat();
            }}
            className="bg-[#16A34A] text-white hover:bg-[#15803D] active:bg-[#16A34A] transition-all px-[20px] py-[6px] rounded-[10px] text-[12px] font-[800] tracking-[0.2px] shadow-[0_2px_8px_rgba(22,163,74,0.12)] flex items-center justify-center border-none"
          >
            Chat
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};
