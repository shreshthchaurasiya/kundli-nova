import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Star, 
  MessageCircle, 
  BadgeCheck, 
  Heart, 
  Lock, 
} from 'lucide-react';
import { Screen } from '../../../../types';
import { useAstrologerPartner } from '../../partner/AstrologerPartnerContext';

interface PublicAstrologerProfileScreenProps {
  astrologerId: string;
  onNavigate: (screen: Screen, params?: any) => void;
}

export default function PublicAstrologerProfileScreen({ astrologerId, onNavigate }: PublicAstrologerProfileScreenProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);
  const { directory, isLoadingDirectory } = useAstrologerPartner();
  
  const astro = directory.find(a => a.id === astrologerId);

  if (isLoadingDirectory) {
    return <div className="h-full bg-white p-5 animate-pulse"><div className="h-[280px] rounded-[22px] bg-neutral-100" /><div className="mt-6 h-7 w-2/3 rounded bg-neutral-100" /><div className="mt-3 h-4 w-1/2 rounded bg-neutral-100" /><div className="mt-7 h-24 rounded-[18px] bg-neutral-100" /></div>;
  }
  
  if (!astro) {
    return (
      <div id="not-found-container" className="flex flex-col items-center justify-center h-full p-8 bg-white text-center">
        <p className="text-neutral-500 mb-4 font-medium">Profile not found</p>
        <button 
          id="go-home-button"
          onClick={() => onNavigate('home')} 
          className="px-6 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-full text-sm transition-all active:scale-95 hover:bg-[#E07A00]"
        >
          Return to Home
        </button>
      </div>
    );
  }

  const bioText = astro.about || 'This verified Kundli Nova astrologer has not added a professional introduction yet.';

  return (
    <div id="profile-screen-root" className="flex-1 relative overflow-hidden bg-white flex flex-col h-full">
      
      {/* Scrollable Content */}
      <div id="profile-scroll-container" className="flex-1 overflow-y-auto no-scrollbar pb-24">
        
        {/* 1. Subtle, Compact Hero Header (280px Height) */}
        <div id="portrait-hero-container" className="relative h-[280px] w-full overflow-hidden bg-neutral-100">
          <img 
            id="astrologer-hero-image"
            src={astro.image} 
            alt={astro.name} 
            className="w-full h-full object-cover object-top" 
          />
          
          {/* Subtle top dark overlay for button legibility */}
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/25 to-transparent pointer-events-none" />
          
          {/* Floating subtle back button */}
          <div className="absolute top-4 left-4 z-20">
            <motion.button 
              id="back-button"
              whileTap={{ scale: 0.92 }}
              onClick={() => onNavigate('home')} 
              className="p-2.5 bg-black/30 backdrop-blur-md rounded-full text-white hover:bg-black/45 transition-all focus:outline-none"
            >
              <ArrowLeft size={18} className="stroke-[2.5]" />
            </motion.button>
          </div>
          
          {/* Floating subtle favorite button */}
          <div className="absolute top-4 right-4 z-20">
            <motion.button 
              id="favorite-button"
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsFavorite(!isFavorite)} 
              className="p-2.5 bg-black/30 backdrop-blur-md rounded-full text-white hover:bg-black/45 transition-all focus:outline-none"
            >
              <Heart 
                size={18} 
                className={`transition-colors duration-300 ${isFavorite ? 'fill-[#FF8A00] text-[#FF8A00] stroke-none' : 'text-white'}`} 
                strokeWidth={2.4}
              />
            </motion.button>
          </div>

          {/* Bottom Left Floating Pills */}
          <div className="absolute bottom-4 left-4 z-10 flex items-center space-x-1.5">
            <span className={`inline-flex items-center space-x-1.5 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-sm ${astro.isOnline ? 'bg-[#16A34A]' : 'bg-neutral-600'}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"></span>
              <span>{astro.isOnline ? 'Online' : 'Offline'}</span>
            </span>
          </div>

          {/* Bottom Right Floating Black Rounded Badge */}
          <div className="absolute bottom-4 right-4 z-10 bg-black/75 backdrop-blur-sm px-3.5 py-1.5 rounded-full text-white flex items-center space-x-1 shadow-lg border border-white/10 text-[11px] font-bold">
            <span className="text-[10px] leading-none mb-0.5">⭐</span>
            <span>{astro.rating}</span>
            <span className="text-neutral-300 font-medium">({astro.reviewsCount >= 1000 ? `${(astro.reviewsCount / 1000).toFixed(1)}k` : astro.reviewsCount} Reviews)</span>
          </div>
        </div>

        {/* 2. Seamless Identity & Information flow */}
        <div id="profile-content-body" className="px-5 pt-5 space-y-6">
          
          {/* Astrologer Name, Verified, Star and Status inline badge */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <h1 id="astrologer-heading-name" className="text-2xl font-[800] text-neutral-900 tracking-tight">{astro.name}</h1>
                <BadgeCheck id="verified-badge-icon" size={19} className="text-[#FF8A00] fill-white shrink-0" />
              </div>
              
              {/* Online indicator */}
              {astro.isOnline ? (
                <span className="inline-flex items-center space-x-1.5 bg-green-50 text-[#16A34A] px-2.5 py-1 rounded-[6px] text-[10px] font-bold uppercase tracking-wider">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A] animate-pulse"></span>
                  <span>Online</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1.5 bg-neutral-100 text-neutral-500 px-2.5 py-1 rounded-[6px] text-[10px] font-bold uppercase tracking-wider">
                  <span className="h-1.5 w-1.5 rounded-full bg-neutral-400"></span>
                  <span>Offline</span>
                </span>
              )}
            </div>

            <p id="astrologer-skills-sub" className="text-[13px] font-medium text-neutral-500 mt-1 leading-none">
              {astro.skills.slice(0, 3).join(' • ')}
            </p>

            <div id="astrologer-meta-sub" className="flex items-center space-x-2 text-[12px] font-normal text-neutral-400 mt-2 leading-none">
              <span className="flex items-center text-neutral-800 font-semibold">
                <Star size={11} className="fill-[#FF8A00] text-[#FF8A00] stroke-none mr-0.5" />
                {astro.rating}
              </span>
              <span className="text-neutral-200">•</span>
              <span>{astro.consultations >= 1000 ? `${(astro.consultations / 1000).toFixed(1)}k` : astro.consultations} Consultations</span>
              <span className="text-neutral-200">•</span>
              <span>{astro.experience} Experience</span>
            </div>
          </div>

          {/* Pricing Block */}
          <div className="flex items-center space-x-2.5 py-0.5">
            <div className="flex items-baseline space-x-0.5">
              <span className="text-2xl font-[800] text-neutral-900 leading-none">₹{astro.pricePerMinute}</span>
              <span className="text-[11px] text-neutral-400 font-semibold lowercase">/min</span>
            </div>
          </div>

          {/* 3. Perfect iOS-style equal width buttons */}
          <div id="action-buttons-grid" className="grid grid-cols-3 gap-2.5">
            {/* Primary Chat CTA */}
            <motion.button 
              id="chat-cta-button"
              whileTap={{ scale: 0.97 }}
              onClick={() => onNavigate('consultation-chat', { astrologerId: astro.id })}
              className="bg-[#FF8A00] text-white hover:bg-[#E07A00] active:bg-[#FF8A00] transition-colors h-11 rounded-xl text-[13px] font-bold tracking-wide flex items-center justify-center space-x-1.5 focus:outline-none cursor-pointer border-none"
            >
              <MessageCircle size={15} className="stroke-[2.5]" />
              <span>Chat</span>
            </motion.button>

            {/* Inactive Voice Call outlined */}
            <button 
              id="voice-call-button"
              className="bg-white text-neutral-700 border border-neutral-200/60 rounded-xl h-11 text-[13px] font-semibold flex items-center justify-center space-x-1.5 focus:outline-none cursor-pointer"
              onClick={() => {}}
            >
              <span>Voice</span>
              <Lock size={11} className="text-neutral-400 stroke-[2.5]" />
            </button>

            {/* Inactive Video Call outlined */}
            <button 
              id="video-call-button"
              className="bg-white text-neutral-700 border border-neutral-200/60 rounded-xl h-11 text-[13px] font-semibold flex items-center justify-center space-x-1.5 focus:outline-none cursor-pointer"
              onClick={() => {}}
            >
              <span>Video</span>
              <Lock size={11} className="text-neutral-400 stroke-[2.5]" />
            </button>
          </div>

          <div className="h-[1px] bg-neutral-100/70" />

          {/* 4. Elegant Clean Grid Information (Stripe-like) */}
          <div id="stats-clean-row" className="grid grid-cols-4 gap-1.5 pt-0.5 text-center">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Experience</span>
              <p className="text-[13px] font-bold text-neutral-800 leading-none">{astro.experience}</p>
            </div>
            <div className="space-y-1 border-l border-neutral-100/70">
              <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Consultations</span>
              <p className="text-[13px] font-bold text-neutral-800 leading-none">{astro.consultations >= 1000 ? `${(astro.consultations / 1000).toFixed(1)}k+` : astro.consultations}</p>
            </div>
            <div className="space-y-1 border-l border-neutral-100/70">
              <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Response</span>
              <p className="text-[13px] font-bold text-[#16A34A] leading-none">{astro.isOnline ? 'Online' : 'Offline'}</p>
            </div>
            <div className="space-y-1 border-l border-neutral-100/70">
              <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Languages</span>
              <p className="text-[12.5px] font-bold text-neutral-800 leading-none truncate px-1">{astro.languages.slice(0, 2).join(', ')}</p>
            </div>
          </div>

          <div className="h-[1px] bg-neutral-100/70" />

          {/* 5. Minimalist About Paragraph */}
          <div id="about-section" className="space-y-2 py-0.5">
            <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">About</h3>
            <div className="text-[13.5px] text-neutral-600 leading-relaxed font-normal">
              <p>
                {isAboutExpanded ? bioText : `${bioText.slice(0, 160)}...`}
              </p>
              <button 
                id="about-toggle"
                onClick={() => setIsAboutExpanded(!isAboutExpanded)}
                className="text-xs font-semibold text-[#FF8A00] hover:text-[#E07A00] transition-colors focus:outline-none mt-1.5 flex items-center space-x-0.5"
              >
                <span>{isAboutExpanded ? 'Read Less' : 'Read More'}</span>
              </button>
            </div>
          </div>

          <div className="h-[1px] bg-neutral-100/70" />

          {/* 6. Clean Outline Chips with Monochrome Subtlety (No colorful badges) */}
          <div id="expertise-section" className="space-y-2.5">
            <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Expertise</h3>
            <div className="flex flex-wrap gap-1.5">
              {astro.skills.map((name) => (
                <span 
                  key={name}
                  className="bg-neutral-50 text-neutral-700 border border-neutral-100 px-3 py-1 rounded-lg text-xs font-semibold cursor-default"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>

          <div className="h-[1px] bg-neutral-100" />

          <div id="reviews-section" className="rounded-[16px] border border-neutral-100 bg-neutral-50/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Customer trust</h3>
                <p className="mt-1 text-xs font-medium text-neutral-500">Verified consultation activity from Kundli Nova.</p>
              </div>
              <div className="text-right">
                <p className="flex items-center justify-end gap-1 text-lg font-black text-neutral-900"><Star size={13} className="fill-[#FF8A00] text-[#FF8A00]" />{astro.rating}</p>
                <p className="text-[10px] font-semibold text-neutral-400">{astro.reviewsCount.toLocaleString('en-IN')} reviews</p>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      {/* 8. Refined Premium Sticky Bottom Consultation Bar (72px height, safe areas) */}
      <div id="sticky-bottom-action-bar" className="absolute bottom-0 left-0 right-0 h-[72px] bg-white border-t border-neutral-100/80 px-5 flex items-center justify-between z-20">
        <div className="flex flex-col justify-center">
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider leading-none">Consult Fee</span>
          <div className="flex items-baseline space-x-0.5 mt-1">
            <span className="text-xl font-[800] text-neutral-900 leading-none">₹{astro.pricePerMinute}</span>
            <span className="text-[11px] font-semibold text-neutral-400 lowercase leading-none">/min</span>
          </div>
        </div>

        <motion.button 
          id="sticky-consult-button"
          whileTap={{ scale: 0.97 }}
          onClick={() => onNavigate('consultation-chat', { astrologerId: astro.id })}
          className="bg-[#FF8A00] text-white hover:bg-[#E07A00] active:bg-[#FF8A00] transition-colors px-6 h-11 rounded-xl text-xs font-bold tracking-wide flex items-center space-x-1.5 focus:outline-none cursor-pointer border-none"
        >
          <MessageCircle size={14} className="stroke-[2.5]" />
          <span>Start Consultation</span>
        </motion.button>
      </div>

    </div>
  );
}
