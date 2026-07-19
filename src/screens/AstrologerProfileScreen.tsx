import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Star, 
  MessageCircle, 
  BadgeCheck, 
  Heart, 
  Lock, 
  ChevronRight, 
  Sparkles, 
  Languages, 
  Calendar,
  Briefcase,
  Clock,
  MessageSquare,
  Sparkle
} from 'lucide-react';
import { ASTROLOGERS } from '../data';
import { Screen } from '../types';

interface AstrologerProfileScreenProps {
  astrologerId: string;
  onNavigate: (screen: Screen, params?: any) => void;
}

export default function AstrologerProfileScreen({ astrologerId, onNavigate }: AstrologerProfileScreenProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);
  
  const astro = ASTROLOGERS.find(a => a.id === astrologerId);
  
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

  const bioText = astro.about && astro.about.length > 50 
    ? astro.about 
    : `I am a certified Vedic Astrologer and Tarot Practitioner with over ${astro.experience || '10 years'} of deep experience. My consultations offer clear, straightforward insights into your career transitions, personal relationship blocks, and future pathways. I specialize in offering practical, modern remedies that fit easily into your daily routine.`;

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
            <span className="inline-flex items-center space-x-1.5 bg-[#16A34A] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"></span>
              <span>Online</span>
            </span>
            <span className="inline-flex items-center space-x-1.5 bg-[#FF8A00] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-sm">
              <span>⚡</span>
              <span>Replies &lt; 1 min</span>
            </span>
          </div>

          {/* Bottom Right Floating Black Rounded Badge */}
          <div className="absolute bottom-4 right-4 z-10 bg-black/75 backdrop-blur-sm px-3.5 py-1.5 rounded-full text-white flex items-center space-x-1 shadow-lg border border-white/10 text-[11px] font-bold">
            <span className="text-[10px] leading-none mb-0.5">⭐</span>
            <span>{astro.rating}</span>
            <span className="text-neutral-300 font-medium">({astro.consultations >= 1000 ? `${(astro.consultations / 1000).toFixed(1)}k` : astro.consultations} Reviews)</span>
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
              Vedic • Tarot • Career Guidance
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
            <span className="text-xs text-neutral-400 line-through pl-1 decoration-neutral-300">₹{astro.pricePerMinute + 20}/min</span>
            <span className="bg-orange-50/70 text-[#FF8A00] border border-orange-100/40 text-[9px] font-[800] px-1.5 py-0.5 rounded tracking-wider uppercase ml-1">40% OFF</span>
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
              <p className="text-[13px] font-bold text-neutral-800 leading-none">{(astro.consultations / 1000).toFixed(1)}k+</p>
            </div>
            <div className="space-y-1 border-l border-neutral-100/70">
              <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Response</span>
              <p className="text-[13px] font-bold text-[#16A34A] leading-none">&lt; 1 min</p>
            </div>
            <div className="space-y-1 border-l border-neutral-100/70">
              <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Languages</span>
              <p className="text-[12.5px] font-bold text-neutral-800 leading-none truncate px-1">Hindi, Eng</p>
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
              {[
                'Career', 
                'Love & Marriage', 
                'Finance', 
                'Business', 
                'Health', 
                'Education', 
                'Numerology'
              ].map((name, i) => (
                <span 
                  key={i} 
                  className="bg-neutral-50 text-neutral-700 border border-neutral-100 px-3 py-1 rounded-lg text-xs font-semibold cursor-default"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>

          <div className="h-[1px] bg-neutral-100" />

          {/* 7. Ratings and Reviews (LinkedIn recommendation-like elegance) */}
          <div id="reviews-section" className="space-y-5 pt-1">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Ratings & Reviews</h3>
              <button className="text-xs font-bold text-[#FF8A00] hover:underline focus:outline-none flex items-center">
                <span>View All ({astro.consultations})</span>
                <ChevronRight size={13} />
              </button>
            </div>

            {/* Clean layout */}
            <div className="grid grid-cols-12 gap-5 items-center">
              {/* Left Score */}
              <div className="col-span-4 flex flex-col items-center justify-center text-center py-1">
                <span className="text-3xl font-[900] text-neutral-900 leading-none">{astro.rating}</span>
                <div className="flex items-center space-x-0.5 mt-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={10} className="fill-[#FF8A00] text-[#FF8A00] stroke-none" />
                  ))}
                </div>
                <span className="text-[10px] font-medium text-neutral-400 mt-1">
                  Overall Score
                </span>
              </div>

              {/* Right Bars */}
              <div className="col-span-8 space-y-1.5 pl-2">
                {[
                  { star: '5', percentage: '85%' },
                  { star: '4', percentage: '10%' },
                  { star: '3', percentage: '3%' },
                  { star: '2', percentage: '1%' },
                  { star: '1', percentage: '1%' }
                ].map((row, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <span className="text-[9px] font-bold text-neutral-400 w-2.5 text-right">{row.star}</span>
                    <div className="flex-1 h-[3.5px] bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#FF8A00] rounded-full" style={{ width: row.percentage }} />
                    </div>
                    <span className="text-[9px] font-semibold text-neutral-400 w-6 text-right">{row.percentage}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Conversational Realistic Review Items */}
            <div className="space-y-3 pt-1">
              {[
                {
                  name: "Priya Sharma",
                  avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
                  rating: 5,
                  time: "2 days ago",
                  text: "Extremely articulate and direct predictions. Rahul did not sugarcoat anything and gave clear guidance for my career transition. Highly recommended."
                },
                {
                  name: "Rohit Verma",
                  avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
                  rating: 5,
                  time: "5 days ago",
                  text: "He accurately pointed out the timelines of my marriage blockages. His remedies are simple, practical, and very easy to follow."
                }
              ].map((rev, idx) => (
                <div 
                  key={idx} 
                  className="bg-neutral-50/40 border border-neutral-100/60 p-4 rounded-xl flex items-start gap-3.5"
                >
                  <img src={rev.avatar} alt={rev.name} className="w-8.5 h-8.5 rounded-full object-cover shrink-0" />
                  
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-900">{rev.name}</span>
                      <span className="text-[10px] text-neutral-400 font-medium">{rev.time}</span>
                    </div>

                    <div className="flex items-center space-x-0.5 pb-0.5">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <Star key={i} size={9} className="fill-[#FF8A00] text-[#FF8A00] stroke-none" />
                      ))}
                    </div>

                    <p className="text-xs text-neutral-600 leading-relaxed font-normal">
                      {rev.text}
                    </p>
                  </div>
                </div>
              ))}
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
