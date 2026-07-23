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
  Star
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

export default function NovaAIScreen({ onNavigate, onOpenDrawer }: NovaAIScreenProps) {
  const { profile, defaultKundliProfile, isLoadingProfile } = useProfile();
  const { wallet } = useWallet();
  const repositories = useRepositories();
  const walletBalance = wallet.balance;
  const [userName, setUserName] = useState<string>('');
  const [inputVal, setInputVal] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedConversation[]>([]);
  
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
    <div className="flex-1 relative overflow-hidden bg-[#FAFAFA] flex flex-col h-full select-none">
      {/* App Bar */}
      <div className="flex items-center justify-between px-[20px] py-[16px] bg-[#FFFFFF]/90 backdrop-blur-md sticky top-0 z-30 border-b border-gray-100/60 shadow-[0_2px_12px_rgba(0,0,0,0.015)] min-h-[70px] shrink-0">
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => onOpenDrawer?.()} 
          className="p-[8px] -ml-[8px] rounded-full text-[#111827] hover:bg-gray-50 active:bg-gray-100 transition-colors focus:outline-none"
        >
          <Menu size={22} strokeWidth={2.5} />
        </motion.button>
        
        <div className="flex items-center space-x-1">
          <span className="text-[17px] font-[800] text-[#111827] tracking-tight">Nova AI</span>
          <Sparkles size={14} className="text-[#FF8A00] fill-[#FF8A00] animate-pulse" />
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => onNavigate('wallet')}
            className="flex items-center space-x-1.5 border border-gray-200 rounded-full pl-3 pr-1 py-1 hover:bg-gray-50 transition-colors focus:outline-none"
          >
            <span className="text-[13px] font-semibold text-[#111827]">₹{walletBalance}</span>
            <div className="w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center">
              <Plus size={14} strokeWidth={3} />
            </div>
          </button>
          
          <button 
            onClick={() => onNavigate('chat-history')}
            className="text-gray-500 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-gray-50 focus:outline-none"
          >
            <Bell size={21} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* Profile Required State */}
      {!isLoadingProfile && !profileId ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#FAFAFA] text-center">
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
        <div className="flex-1 overflow-y-auto no-scrollbar pb-[100px]">
        
        {/* Hero Area */}
        <div className="relative overflow-hidden bg-[#FDFCF7] border-b border-[#F5F2EB] px-[20px] py-[30px] flex items-center justify-between">
          {/* Subtle grid lines (1.5% opacity) */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.015] text-neutral-800">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1="20" y1="0" x2="20" y2="100" stroke="currentColor" strokeWidth="0.2" />
              <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeWidth="0.2" />
              <line x1="80" y1="0" x2="80" y2="100" stroke="currentColor" strokeWidth="0.2" />
              <line x1="0" y1="35" x2="100" y2="35" stroke="currentColor" strokeWidth="0.2" />
              <line x1="0" y1="65" x2="100" y2="65" stroke="currentColor" strokeWidth="0.2" />
            </svg>
          </div>

          {/* Left side text with mathematically balanced spacing */}
          <div className="flex-1 pr-4 z-10">
            <span className="text-[12.5px] font-[600] text-neutral-400 tracking-tight block mb-1">
              {getGreeting()}, {userName}
            </span>
            <span className="text-[11.5px] font-[500] text-neutral-400 tracking-tight block mb-3.5 leading-normal">
              Your personal AI Astrologer is ready to guide you.
            </span>
            <h2 className="text-[25px] font-[800] text-neutral-900 tracking-tight leading-[1.22]">
              How can I<br />guide you today?
            </h2>
          </div>

          {/* Right side locked image asset with natural placement and no heavy glow */}
          <div className="w-[110px] h-[110px] sm:w-[125px] sm:h-[125px] shrink-0 relative z-10 flex items-center justify-center">
            {/* Elegant Astrological Kundli / Zodiac Chakra behind the crystal ball */}
            <div className="absolute inset-[-45px] sm:inset-[-60px] pointer-events-none opacity-[0.055] text-neutral-900 z-0 flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Concentric rings representing planetary spheres */}
                <circle cx="100" cy="100" r="98" stroke="currentColor" strokeWidth="0.65" />
                <circle cx="100" cy="100" r="93" stroke="currentColor" strokeWidth="0.35" strokeDasharray="1 3" />
                <circle cx="100" cy="100" r="85" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 2" />
                <circle cx="100" cy="100" r="76" stroke="currentColor" strokeWidth="0.6" />
                <circle cx="100" cy="100" r="62" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 2" />
                <circle cx="100" cy="100" r="48" stroke="currentColor" strokeWidth="0.55" />
                <circle cx="100" cy="100" r="32" stroke="currentColor" strokeWidth="0.4" />
                <circle cx="100" cy="100" r="16" stroke="currentColor" strokeWidth="0.5" />

                {/* 12 Astrological House Division Spokes (every 30 degrees) */}
                {/* 0 & 180 deg */}
                <line x1="2" y1="100" x2="198" y2="100" stroke="currentColor" strokeWidth="0.45" />
                {/* 90 & 270 deg */}
                <line x1="100" y1="2" x2="100" y2="198" stroke="currentColor" strokeWidth="0.45" />
                {/* 30 & 210 deg */}
                <line x1="15.13" y1="51" x2="184.87" y2="149" stroke="currentColor" strokeWidth="0.45" />
                {/* 150 & 330 deg */}
                <line x1="15.13" y1="149" x2="184.87" y2="51" stroke="currentColor" strokeWidth="0.45" />
                {/* 60 & 240 deg */}
                <line x1="51" y1="15.13" x2="149" y2="184.87" stroke="currentColor" strokeWidth="0.45" />
                {/* 120 & 300 deg */}
                <line x1="51" y1="184.87" x2="149" y2="15.13" stroke="currentColor" strokeWidth="0.45" />

                {/* Vedic Yantra / Sacred Geometry Squares rotated */}
                <polygon points="100,24 176,100 100,176 24,100" stroke="currentColor" strokeWidth="0.4" />
                <polygon points="100,38 162,100 100,162 38,100" stroke="currentColor" strokeWidth="0.35" strokeDasharray="3 1" />
                
                {/* Outer starburst sparks and constellation indicators */}
                <path d="M100 2v4M100 194v4M2 100h4M194 100h4" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
                <circle cx="100" cy="10" r="1.5" fill="currentColor" />
                <circle cx="100" cy="190" r="1.5" fill="currentColor" />
                <circle cx="10" cy="100" r="1.5" fill="currentColor" />
                <circle cx="190" cy="100" r="1.5" fill="currentColor" />
              </svg>
            </div>
            
            <img 
              src="https://i.ibb.co/W4GLkJFm/image-removebg-preview-5.png" 
              alt="Celestial Crystal" 
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain relative z-10"
            />
          </div>
        </div>

        {/* Small Helper Line below the Hero Area */}
        <div className="px-[20px] pt-[14px] pb-[4px] bg-white">
          <p className="text-[11.5px] text-neutral-400/90 font-semibold tracking-tight">
            Choose a topic below or ask your own question.
          </p>
        </div>

        {/* Premium Large Input Container (AI Composer) */}
        <div className="px-[20px] pb-[18px] bg-white border-b border-gray-100/80">
          <div className="relative bg-white border border-neutral-200/90 focus-within:border-[#FF8A00] focus-within:ring-1 focus-within:ring-[#FF8A00]/10 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.012)] transition-all duration-300 p-[15px] flex items-start space-x-3.5">
            <div className="mt-1 shrink-0 text-neutral-400">
              <Sparkle size={18} strokeWidth={2.2} className="text-[#FF8A00]/70" />
            </div>
            
            <textarea
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ask anything about your career, love, marriage, business or future..."
              rows={2}
              className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-[13.5px] font-medium text-neutral-800 placeholder:text-neutral-400/80 resize-none pr-10 leading-relaxed py-0.5"
            />
            
            <button 
              onClick={handleComposeSend}
              disabled={!inputVal.trim()}
              className={`absolute right-3.5 bottom-3.5 p-2.5 rounded-xl transition-all duration-300 ${
                inputVal.trim() 
                  ? 'bg-[#FF8A00] text-white shadow-[0_4px_12px_rgba(255,138,0,0.22)] active:scale-95' 
                  : 'bg-neutral-50 text-neutral-400 cursor-not-allowed'
              }`}
            >
              <ArrowUp size={16} strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* Horizontal scrollable quick-topic chips */}
        <div className="bg-white px-4 py-3.5 border-b border-gray-100 flex items-center space-x-2.5 overflow-x-auto no-scrollbar">
          {topics.map((topic) => {
            const isSelected = selectedTopic === topic.id;
            return (
              <button
                key={topic.id}
                onClick={() => handleTopicSelect(topic.id, topic.prompt)}
                className={`flex items-center space-x-1.5 px-3.5 py-2 border rounded-full shrink-0 transition-all text-xs font-semibold ${
                  isSelected 
                    ? 'border-[#FF8A00] bg-[#FFF9E6] text-[#FF8A00]' 
                    : 'border-neutral-200/85 bg-white text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <span className={isSelected ? 'text-[#FF8A00]' : 'text-neutral-500'}>
                  {topic.icon}
                </span>
                <span>{topic.label}</span>
              </button>
            );
          })}
        </div>

        {/* AI Services Section (With Featured Card at Top & 2-Column Grid Below) */}
        <div className="px-[20px] pt-6 pb-2">
          <div className="mb-4">
            <h3 className="text-[15px] font-[800] text-neutral-900 tracking-tight">AI Services</h3>
          </div>

          {/* Featured Service: AI Kundli Reading */}
          <motion.div
            whileTap={{ scale: 0.99 }}
            onClick={() => handleServiceSelect('AI Kundli Reading')}
            className="mb-4 bg-white border border-[#FF8A00]/25 rounded-2xl p-5 shadow-[0_4px_16px_rgba(255,138,0,0.02)] hover:border-[#FF8A00]/45 cursor-pointer transition-all relative overflow-hidden flex items-center justify-between"
          >
            <div className="flex items-start space-x-4">
              <div className="bg-[#FFF9E6] p-3.5 rounded-2xl border border-[#FF8A00]/15 shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[30px] h-[30px] text-[#FF8A00]">
                  <circle cx="12" cy="10" r="7" />
                  <path d="M5 19h14M8 19l2-4h4l2 4" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex flex-col items-start mb-1">
                  <h4 className="text-[15px] font-[850] text-neutral-900 tracking-tight leading-tight">
                    AI Kundli Reading
                  </h4>
                  <span className="bg-[#FFF9E6] text-[#FF8A00] text-[9.5px] font-[800] px-2 py-0.5 rounded-full tracking-wide mt-1 inline-block">
                    Most Popular
                  </span>
                </div>
                <p className="text-[11.5px] text-neutral-500 font-medium leading-relaxed mt-1">
                  Receive complete AI guidance using your birth details and planetary positions.
                </p>
              </div>
            </div>
            
            <div className="text-neutral-400 shrink-0 ml-3">
              <ChevronRight size={18} strokeWidth={2.5} />
            </div>
          </motion.div>

          {/* Remaining 5 services in a perfectly balanced 2-column grid */}
          <div className="grid grid-cols-2 gap-3.5">
            {[
              { 
                id: 'love-guidance', 
                title: 'Love Guidance', 
                desc: 'Understand relationship patterns and emotional compatibility.',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[28px] h-[28px] text-[#FF8A00]">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                  </svg>
                )
              },
              { 
                id: 'career-prediction', 
                title: 'Career Prediction', 
                desc: 'Explore career direction, opportunities and timing.',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[28px] h-[28px] text-[#FF8A00]">
                    <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    <rect width="20" height="14" x="2" y="6" rx="2" />
                  </svg>
                )
              },
              { 
                id: 'wealth-insights', 
                title: 'Wealth Insights', 
                desc: 'Understand financial patterns and growth periods.',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[28px] h-[28px] text-[#FF8A00]">
                    <path d="M6 3h12M6 8h12M6 13h8.5a4.5 4.5 0 0 1 0 9M6 13l7.5 8" />
                  </svg>
                )
              },
              { 
                id: 'numerology', 
                title: 'Numerology', 
                desc: 'Decode your numbers, Moolank and Bhagyank.',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[28px] h-[28px] text-[#FF8A00]">
                    <circle cx="12" cy="9" r="4" />
                    <path d="M16 9v6a4 4 0 0 1-4 4" />
                  </svg>
                )
              },
              { 
                id: 'daily-remedies', 
                title: 'Daily Remedies', 
                desc: 'Receive simple personalized daily remedies.',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[28px] h-[28px] text-[#FF8A00]">
                    <path d="M2 12c3-5.5 7-9 10-9s7 3.5 10 9c-3 5.5-7 9-10 9s-7-3.5-10-9z" />
                    <circle cx="12" cy="12" r="5" />
                    <circle cx="12" cy="12" r="2.5" fill="currentColor" />
                  </svg>
                )
              }
            ].map((service) => (
              <motion.div
                key={service.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleServiceSelect(service.title)}
                className="bg-white border border-neutral-100/90 rounded-2xl p-4.5 flex flex-col justify-between shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:border-neutral-200/80 cursor-pointer min-h-[152px] transition-all"
              >
                <div className="mb-3.5 bg-neutral-50 w-12 h-12 rounded-xl flex items-center justify-center border border-neutral-100/50 shrink-0">
                  {service.icon}
                </div>
                <div>
                  <h4 className="text-[12.5px] font-[800] text-neutral-900 tracking-tight mb-1 leading-snug">
                    {service.title}
                  </h4>
                  <p className="text-[10.5px] text-neutral-500 leading-normal font-medium">
                    {service.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Today's AI Guidance Card (With small celestial accent vector inside) */}
        <div className="px-[20px] py-3">
          <div className="bg-[#FCFBF7] border border-[#F0EDE6] rounded-2xl p-5 flex items-start space-x-4 shadow-[0_2px_12px_rgba(0,0,0,0.01)] relative overflow-hidden">
            {/* Subtle celestial accent illustration (opacity 4%) */}
            <div className="absolute right-0 bottom-0 top-0 w-24 opacity-[0.04] text-[#FF8A00] pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <polygon points="50,15 63,38 90,38 68,54 77,80 50,62 23,80 32,54 10,38 37,38" fill="currentColor" />
              </svg>
            </div>

            <div className="bg-white border border-neutral-200/50 p-2.5 rounded-xl shrink-0 z-10">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[#FF8A00]">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            
            <div className="flex-1 z-10">
              <h4 className="text-[13px] font-[800] text-neutral-900 tracking-tight mb-1">
                Today's AI Guidance
              </h4>
              <p className="text-[11.5px] text-neutral-600 font-medium leading-relaxed mb-3 max-w-[90%]">
                Aaj ki planetary energy career decisions ke liye supportive hai. Apne focus ko stable rakhein aur dhyan se aage badhein.
              </p>
              <button 
                onClick={handleReadMoreGuidance}
                className="text-[11.5px] font-[700] text-[#FF8A00] flex items-center space-x-1 hover:underline focus:outline-none"
              >
                <span>Read Guidance</span>
                <ChevronRight size={12} strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>

        {/* Continue Conversation Section (Compact, hide empty state box by 40% height) */}
        <div className="px-[20px] py-3.5">
          <h3 className="text-[15px] font-[800] text-neutral-900 tracking-tight mb-3">Continue Conversation</h3>
          
          {history.length > 0 ? (
            <div className="flex flex-col space-y-2.5">
              {history.map((conv) => (
                <div 
                  key={conv.id}
                  className="bg-white border border-neutral-100 rounded-xl p-3 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.005)]"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-neutral-50 border border-neutral-200/60 flex items-center justify-center shrink-0">
                      {getCategoryIcon(conv.topic)}
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className="text-[12.5px] font-[700] text-neutral-900 truncate tracking-tight">
                          {conv.topic}
                        </h4>
                        <span className="text-[10px] text-neutral-400 font-medium">
                          {conv.timestamp}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 truncate leading-tight font-medium">
                        {conv.lastMessage}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => !isLoadingProfile && profileId && onNavigate('nova-ai-chat', { conversationId: conv.id, profileId })}
                    className="px-3 py-1.5 bg-[#FFF9E6] hover:bg-[#FFF2CC] text-[#FF8A00] rounded-lg text-[11px] font-[700] transition-colors shrink-0 flex items-center space-x-0.5 focus:outline-none"
                  >
                    <span>Continue</span>
                    <ArrowRight size={11} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-neutral-100/90 rounded-2xl py-5 px-4 flex flex-col items-center justify-center text-center shadow-[0_2px_12px_rgba(0,0,0,0.005)] min-h-[140px]">
              {/* Clean abstract illustration, smaller and more compact box */}
              <div className="w-10 h-10 rounded-full bg-[#FFF9E6] flex items-center justify-center mb-2 text-[#FF8A00] border border-[#FF8A00]/10">
                <MessageSquare size={16} strokeWidth={2.2} />
              </div>
              <h4 className="text-[13px] font-[800] text-neutral-800 mb-0.5">
                Start your first AI conversation.
              </h4>
              <p className="text-[11px] text-neutral-400 font-medium max-w-xs mb-3">
                Select a topic above or tap below to start.
              </p>
              <button
                onClick={handleStartConversation}
                className="bg-[#FF8A00] text-white text-[11.5px] font-[700] px-4 py-2 rounded-xl shadow-[0_4px_12px_rgba(255,138,0,0.18)] hover:bg-[#E07A00] transition-all active:scale-95 focus:outline-none"
              >
                Start Conversation
              </button>
            </div>
          )}
        </div>

        {/* Today's Focus Dashboard Section */}
        <div className="px-[20px] py-3.5">
          <div className="bg-[#FCFBF7] border border-[#EBE8DF] rounded-2xl p-5 relative overflow-hidden">
            {/* Elegant minimal line vector in 3% opacity */}
            <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-[0.05] pointer-events-none text-[#FF8A00]">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <circle cx="100" cy="50" r="40" stroke="currentColor" strokeWidth="0.8" fill="none" />
                <circle cx="100" cy="50" r="25" stroke="currentColor" strokeWidth="0.8" fill="none" strokeDasharray="3 3" />
                <line x1="60" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="0.5" />
              </svg>
            </div>

            <div className="relative z-10">
              <div className="flex items-center space-x-1.5 mb-3">
                <span className="w-2 h-2 rounded-full bg-[#FF8A00] animate-pulse" />
                <h4 className="text-[14px] font-[850] text-neutral-900 tracking-tight">
                  Today's Focus
                </h4>
              </div>

              {/* Three Compact Insight Rows */}
              <div className="space-y-2 mb-4 max-w-[75%]">
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] text-neutral-500 font-semibold">Career</span>
                  <StarRating count={4} />
                </div>
                <div className="flex items-center justify-between border-t border-dashed border-neutral-200/60 pt-2">
                  <span className="text-[11.5px] text-neutral-500 font-semibold">Love</span>
                  <StarRating count={3} />
                </div>
                <div className="flex items-center justify-between border-t border-dashed border-neutral-200/60 pt-2">
                  <span className="text-[11.5px] text-neutral-500 font-semibold">Money</span>
                  <StarRating count={5} />
                </div>
              </div>

              <p className="text-[11px] text-neutral-400 font-semibold leading-relaxed mb-3 max-w-[85%]">
                Aaj communication aur career related decisions aapke liye zyada favourable rahenge.
              </p>

              <button 
                onClick={() => !isLoadingProfile && profileId && onNavigate('nova-ai-chat', { serviceContext: "Today's Focus", profileId })}
                className="bg-white border border-neutral-200 text-neutral-800 text-[11px] font-[700] px-3.5 py-1.5 rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:bg-neutral-50 transition-colors focus:outline-none"
              >
                View Full Guidance
              </button>
            </div>
          </div>
        </div>

      </div>
      )}
    </div>
  );
}
