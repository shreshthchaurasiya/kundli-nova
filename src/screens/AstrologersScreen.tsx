import React, { useState } from 'react';
import { Search, Filter, Star, Phone, MessageCircle, X, Check, SlidersHorizontal, ArrowUpDown, Globe2, Award } from 'lucide-react';
import { ASTROLOGERS } from '../data';
import { Screen } from '../types';
import { TopAstrologerCard } from './HomeScreen';
import { motion, AnimatePresence } from 'motion/react';

interface AstrologersScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
}

export default function AstrologersScreen({ onNavigate }: AstrologersScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const [activeLang, setActiveLang] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'rating' | 'experience' | 'price_low' | 'price_high' | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // List of all unique skills/categories
  const ALL_SKILLS = ['Vedic', 'Tarot', 'Career', 'Marriage', 'Vastu', 'Numerology', 'Love'];
  
  // List of all unique languages
  const ALL_LANGUAGES = ['English', 'Hindi', 'Marathi', 'Sanskrit'];

  // Filter and sort logic
  const filteredAstrologers = ASTROLOGERS.filter((astro) => {
    const query = searchQuery.toLowerCase().trim();
    
    const matchesSearch = query === '' || 
      astro.name.toLowerCase().includes(query) || 
      astro.skills.some(skill => skill.toLowerCase().includes(query)) ||
      astro.languages.some(lang => lang.toLowerCase().includes(query)) ||
      (astro.about && astro.about.toLowerCase().includes(query));

    const matchesSkill = !activeSkill || astro.skills.includes(activeSkill);
    const matchesLang = !activeLang || astro.languages.includes(activeLang);

    return matchesSearch && matchesSkill && matchesLang;
  });

  const sortedAstrologers = [...filteredAstrologers].sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating;
    
    if (sortBy === 'experience') {
      const expA = parseInt(a.experience) || 0;
      const expB = parseInt(b.experience) || 0;
      return expB - expA;
    }
    
    if (sortBy === 'price_low') return a.pricePerMinute - b.pricePerMinute;
    if (sortBy === 'price_high') return b.pricePerMinute - a.pricePerMinute;
    
    return 0; // default
  });

  const clearAllFilters = () => {
    setActiveSkill(null);
    setActiveLang(null);
    setSortBy(null);
  };

  const activeFiltersCount = (activeSkill ? 1 : 0) + (activeLang ? 1 : 0) + (sortBy ? 1 : 0);

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] overflow-hidden relative">
      {/* Search Header */}
      <div className="bg-white px-[20px] py-4 sticky top-0 z-20 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border-b border-gray-100 flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-[20px] font-black text-gray-900 tracking-tight">Astrologers</h1>
          {activeFiltersCount > 0 && (
            <button 
              onClick={clearAllFilters}
              className="text-[11px] font-extrabold text-[#FF8A00] uppercase tracking-wider bg-orange-50 px-2.5 py-1 rounded-md active:scale-95 transition-all"
            >
              Clear Filters ({activeFiltersCount})
            </button>
          )}
        </div>
        
        <div className="flex space-x-2">
          {/* Search Input Box */}
          <div className="flex-1 bg-gray-50 rounded-[16px] px-3.5 py-2.5 flex items-center space-x-2.5 border border-gray-100 focus-within:border-[#FF8A00]/25 focus-within:bg-white transition-all duration-300">
            <Search size={18} className="text-gray-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, skill, language..." 
              className="bg-transparent border-none focus:outline-none text-sm w-full text-gray-800 placeholder:text-gray-400 font-medium" 
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="p-0.5 rounded-full hover:bg-gray-200">
                <X size={14} className="text-gray-400" />
              </button>
            )}
          </div>
          
          {/* Filter Trigger Button */}
          <button 
            onClick={() => setShowFilters(true)}
            className={`p-3 rounded-[16px] shadow-sm flex items-center justify-center transition-all relative ${
              activeFiltersCount > 0 
                ? 'bg-[#FF8A00] text-white shadow-[0_2px_10px_rgba(255,138,0,0.25)]' 
                : 'bg-gray-900 text-white hover:bg-gray-800 active:scale-95'
            }`}
          >
            <Filter size={18} />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[9px] font-black text-white">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>
      
      {/* Scrollable Astrologers List */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-[20px] pb-24 space-y-4">
        {sortedAstrologers.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3.5"
          >
            {sortedAstrologers.map((astro) => (
              <motion.div
                key={astro.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <TopAstrologerCard 
                  astro={astro} 
                  onClick={() => onNavigate('astrologer-profile', { astrologerId: astro.id })} 
                  onChat={() => onNavigate('consultation-chat', { astrologerId: astro.id })} 
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
              <Search size={24} className="text-gray-400" />
            </div>
            <h3 className="text-base font-bold text-gray-800 mb-1">No Astrologers Found</h3>
            <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
              We couldn't find any experts matching your search query or filters. Try adjusting your selections.
            </p>
            <button 
              onClick={() => {
                setSearchQuery('');
                clearAllFilters();
              }}
              className="mt-4 px-5 py-2 bg-gray-900 text-white font-extrabold text-xs rounded-full uppercase tracking-wider"
            >
              Reset Search & Filters
            </button>
          </div>
        )}
      </div>

      {/* Filter Bottom Sheet Drawer */}
      <AnimatePresence>
        {showFilters && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilters(false)}
              className="absolute inset-0 bg-black/40 z-40 backdrop-blur-xs"
            />
            
            {/* Sliding sheet */}
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="absolute bottom-0 inset-x-0 bg-white rounded-t-[32px] max-h-[82%] z-50 overflow-hidden shadow-[0_-8px_30px_rgba(0,0,0,0.15)] flex flex-col pb-safe"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-6 py-4.5 border-b border-gray-100 shrink-0">
                <div className="flex items-center space-x-2">
                  <SlidersHorizontal size={18} className="text-gray-800" />
                  <h3 className="text-base font-black text-gray-900">Filter & Sort Experts</h3>
                </div>
                <button 
                  onClick={() => setShowFilters(false)}
                  className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 active:bg-gray-100"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                
                {/* 1. Sort Options */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <ArrowUpDown size={11} /> Sort Astrologers By
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Highest Rated', value: 'rating' },
                      { label: 'Most Experience', value: 'experience' },
                      { label: 'Price: Low to High', value: 'price_low' },
                      { label: 'Price: High to Low', value: 'price_high' }
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setSortBy(opt.value as any)}
                        className={`px-4 py-3 rounded-[14px] text-xs font-bold text-left border flex items-center justify-between transition-all ${
                          sortBy === opt.value
                            ? 'border-[#FF8A00] bg-orange-50/55 text-[#D68B00]'
                            : 'border-gray-200 text-gray-700 bg-white hover:border-gray-300'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {sortBy === opt.value && <Check size={14} className="text-[#FF8A00] shrink-0" strokeWidth={3} />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Skills / Categories Filter */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Award size={11} /> Expert Specialization
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {ALL_SKILLS.map((skill) => {
                      const isSelected = activeSkill === skill;
                      return (
                        <button
                          key={skill}
                          onClick={() => setActiveSkill(isSelected ? null : skill)}
                          className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all border ${
                            isSelected
                              ? 'bg-[#FF8A00] border-none text-white shadow-[0_2px_8px_rgba(255,138,0,0.25)]'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Language Filter */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Globe2 size={11} /> Consultation Language
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {ALL_LANGUAGES.map((lang) => {
                      const isSelected = activeLang === lang;
                      return (
                        <button
                          key={lang}
                          onClick={() => setActiveLang(isSelected ? null : lang)}
                          className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all border ${
                            isSelected
                              ? 'bg-[#FF8A00] border-none text-white shadow-[0_2px_8px_rgba(255,138,0,0.25)]'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {lang}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Bottom Apply Action Row */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center gap-3 shrink-0">
                <button
                  onClick={() => {
                    clearAllFilters();
                    setShowFilters(false);
                  }}
                  className="flex-1 py-3.5 rounded-[16px] text-xs font-extrabold uppercase tracking-wider text-gray-500 bg-white border border-gray-200 active:bg-gray-100 transition-colors"
                >
                  Reset All
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex-1 py-3.5 rounded-[16px] text-xs font-extrabold uppercase tracking-wider text-white bg-[#FF8A00] hover:bg-[#E07A00] active:scale-[0.98] transition-all shadow-[0_4px_12px_rgba(255,138,0,0.25)]"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
