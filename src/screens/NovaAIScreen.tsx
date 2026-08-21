import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, 
  Plus, 
  Bell, 
  Sparkles, 
  Briefcase, 
  Heart, 
  TrendingUp, 
  Activity, 
  BookOpen, 
  Shield, 
  Hash, 
  Compass, 
  ChevronRight,
  ArrowRight,
  ArrowUp,
  MessageSquare,
  Sparkle,
  Star,
  Crown
} from 'lucide-react';
import { Screen } from '../types';
import { useProfile } from '../contexts/ProfileContext';
import { useWallet } from '../contexts/WalletContext';
import { useRepositories } from '../repositories/repositoryProvider';

interface NovaAIScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
  onOpenDrawer?: () => void;
}

interface SavedConversation {
  id: string;
  topic: string;
  lastMessage: string;
  timestamp: string;
}

const ASTRO_QUOTES = [
  "Your personal AI Astrologer is ready to guide you.",
  "The stars align to illuminate your path today.",
  "Discover what planetary transits reveal for you.",
  "Unlock deep cosmic guidance tailored to your chart.",
  "The universe holds answers to your life questions.",
  "Harmonize your journey with celestial wisdom."
];

export default function NovaAIScreen({ onNavigate, onOpenDrawer }: NovaAIScreenProps) {
  const { profile, defaultKundliProfile, isLoadingProfile } = useProfile();
  const { wallet } = useWallet();
  const repositories = useRepositories();
  const walletBalance = wallet.balance;
  const [userName, setUserName] = useState<string>('');
  const [inputVal, setInputVal] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedConversation[]>([]);
  const [quoteIndex, setQuoteIndex] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % ASTRO_QUOTES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);
  
  const profileId = defaultKundliProfile?.id;

  // Load wallet balance & user profile
  useEffect(() => {
    const loadProfile = () => {
      // profile is accessed from useProfile
      if (profile && profile.name) {
        const firstName = profile.name.trim().split(' ')[0];
        setUserName(firstName);
      }
    };

    const loadHistory = () => {
      const savedHistory = localStorage.getItem('kundli_nova_ai_history');
      if (savedHistory) {
        try {
          setHistory(JSON.parse(savedHistory));
        } catch (e) {}
      }
    };

    loadProfile();
    loadHistory();

  }, [profile]);



  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // horizontal scrollable quick-topic chips
  const topics = [
    { id: 'career', label: 'Career', icon: <Briefcase size={14} strokeWidth={2.2} />, prompt: "Mera career growth kab shuru hoga aur kaunsa sector best rahega?" },
    { id: 'love', label: 'Love', icon: <Heart size={14} strokeWidth={2.2} />, prompt: "Meri love life mein compatibility aur stability kab tak aayegi?" },
    { 
      id: 'marriage', 
      label: 'Marriage', 
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px]">
          <circle cx="8" cy="12" r="4" />
          <circle cx="16" cy="12" r="4" />
        </svg>
      ), 
      prompt: "Kundli ke hisaab se meri marriage ke yog kab ban rahe hain?" 
    },
    { 
      id: 'money', 
      label: 'Money', 
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px]">
          <path d="M6 3h12M6 8h12M6 13h8.5a4.5 4.5 0 0 1 0 9M6 13l7.5 8" />
        </svg>
      ), 
      prompt: "Financial stability aur wealth accumulation ke liye kaunsa samay shubh hai?" 
    },
    { id: 'business', label: 'Business', icon: <TrendingUp size={14} strokeWidth={2.2} />, prompt: "Kya mujhe naya business start karna chahiye ya job mein hi rehna sahi hai?" },
    { id: 'health', label: 'Health', icon: <Activity size={14} strokeWidth={2.2} />, prompt: "Aane wale samay mein meri health aur wellness ki sthiti kaisi rahegi?" },
    { id: 'education', label: 'Education', icon: <BookOpen size={14} strokeWidth={2.2} />, prompt: "Higher studies ya competitive exams ke liye planetary positions kitni supportive hain?" },
    { id: 'remedies', label: 'Remedies', icon: <Shield size={14} strokeWidth={2.2} />, prompt: "Apne mental peace aur career hurdles door karne ke liye saral dainik remedies batayein." },
    { id: 'numerology', label: 'Numerology', icon: <Hash size={14} strokeWidth={2.2} />, prompt: "Mera Moolank aur Bhagyank kya hai aur ye mere jeevan ko kaise prabhavit karte hain?" },
    { id: 'kundli', label: 'Kundli', icon: <Compass size={14} strokeWidth={2.2} />, prompt: "Kripya meri birth details ke anusar ek sankshipt Kundli analysis karein." }
  ];

  const handleTopicSelect = (topicId: string, prompt: string) => {
    setSelectedTopic(topicId);
    setInputVal(prompt);
  };

  const handleComposeSend = () => {
    if (isLoadingProfile || !profileId) return;
    if (!inputVal.trim()) return;

    // Save this interaction to history
    const newSession: SavedConversation = {
      id: `ai-session-${Date.now()}`,
      topic: selectedTopic ? topics.find(t => t.id === selectedTopic)?.label || 'General Guidance' : 'General Guidance',
      lastMessage: inputVal.trim(),
      timestamp: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    };

    const updatedHistory = [newSession, ...history.slice(0, 2)];
    setHistory(updatedHistory);
    localStorage.setItem('kundli_nova_ai_history', JSON.stringify(updatedHistory));

    // Navigate to Chat with initialQuery context + canonical profileId
    onNavigate('nova-ai-chat', { initialQuery: inputVal.trim(), profileId });
  };

  const handleStartConversation = () => {
    if (isLoadingProfile || !profileId) return;
    onNavigate('nova-ai-chat', { profileId });
  };

  const handleServiceSelect = (serviceTitle: string) => {
    if (isLoadingProfile || !profileId) return;
    onNavigate('nova-ai-chat', { serviceContext: serviceTitle, profileId });
  };

  const getCategoryIcon = (categoryName: string) => {
    const strokeWidth = 2.2;
    switch (categoryName.toLowerCase()) {
      case 'career':
      case 'career guidance':
      case 'career prediction':
        return <Briefcase size={15} strokeWidth={strokeWidth} className="text-gray-500" />;
      case 'love':
      case 'love guidance':
      case 'love reading':
        return <Heart size={15} strokeWidth={strokeWidth} className="text-gray-500" />;
      case 'marriage':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px] text-gray-500">
            <circle cx="8" cy="12" r="4" />
            <circle cx="16" cy="12" r="4" />
          </svg>
        );
      case 'money':
      case 'wealth insights':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px] text-gray-500">
            <path d="M6 3h12M6 8h12M6 13h8.5a4.5 4.5 0 0 1 0 9M6 13l7.5 8" />
          </svg>
        );
      case 'business':
        return <TrendingUp size={15} strokeWidth={strokeWidth} className="text-gray-500" />;
      case 'health':
        return <Activity size={15} strokeWidth={strokeWidth} className="text-gray-500" />;
      case 'remedies':
      case 'daily remedies':
        return <Shield size={15} strokeWidth={strokeWidth} className="text-gray-500" />;
      case 'numerology':
        return <Hash size={15} strokeWidth={strokeWidth} className="text-gray-500" />;
      default:
        return <Compass size={15} strokeWidth={strokeWidth} className="text-gray-500" />;
    }
  };

  const handleReadMoreGuidance = () => {
    if (isLoadingProfile || !profileId) return;
    onNavigate('nova-ai-chat', { serviceContext: 'Daily Guidance', profileId });
  };

  function StarRating({ count }: { count: number }) {
    return (
      <div className="flex space-x-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star} 
            size={11} 
            className={star <= count ? "text-[#FF8A00] fill-[#FF8A00]" : "text-neutral-200 fill-transparent"} 
            strokeWidth={2}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1 relative overflow-hidden bg-white flex flex-col h-full select-none">
      {/* App Bar */}
      <div className="flex items-center justify-between px-[20px] py-[16px] bg-white sticky top-0 z-30 min-h-[70px] shrink-0">
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => onOpenDrawer?.()} 
          className="p-[8px] -ml-[8px] rounded-full text-[#111827] hover:bg-gray-50 active:bg-gray-100 transition-colors focus:outline-none"
        >
          <Menu size={24} strokeWidth={2.5} />
        </motion.button>
        
        <div className="flex items-center space-x-1">
          <span className="text-[16px] sm:text-[18px] font-[800] text-[#111827] tracking-tight">Nova AI</span>
          <Sparkles size={14} className="text-[#FF8A00] fill-[#FF8A00]" />
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => onNavigate('wallet')}
            className="flex items-center space-x-1.5 bg-neutral-50 border border-neutral-100 rounded-full pl-3 pr-1 py-1 hover:bg-neutral-100 transition-colors focus:outline-none"
          >
            <span className="text-[13px] font-semibold text-[#111827]">₹{walletBalance}</span>
            <div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center">
              <Plus size={14} strokeWidth={3} />
            </div>
          </button>
          
          <button 
            onClick={() => onNavigate('subscription')}
            className="flex items-center space-x-1 text-[#FF8A00] font-bold text-[13px] focus:outline-none"
          >
            <Crown size={18} strokeWidth={2.2} />
            <span>Premium</span>
          </button>
          
          <button 
            onClick={() => onNavigate('chat-history')}
            className="text-gray-500 hover:text-gray-900 transition-colors p-1 rounded-full relative focus:outline-none"
          >
            <Bell size={22} strokeWidth={2.2} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
        </div>
      </div>

      {/* Profile Required State */}
      {!isLoadingProfile && !profileId ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white text-center">
          <div className="w-16 h-16 rounded-full bg-[#FFF9E6] flex items-center justify-center mb-4 text-[#FF8A00] border border-[#FF8A00]/10">
            <Shield size={32} strokeWidth={2.2} />
          </div>
          <h2 className="text-xl font-bold text-neutral-800 mb-2">Profile Required</h2>
          <p className="text-sm text-neutral-500 mb-6 max-w-[280px]">No Kundli profile selected. Please create or select a profile to use Nova AI.</p>
          <button 
            onClick={() => onNavigate('kundli-profile-form')}
            className="bg-[#FF8A00] text-white text-[13px] font-[800] px-6 py-3 rounded-xl shadow-[0_4px_12px_rgba(255,138,0,0.18)] hover:bg-[#E07A00] transition-all active:scale-95 focus:outline-none"
          >
            Create Profile
          </button>
        </div>
      ) : (
        /* Scrollable Container */
        <div className="flex-1 overflow-y-auto no-scrollbar pb-[120px] bg-white">
        
        {/* Hero Area */}
        <div className="relative overflow-hidden bg-white px-[20px] pt-[20px] pb-[10px] flex min-h-[280px]">
          {/* Subtle astrology wheel background */}
          <div className="absolute top-[-20%] right-[-10%] w-[120%] h-[120%] pointer-events-none opacity-[0.05] text-[#FF8A00] flex items-center justify-center z-0">
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full object-cover">
              <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="0.5" />
              <circle cx="100" cy="100" r="70" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 4" />
              <circle cx="100" cy="100" r="50" stroke="currentColor" strokeWidth="0.5" />
              <line x1="10" y1="100" x2="190" y2="100" stroke="currentColor" strokeWidth="0.3" />
              <line x1="100" y1="10" x2="100" y2="190" stroke="currentColor" strokeWidth="0.3" />
              <line x1="36" y1="36" x2="164" y2="164" stroke="currentColor" strokeWidth="0.3" />
              <line x1="36" y1="164" x2="164" y2="36" stroke="currentColor" strokeWidth="0.3" />
            </svg>
          </div>

          {/* Extremely subtle warm radial glow behind character */}
          <div className="absolute bottom-0 right-0 w-[60%] h-[100%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#FF8A00]/[0.07] via-[#FF8A00]/[0.01] to-transparent pointer-events-none z-0" />

          {/* Left side text (~48%) */}
          <div className="w-[48%] relative z-10 pt-[5px] pb-[35px] flex flex-col justify-center">
            <span className="text-[13px] font-[700] text-[#FF8A00] tracking-tight block mb-1">
              Good Evening, {userName || 'User'}
            </span>
            <div className="h-[38px] mb-3 flex items-center overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.span
                  key={quoteIndex}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="text-[12px] font-[500] text-neutral-600 tracking-tight block leading-relaxed pr-1"
                >
                  {ASTRO_QUOTES[quoteIndex]}
                </motion.span>
              </AnimatePresence>
            </div>
            
            <div className="flex items-center space-x-2 mb-4 pr-4">
              <div className="w-8 h-[1.5px] bg-[#FF8A00]/40 rounded-full" />
              <Sparkle size={12} className="text-[#FF8A00]/60 shrink-0" />
              <div className="flex-1 h-[1.5px] bg-gradient-to-r from-[#FF8A00]/40 via-[#FF8A00]/15 to-transparent rounded-full" />
            </div>

            <h2 className="text-[22px] sm:text-[26px] font-[800] text-neutral-900 tracking-tight leading-[1.15]">
              How can I<br />
              <span className="text-[#FF8A00]">guide</span><br />
              you today?
            </h2>
          </div>

          {/* Right side character (~52%) */}
          <div className="absolute bottom-0 right-0 w-[55%] sm:w-[52%] h-full z-10 pointer-events-none select-none overflow-visible"
               style={{ WebkitUserSelect: 'none', WebkitUserDrag: 'none' }}>
            <img 
              src="/nova-ai-astrologer.webp" 
              alt="AI Astrologer" 
              draggable={false}
              className="absolute w-auto max-w-none pointer-events-none select-none origin-bottom-right"
              style={{ 
                height: '106%', 
                bottom: '-2%', 
                right: '8.5%',
                WebkitUserSelect: 'none', 
                WebkitUserDrag: 'none' 
              }}
            />
          </div>
        </div>

        {/* Primary Ask Nova AI Box */}
        <div className="px-[16px] sm:px-[20px] mt-[-15px] sm:mt-[-25px] relative z-20 max-w-[420px] w-full mx-auto">
          <motion.div 
            animate={{ 
              scale: isFocused ? 1.015 : 1,
              boxShadow: isFocused 
                ? '0 12px 36px rgba(255, 138, 0, 0.22), 0 0 0 3.5px rgba(255, 138, 0, 0.18)' 
                : '0 8px 24px rgba(255, 138, 0, 0.06)'
            }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className={`bg-white rounded-[20px] p-[8px] flex items-center relative overflow-hidden transition-colors duration-300 border ${
              isFocused ? 'border-[#FF8A00]' : 'border-[#FF8A00]/30'
            }`}
          >
            {/* Animated Cosmic Shimmer Light Beam on Focus */}
            <AnimatePresence>
              {isFocused && (
                <motion.div
                  initial={{ opacity: 0, x: '-100%' }}
                  animate={{ opacity: 1, x: '100%' }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FF8A00]/15 to-transparent pointer-events-none z-0"
                />
              )}
            </AnimatePresence>

            {/* Sparkle Icon with Rotation & Glow */}
            <div className="shrink-0 px-3 z-10 relative">
              <motion.div
                animate={{ 
                  rotate: isFocused ? [0, 15, -15, 0] : 0,
                  scale: isFocused ? 1.2 : 1
                }}
                transition={{ duration: 0.6, repeat: isFocused ? Infinity : 0, repeatDelay: 2 }}
                className={isFocused ? 'text-[#FF8A00] drop-shadow-[0_0_8px_rgba(255,138,0,0.6)]' : 'text-[#FF8A00]'}
              >
                <Sparkle size={24} strokeWidth={1.8} />
              </motion.div>
            </div>
            
            <textarea
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Ask anything about your career, love, marriage, business or future..."
              rows={2}
              className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-[12px] sm:text-[13px] font-medium text-neutral-800 placeholder:text-neutral-400 resize-none py-2 pr-2 z-10"
            />
            
            <motion.button 
              whileTap={{ scale: 0.9 }}
              animate={{ scale: inputVal.trim() ? [1, 1.08, 1] : 1 }}
              transition={{ duration: 0.3 }}
              onClick={handleComposeSend}
              disabled={!inputVal.trim()}
              className={`p-3 rounded-full shrink-0 transition-all z-10 ${
                inputVal.trim() 
                  ? 'bg-[#FF8A00] text-white shadow-md active:scale-95 shadow-[#FF8A00]/30' 
                  : 'bg-neutral-100 text-neutral-400'
              }`}
            >
              <ArrowUp size={20} strokeWidth={2.5} />
            </motion.button>
          </motion.div>
        </div>

        {/* Topic Chips */}
        <div className="px-[20px] py-[24px] flex items-center space-x-3 overflow-x-auto no-scrollbar">
          {topics.slice(0, 5).map((topic) => (
            <button
              key={topic.id}
              onClick={() => handleTopicSelect(topic.id, topic.prompt)}
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-neutral-200 rounded-full shrink-0 shadow-sm"
            >
              <span className={topic.id === 'career' ? 'text-[#FF8A00]' : topic.id === 'love' ? 'text-red-500' : topic.id === 'marriage' ? 'text-purple-500' : topic.id === 'money' ? 'text-green-500' : 'text-neutral-500'}>
                {topic.icon}
              </span>
              <span className="text-[13px] font-[700] text-neutral-800">{topic.label}</span>
            </button>
          ))}
        </div>

        {/* AI Services */}
        <div className="px-[20px] pb-6">
          <div className="mb-4">
            <h3 className="text-[16px] font-[800] text-neutral-900">AI Services</h3>
          </div>

          {/* Featured Kundli */}
          <motion.div
            whileTap={{ scale: 0.99 }}
            onClick={() => handleServiceSelect('AI Kundli Reading')}
            className="mb-4 bg-[#FFFBF5] border border-[#FF8A00]/20 rounded-[20px] p-4 shadow-sm flex items-center justify-between relative overflow-hidden"
          >
            <div className="flex items-center space-x-3 z-10 flex-1">
              <div className="relative shrink-0">
                <div className="w-[46px] h-[46px] bg-gradient-to-br from-[#FF8A00] to-[#FF6B00] rounded-[14px] flex items-center justify-center text-white shadow-md shadow-[#FF8A00]/20">
                  <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] text-white" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2.5" y="2.5" width="19" height="19" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                    <polygon points="12,2.5 21.5,12 12,21.5 2.5,12" stroke="currentColor" strokeWidth="1.2" opacity="0.9" />
                    <line x1="2.5" y1="2.5" x2="21.5" y2="21.5" stroke="currentColor" strokeWidth="1.2" opacity="0.9" />
                    <line x1="21.5" y1="2.5" x2="2.5" y2="21.5" stroke="currentColor" strokeWidth="1.2" opacity="0.9" />
                    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                  </svg>
                  <div className="absolute -top-1 -right-1 text-[#FF8A00]">
                    <Sparkle size={14} className="fill-[#FF8A00] bg-white rounded-full p-0.5 shadow-sm" />
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <h4 className="text-[14px] sm:text-[15px] font-[800] text-neutral-900 leading-tight">AI Kundli Reading</h4>
                  <span className="bg-[#FF8A00]/10 text-[#FF8A00] text-[10px] font-[800] px-1.5 py-0.5 rounded-md">Most Popular</span>
                </div>
                <p className="text-[11px] sm:text-[12px] text-neutral-500 font-medium leading-tight pr-2">
                  Receive complete AI guidance using your birth details and planetary positions.
                </p>
              </div>
            </div>
            <div className="text-[#FF8A00] shrink-0 z-10">
              <ChevronRight size={20} strokeWidth={2.5} />
            </div>
          </motion.div>

          {/* Grid Services (Horizontal Scroll) */}
          <div className="flex space-x-4 overflow-x-auto no-scrollbar pb-2 pt-1">
            {[
              { id: 'love', title: 'Love Guidance', desc: 'Get clarity in love, relationships and compatibility.', icon: <Heart size={24} className="text-red-500" strokeWidth={1.5} />, borderColor: 'border-red-100', iconBg: 'bg-red-50' },
              { id: 'life', title: 'Life Prediction', desc: 'Discover what your future holds for you.', icon: <Activity size={24} className="text-blue-500" strokeWidth={1.5} />, borderColor: 'border-blue-100', iconBg: 'bg-blue-50' },
              { id: 'growth', title: 'Personal Growth', desc: 'Find inner peace and grow spiritually.', icon: <Shield size={24} className="text-green-500" strokeWidth={1.5} />, borderColor: 'border-green-100', iconBg: 'bg-green-50' }
            ].map(svc => (
              <motion.div
                key={svc.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleServiceSelect(svc.title)}
                className="w-[150px] shrink-0 bg-white border border-neutral-100 rounded-[20px] p-4 shadow-sm flex flex-col justify-between"
              >
                <div className={`w-12 h-12 rounded-[14px] ${svc.iconBg} flex items-center justify-center mb-3 ${svc.borderColor} border`}>
                  {svc.icon}
                </div>
                <div>
                  <h4 className="text-[13px] font-[800] text-neutral-900 mb-1">{svc.title}</h4>
                  <p className="text-[11px] text-neutral-500 font-medium leading-snug mb-3">{svc.desc}</p>
                </div>
                <div className="flex justify-end text-[#FF8A00]">
                  <ChevronRight size={16} strokeWidth={2.5} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Suggested Questions */}
        <div className="px-[20px] pb-6">
          <h3 className="text-[14px] font-[800] text-neutral-900 mb-3">You can also ask about</h3>
          <div className="flex space-x-3 overflow-x-auto no-scrollbar pb-2">
            {[
              { id: 'q1', text: 'Will I get a job this year?', icon: <Briefcase size={14} className="text-neutral-500" /> },
              { id: 'q2', text: 'Is marriage in my destiny?', icon: <Heart size={14} className="text-neutral-500" /> },
              { id: 'q3', text: 'Financial growth?', icon: <span className="font-bold text-neutral-500 text-[14px]">₹</span> }
            ].map(q => (
              <button
                key={q.id}
                onClick={() => handleTopicSelect('custom', q.text)}
                className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-neutral-200 rounded-xl shrink-0 text-[12px] font-[600] text-neutral-700 shadow-sm"
              >
                {q.icon}
                <span>{q.text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Preserved functionality (Continue Chat & Focus) kept at bottom for completeness */}
        <div className="px-[20px] pb-6">
          {history.length > 0 && (
            <>
              <h3 className="text-[14px] font-[800] text-neutral-900 mb-3">Recent Conversations</h3>
              <div className="flex flex-col space-y-2">
                {history.map((conv) => (
                  <div key={conv.id} className="bg-white border border-neutral-100 rounded-xl p-3 flex items-center justify-between shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-[12px] font-[700] text-neutral-900">{conv.topic}</span>
                      <span className="text-[11px] text-neutral-500 truncate max-w-[200px]">{conv.lastMessage}</span>
                    </div>
                    <button 
                      onClick={() => !isLoadingProfile && profileId && onNavigate('nova-ai-chat', { conversationId: conv.id, profileId })}
                      className="text-[#FF8A00] text-[11px] font-[700]"
                    >
                      Continue
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      </div>
      )}
    </div>
  );
}
