import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Sparkles, Compass, Shield, User, Calendar, Clock, MapPin, Eye, Info, ListFilter, AlertCircle } from 'lucide-react';
import { Screen } from '../types';
import { profileStorage } from '../services/storage/profileStorage';

interface ViewKundliScreenProps {
  onNavigate: (screen: Screen) => void;
}

interface ProfileData {
  name?: string;
  fullName?: string;
  dob?: string;
  tob?: string;
  birthTime?: string;
  country?: string;
  state?: string;
  district?: string;
  city?: string;
}

export default function ViewKundliScreen({ onNavigate }: ViewKundliScreenProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    const profile = profileStorage.getProfile();
    setProfile(profile);
  }, []);

  const fullName = profile?.fullName || profile?.name || 'Guest User';
  const dob = profile?.dob || 'Not Provided';
  const tob = profile?.tob || profile?.birthTime || 'Not Provided';
  
  // Format location nicely
  const getBirthPlace = () => {
    const parts = [profile?.city, profile?.district, profile?.state, profile?.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Not Provided';
  };
  const birthPlace = getBirthPlace();

  // Planets list
  const PLANETS = [
    { name: 'Sun', sanskrit: 'Surya' },
    { name: 'Moon', sanskrit: 'Chandra' },
    { name: 'Mars', sanskrit: 'Mangal' },
    { name: 'Mercury', sanskrit: 'Budha' },
    { name: 'Jupiter', sanskrit: 'Guru' },
    { name: 'Venus', sanskrit: 'Shukra' },
    { name: 'Saturn', sanskrit: 'Shani' },
    { name: 'Rahu', sanskrit: 'North Node' },
    { name: 'Ketu', sanskrit: 'South Node' }
  ];

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto no-scrollbar pb-24 select-none">
      
      {/* Header Bar */}
      <div className="px-6 py-4 sticky top-0 bg-white/95 backdrop-blur-md z-30 border-b border-neutral-100/50 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => onNavigate('profile')}
            className="p-1.5 -ml-1 rounded-full hover:bg-neutral-50 active:bg-neutral-100 transition-colors text-neutral-800"
          >
            <ArrowLeft size={22} strokeWidth={2.5} />
          </button>
          <h1 className="text-xl font-[800] text-neutral-900 tracking-tight">Your Kundli</h1>
        </div>
        <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center space-x-1">
          <Shield size={12} className="text-[#FF8A00]" />
          <span>Verified</span>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        
        {/* Title and Short Description */}
        <div>
          <span className="text-[#FF8A00] text-xs font-[800] tracking-wider uppercase block mb-1">Celestial Blueprint</span>
          <h2 className="text-2xl font-[900] text-neutral-900 tracking-tight leading-none">Your Janam Kundli</h2>
          <p className="text-neutral-500 text-[13.5px] font-medium leading-relaxed mt-2.5">
            Based on your unique birth coordinates, date, and exact time of birth. This chart maps the exact planetary alignments of the cosmos at your moment of birth.
          </p>
        </div>

        {/* 1. Kundli Summary Card */}
        <div className="bg-neutral-50/80 border border-neutral-100 rounded-[20px] p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-neutral-100/80 pb-3">
            <User size={16} className="text-[#FF8A00]" />
            <span className="text-[11.5px] font-[800] text-neutral-400 uppercase tracking-wider">Birth Details Summary</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-[800] text-neutral-400 uppercase tracking-wider block">Full Name</span>
              <span className="text-[14.5px] font-bold text-neutral-800">{fullName}</span>
            </div>
            
            <div className="space-y-1">
              <span className="text-[11px] font-[800] text-neutral-400 uppercase tracking-wider block">Date of Birth</span>
              <div className="flex items-center space-x-1.5 text-neutral-800">
                <Calendar size={14} className="text-neutral-400" />
                <span className="text-[14px] font-bold">{dob}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-[800] text-neutral-400 uppercase tracking-wider block">Time of Birth</span>
              <div className="flex items-center space-x-1.5 text-neutral-800">
                <Clock size={14} className="text-neutral-400" />
                <span className="text-[14px] font-bold">{tob}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-[800] text-neutral-400 uppercase tracking-wider block">Place of Birth</span>
              <div className="flex items-center space-x-1.5 text-neutral-800">
                <MapPin size={14} className="text-neutral-400" />
                <span className="text-[14px] font-bold truncate max-w-[220px]">{birthPlace}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Premium Kundli Chart Placeholder Card */}
        <div className="bg-neutral-50/40 border border-neutral-100 rounded-[22px] p-5 flex flex-col items-center relative overflow-hidden">
          <div className="w-full flex items-center justify-between border-b border-neutral-100 pb-3 mb-4">
            <div className="flex items-center space-x-2">
              <Sparkles size={16} className="text-[#FF8A00]" />
              <span className="text-[11.5px] font-[800] text-neutral-400 uppercase tracking-wider">Lagna Kundli (D1 Chart)</span>
            </div>
            <span className="text-[10px] font-[800] text-neutral-400 uppercase tracking-widest bg-neutral-100 px-2 py-0.5 rounded-full">
              Pristine
            </span>
          </div>

          {/* Elegant Sacred Geometry Vector Outline Backdrop */}
          <div className="w-full aspect-square max-w-[260px] bg-white rounded-[18px] border border-neutral-200/60 p-4 relative flex items-center justify-center shadow-[0_2px_12px_rgba(0,0,0,0.01)] opacity-70">
            <svg viewBox="0 0 200 200" className="w-full h-full text-neutral-300 stroke-current fill-none">
              <g strokeWidth="0.8">
                {/* Outer border */}
                <rect x="5" y="5" width="190" height="190" />
                
                {/* Main Diagonal cross lines */}
                <line x1="5" y1="5" x2="195" y2="195" />
                <line x1="195" y1="5" x2="5" y2="195" />
                
                {/* Diamond inner square */}
                <polygon points="100,5 195,100 100,195 5,100" />
              </g>
            </svg>
            <div className="absolute inset-0 bg-white/20 backdrop-blur-[0.5px]" />
          </div>

          {/* Professional Overlay Banner */}
          <div className="mt-4 text-center px-4 max-w-[280px]">
            <p className="text-[13.5px] text-neutral-800 font-bold leading-snug">
              Kundli chart will be generated after astrology engine integration.
            </p>
            <p className="text-[11px] text-neutral-400 font-medium mt-1.5 leading-relaxed">
              We preserve mathematical integrity. No random or generated mockup houses will be displayed to guarantee absolute chart accuracy.
            </p>
          </div>
        </div>

        {/* 3. Planetary Positions Section */}
        <div className="bg-neutral-50/50 border border-neutral-100/80 rounded-[20px] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center space-x-2">
              <Compass size={16} className="text-[#FF8A00]" />
              <span className="text-[11.5px] font-[800] text-neutral-400 uppercase tracking-wider">Planetary Positions</span>
            </div>
            <span className="text-[10px] font-bold text-neutral-400 uppercase bg-neutral-100 px-2.5 py-0.5 rounded-full">
              9 Grahas
            </span>
          </div>

          <div className="divide-y divide-neutral-100">
            {PLANETS.map((p, idx) => (
              <div key={p.name} className={`flex items-center justify-between py-3 ${idx === 0 ? 'pt-1' : ''} ${idx === PLANETS.length - 1 ? 'pb-1' : ''}`}>
                <div className="flex flex-col">
                  <span className="text-[14px] font-bold text-neutral-800">{p.name}</span>
                  <span className="text-[11px] text-neutral-400 font-semibold">{p.sanskrit}</span>
                </div>
                
                {/* Clean, subtle badge matching the prompt mandate */}
                <div className="flex items-center space-x-1.5 bg-neutral-100 text-neutral-400 border border-neutral-200/50 px-3 py-1 rounded-full text-[11px] font-bold tracking-tight">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 animate-pulse" />
                  <span>Waiting for calculation</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Dasha Section */}
        <div className="bg-neutral-50/50 border border-neutral-100/80 rounded-[20px] p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-neutral-100 pb-3">
            <Clock size={16} className="text-[#FF8A00]" />
            <span className="text-[11.5px] font-[800] text-neutral-400 uppercase tracking-wider">Vimshottari Dasha cycles</span>
          </div>
          
          <div className="py-2.5 text-center flex flex-col items-center justify-center">
            <div className="w-10 h-10 bg-[#FF8A00]/5 text-[#FF8A00] rounded-full flex items-center justify-center mb-3">
              <Info size={18} />
            </div>
            <p className="text-[13.5px] text-neutral-700 font-bold max-w-[280px] leading-snug">
              Dasha analysis will be available after Kundli generation.
            </p>
            <p className="text-[11px] text-neutral-400 font-medium mt-1 leading-relaxed max-w-[260px]">
              Vimshottari Mahadasha, Antardasha, and Pratyantardasha periods will automatically unlock.
            </p>
          </div>
        </div>

        {/* 5. Yog Section */}
        <div className="bg-neutral-50/50 border border-neutral-100/80 rounded-[20px] p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-neutral-100 pb-3">
            <Sparkles size={16} className="text-[#FF8A00]" />
            <span className="text-[11.5px] font-[800] text-neutral-400 uppercase tracking-wider">Planetary Yogas (Yog)</span>
          </div>
          
          <div className="py-2.5 text-center flex flex-col items-center justify-center">
            <div className="w-10 h-10 bg-neutral-100 text-neutral-400 rounded-full flex items-center justify-center mb-3">
              <ListFilter size={18} />
            </div>
            <p className="text-[13.5px] text-neutral-700 font-bold max-w-[280px] leading-snug">
              Yog analysis is pending calculations.
            </p>
            <p className="text-[11px] text-neutral-400 font-medium mt-1 leading-relaxed max-w-[260px]">
              Auspicious and challenging planetary configurations like Gajakesari, Raj Yoga, and more.
            </p>
          </div>
        </div>

        {/* 6. Remedies Section */}
        <div className="bg-neutral-50/50 border border-neutral-100/80 rounded-[20px] p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-neutral-100 pb-3">
            <Shield size={16} className="text-[#FF8A00]" />
            <span className="text-[11.5px] font-[800] text-neutral-400 uppercase tracking-wider">Vedic Remedies & Guidance</span>
          </div>
          
          <div className="py-2.5 text-center flex flex-col items-center justify-center">
            <div className="w-10 h-10 bg-neutral-100 text-neutral-400 rounded-full flex items-center justify-center mb-3">
              <AlertCircle size={18} />
            </div>
            <p className="text-[13.5px] text-neutral-700 font-bold max-w-[280px] leading-snug">
              Remedies will unlock upon engine activation.
            </p>
            <p className="text-[11px] text-neutral-400 font-medium mt-1 leading-relaxed max-w-[260px]">
              Personalized gemstone advice, custom mantra chants, and fast recommendations matching your transit charts.
            </p>
          </div>
        </div>

        {/* Back Button Action */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('profile')}
          className="w-full h-[54px] bg-neutral-900 text-white font-[700] rounded-2xl text-[14.5px] flex items-center justify-center shadow-lg shadow-neutral-950/5 cursor-pointer hover:bg-neutral-850 transition-all"
        >
          Back to Profile
        </motion.button>

      </div>
    </div>
  );
}
