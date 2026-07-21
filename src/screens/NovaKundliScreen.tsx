import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Download, 
  Sparkles, 
  Compass, 
  Briefcase, 
  Heart, 
  DollarSign, 
  Activity, 
  Users, 
  CheckCircle2, 
  ExternalLink, 
  Share2,
  Calendar,
  Clock,
  MapPin,
  Moon,
  Sun,
  User,
  ShieldCheck,
  Award,
  BookOpen,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Screen } from '../types';
import { KundliData } from '../services/kundliStorage';
import { useRepositories } from '../repositories/repositoryProvider';
import { generateKundli } from '../services/kundliService';
import { generateKundliPdf } from '../services/kundliPdfService';
import { postAiRequest } from '../services/aiClient';
import { AstrologyApi } from '../services/api/astrologyApi';
import { KundliNovaNatalChart } from '../server/types/astrologyProvider';
import { KundliProfile } from '../types/kundli';
import { KundliChart } from '../components/astrology/KundliChart';
import { ApiError } from '../services/api/apiErrors';

interface NovaKundliScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
  routeParams?: {
    kundliData?: any; // fallback legacy
    fromScreen?: Screen;
  };
}

export default function NovaKundliScreen({ onNavigate, routeParams }: NovaKundliScreenProps) {
  const repositories = useRepositories();
  const fromScreen = routeParams?.fromScreen || 'nova-ai-chat';

  // Profile selection
  const [profiles, setProfiles] = useState<KundliProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // New API Data
  const [apiChartData, setApiChartData] = useState<KundliNovaNatalChart | null>(null);
  
  // States
  const [loadingKundli, setLoadingKundli] = useState(true);
  const [errorState, setErrorState] = useState<{code: string, message: string} | null>(null);

  // Monotonically increasing request ID guard against out-of-order responses
  const activeRequestIdRef = useRef(0);

  // Fetch profiles on mount
  useEffect(() => {
    const init = async () => {
      try {
        const userProfiles = await repositories.kundliProfile.getAllProfiles();
        setProfiles(userProfiles);
        
        if (userProfiles.length > 0) {
          const defaultProfile = userProfiles.find(p => p.is_default) || userProfiles[0];
          setSelectedProfileId(defaultProfile.id);
        } else {
          setLoadingKundli(false);
          setErrorState({ code: 'NO_PROFILES', message: 'No Kundli profiles found. Please create one first.' });
        }
      } catch (err) {
        setLoadingKundli(false);
        setErrorState({ code: 'PROFILE_ERROR', message: 'Failed to load profiles.' });
      }
    };
    init();
  }, [repositories.kundliProfile]);

  // Fetch Kundli when profile changes
  useEffect(() => {
    if (!selectedProfileId) return;
    
    const requestId = ++activeRequestIdRef.current;
    let isMounted = true;
    const fetchKundli = async () => {
      setLoadingKundli(true);
      setErrorState(null);
      setApiChartData(null);
      
      try {
        const chart = await AstrologyApi.getKundli(selectedProfileId);
        if (isMounted && activeRequestIdRef.current === requestId) {
          setApiChartData(chart);
          setLoadingKundli(false);
        }
      } catch (err: any) {
        if (isMounted && activeRequestIdRef.current === requestId) {
          const apiErr = err as ApiError;
          setErrorState({
            code: apiErr.code || 'ERROR',
            message: apiErr.message || 'Failed to load Kundli'
          });
          setLoadingKundli(false);
        }
      }
    };
    
    fetchKundli();
    
    return () => { isMounted = false; };
  }, [selectedProfileId]);

  const [activeTab, setActiveTab] = useState<'charts' | 'planets' | 'dasha' | 'insights' | 'basic'>('charts');

  // Accordion active house
  const [activeAccordionHouse, setActiveAccordionHouse] = useState<number>(1);

  // Full-screen zoomable chart state
  const [isFullscreenChartOpen, setIsFullscreenChartOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);

  // Swipeable tabs touch tracking
  const tabsOrder: ('charts' | 'planets' | 'dasha' | 'insights' | 'basic')[] = ['charts', 'planets', 'dasha', 'insights', 'basic'];
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // AI explanations status
  const [explanations, setExplanations] = useState<{ [key: string]: { text?: string, loading: boolean } }>({
    charts: { loading: false },
    planets: { loading: false },
    dasha: { loading: false }
  });

  // PDF modal state
  const [pdfModalState, setPdfModalState] = useState<'idle' | 'generating' | 'ready'>('idle');
  const [pdfUrls, setPdfUrls] = useState<{ blobUrl: string; base64: string } | null>(null);

  if (loadingKundli) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#FCFBF8]">
        <div className="w-[40px] h-[40px] border-[3px] border-[#FF8A00]/20 border-t-[#FF8A00] rounded-full animate-spin" />
      </div>
    );
  }

  if (errorState) {
    const isNoProfiles = errorState.code === 'NO_PROFILES';
    return (
      <div className="flex flex-col h-full w-full bg-[#FCFBF8] items-center justify-center p-6 text-center">
        <div className={`w-16 h-16 ${isNoProfiles ? 'bg-orange-50' : 'bg-red-50'} rounded-full flex items-center justify-center mb-4`}>
          <Info size={28} className={isNoProfiles ? 'text-[#FF8A00]' : 'text-red-500'} />
        </div>
        <h2 className="text-[18px] font-[850] text-[#111827] mb-2">
          {errorState.code === 'KUNDLI_SERVICE_NOT_CONFIGURED' ? 'Service Unavailable' : 
           isNoProfiles ? 'No Profiles Found' : 'Error Loading Kundli'}
        </h2>
        <p className="text-[13px] text-neutral-500 max-w-xs leading-relaxed mb-6">
          {errorState.message}
        </p>
        <button 
          onClick={() => isNoProfiles ? onNavigate('kundli-profile-form', { fromScreen: 'nova-kundli' }) : onNavigate(fromScreen)}
          className="px-6 py-2.5 bg-[#FF8A00] text-white rounded-full text-[13px] font-[800] active:scale-[0.98] transition-all"
        >
          {isNoProfiles ? 'Add Profile' : 'Go Back'}
        </button>
      </div>
    );
  }

  if (!apiChartData) {
    return null;
  }

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);
  const birthDetails = {
    name: selectedProfile?.name || 'Unknown',
    gender: selectedProfile?.gender || 'unknown',
    dob: apiChartData.input.dateOfBirth,
    tob: apiChartData.input.timeOfBirth,
    city: selectedProfile?.birth_city || 'Unknown',
    state: selectedProfile?.birth_state || 'Unknown',
  };

  const astrologySummary = {
    lagna: apiChartData.ascendant.sign,
    sunSign: apiChartData.sunSign || 'Unknown',
    moonSign: apiChartData.moonSign || 'Unknown',
    nakshatra: apiChartData.nakshatra || 'Unknown',
    moolank: 1, // Fallback for demo
    bhagyank: 1, // Fallback for demo
  };

  const planetaryPositions = apiChartData.planets;
  
  // Dashas and Insights are not implemented in Stage 5A, using fallbacks
  const currentDasha = { mahadasha: 'Venus', antardasha: 'Jupiter' };
  const lifeInsights = { 
    career: 'Career insights will be generated by AI in upcoming stages.', 
    marriage: 'Relationship insights will be available soon.', 
    finance: 'Financial predictions are being calibrated.', 
    health: 'Health indicators will be accessible in full reports.', 
    family: 'Family dynamics will be analyzed shortly.' 
  };

  const handleDownloadPdf = async () => {
    setPdfModalState('generating');
    try {
      const mockKundliData: any = {
        birthDetails, 
        astrologySummary, 
        planetaryPositions, 
        currentDasha, 
        lifeInsights
      };
      const result = await generateKundliPdf(mockKundliData);
      setPdfUrls({
        blobUrl: result.pdfBlobUrl,
        base64: result.pdfBase64
      });
      setPdfModalState('ready');
      // Trigger native download
      result.download();
    } catch (e) {
      console.error(e);
      setPdfModalState('idle');
    }
  };

  // Touch Swipe Gesture Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 70;
    const isRightSwipe = distance < -70;
    const currentIdx = tabsOrder.indexOf(activeTab);

    if (isLeftSwipe && currentIdx < tabsOrder.length - 1) {
      setActiveTab(tabsOrder[currentIdx + 1]);
    } else if (isRightSwipe && currentIdx > 0) {
      setActiveTab(tabsOrder[currentIdx - 1]);
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  const handleExplainWithAI = async (section: 'charts' | 'planets' | 'dasha') => {
    if (explanations[section].loading) return;
    setExplanations(prev => ({
      ...prev,
      [section]: { ...prev[section], loading: true }
    }));
    
    try {
      let sectionData: any = {};
      if (section === 'charts') {
        sectionData = {
          lagna: astrologySummary.lagna,
          moonSign: astrologySummary.moonSign,
          nakshatra: astrologySummary.nakshatra
        };
      } else if (section === 'planets') {
        sectionData = {
          planetaryPositions: planetaryPositions.map(p => ({ name: p.name, zodiac: p.zodiac, degree: p.degree }))
        };
      } else if (section === 'dasha') {
        sectionData = {
          mahadasha: currentDasha.mahadasha,
          antardasha: currentDasha.antardasha
        };
      }

      const result = await postAiRequest<{ explanation: string }>('/api/explain', {
        section,
        data: sectionData,
        userProfile: birthDetails,
      });
      setExplanations(prev => ({
        ...prev,
        [section]: { text: result.explanation, loading: false }
      }));
    } catch (err) {
      console.error(err);
      setExplanations(prev => ({
        ...prev,
        [section]: { text: err instanceof Error ? err.message : "Nova AI se connection nahi ho paaya. Kripya dobara prayas karein.", loading: false }
      }));
    }
  };

  const getLagnaZodiacNumber = (): number => {
    const lagnaLower = astrologySummary.lagna.toLowerCase();
    if (lagnaLower.includes('mesh') || lagnaLower.includes('aries')) return 1;
    if (lagnaLower.includes('vrishabha') || lagnaLower.includes('taurus')) return 2;
    if (lagnaLower.includes('mithuna') || lagnaLower.includes('gemini')) return 3;
    if (lagnaLower.includes('karka') || lagnaLower.includes('cancer')) return 4;
    if (lagnaLower.includes('simha') || lagnaLower.includes('leo')) return 5;
    if (lagnaLower.includes('kanya') || lagnaLower.includes('virgo')) return 6;
    if (lagnaLower.includes('tula') || lagnaLower.includes('libra')) return 7;
    if (lagnaLower.includes('vrishchika') || lagnaLower.includes('scorpio')) return 8;
    if (lagnaLower.includes('dhanu') || lagnaLower.includes('sagittarius')) return 9;
    if (lagnaLower.includes('makara') || lagnaLower.includes('capricorn')) return 10;
    if (lagnaLower.includes('kumbha') || lagnaLower.includes('aquarius')) return 11;
    if (lagnaLower.includes('meena') || lagnaLower.includes('pisces')) return 12;
    return 1; // fallback
  };

  const getZodiacNumberForHouse = (houseNum: number): number => {
    const base = getLagnaZodiacNumber();
    const result = (base + houseNum - 1) % 12;
    return result === 0 ? 12 : result;
  };

  const getPlanetsInHouse = (houseNum: number): string => {
    const abbreviations: { [key: string]: string } = {
      'Sun (Surya)': 'Su',
      'Moon (Chandra)': 'Mo',
      'Mars (Mangal)': 'Ma',
      'Mercury (Budh)': 'Me',
      'Jupiter (Guru)': 'Ju',
      'Venus (Shukra)': 'Ve',
      'Saturn (Shani)': 'Sa',
      'Rahu': 'Ra',
      'Ketu': 'Ke'
    };

    const found = planetaryPositions
      .filter(p => p.house === houseNum)
      .map(p => abbreviations[p.name] || p.name.substring(0, 2));

    if (houseNum === 1) {
      found.unshift('Lg');
    }

    return found.length > 0 ? found.join(', ') : '';
  };

  const houseMeanings: { [key: number]: { title: string; desc: string } } = {
    1: { title: '1st House (Lagna)', desc: 'Self, personality, physical body, health, character, outlook.' },
    2: { title: '2nd House (Dhana)', desc: 'Wealth, family values, speech, possessions, early education.' },
    3: { title: '3rd House (Sahaja)', desc: 'Courage, younger siblings, communication, short travels, efforts.' },
    4: { title: '4th House (Sukha)', desc: 'Mother, home environment, mental peace, assets, happiness.' },
    5: { title: '5th House (Putra)', desc: 'Intelligence, romance, children, ancient wisdom, creativity.' },
    6: { title: '6th House (Shatru)', desc: 'Enemies, debts, health issues, service, daily struggles, obstacles.' },
    7: { title: '7th House (Kalatra)', desc: 'Marriage, spouse, partnerships, business relationships, public life.' },
    8: { title: '8th House (Ayur)', desc: 'Longevity, transformation, mysteries, shared finances, sudden events.' },
    9: { title: '9th House (Dharma)', desc: 'Fortune, spirituality, higher education, father, long travels, ethics.' },
    10: { title: '10th House (Karma)', desc: 'Career, profession, social status, power, achievements, leadership.' },
    11: { title: '11th House (Labha)', desc: 'Gains, wishes fulfillment, friends, elder siblings, network circle.' },
    12: { title: '12th House (Vyaya)', desc: 'Expenditure, liberation (Moksha), sleep, foreign lands, sub-conscious.' }
  };

  return (
    <div className="relative flex flex-col h-full w-full bg-[#FCFBF8] font-sans antialiased selection:bg-[#FF8A00]/20 pb-10 overflow-y-auto no-scrollbar">
      
      {/* Top Header - Astrotalk styling */}
      <div className="bg-[#FFFFFF]/95 backdrop-blur-md px-[16px] sm:px-[20px] pt-[max(12px,env(safe-area-inset-top))] pb-[14px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] sticky top-0 z-20 flex items-center justify-between border-b border-[#F1EFE9]">
        <div className="flex items-center space-x-[8px]">
          <button 
            onClick={() => onNavigate(fromScreen)}
            className="p-[8px] -ml-[8px] rounded-full hover:bg-neutral-50 active:bg-neutral-100 transition-colors text-[#111827] focus:outline-none"
          >
            <ArrowLeft size={22} strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="text-[16px] font-[850] text-[#111827] tracking-tight leading-tight">Janam Kundli</h1>
            <p className="text-[10.5px] font-bold text-[#FF8A00] tracking-wide uppercase mt-0.5">Demo Kundli Preview</p>
          </div>
        </div>

        <button 
          onClick={handleDownloadPdf}
          className="h-9 px-3 bg-[#FFF3E0] text-[#FF8A00] border border-[#FFE0B2] hover:bg-[#FFE0B2] active:scale-[0.97] rounded-full text-[12px] font-[800] flex items-center space-x-1.5 transition-all focus:outline-none"
        >
          <Download size={13} strokeWidth={3} />
          <span>Save PDF</span>
        </button>
      </div>

      {/* Demo notice banner */}
      <div className="mx-4 mt-3 mb-0 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
        <span className="text-amber-600 text-[11px] font-bold leading-tight">
          ⚠️ Demo preview — Calculated Kundli report not available yet. Displayed data is illustrative only.
        </span>
      </div>

      {/* Sleek Horizontal Profile Summary (Saves space, matches Astrotalk app) */}
      <div className="px-4 pt-4">
        <div className="max-w-md mx-auto bg-gradient-to-r from-[#FFFDF9] to-[#FFF9F0] border border-[#F5E6D3] rounded-2xl p-4 shadow-[0_2px_8px_rgba(255,138,0,0.02)] flex items-center justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/4 opacity-[0.02] text-neutral-900 pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <circle cx="90" cy="50" r="40" stroke="currentColor" strokeWidth="0.8" fill="none" />
            </svg>
          </div>
          
          <div className="flex items-center space-x-3 w-full">
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#FF8A00] to-[#FFB74D] text-white flex items-center justify-center font-[800] text-[18px] shadow-[0_3px_8px_rgba(255,138,0,0.15)] ring-2 ring-white shrink-0">
              {birthDetails.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 relative">
              <div className="flex items-center space-x-1.5 relative">
                <select 
                  className="appearance-none bg-transparent text-[14.5px] font-[850] text-[#111827] leading-tight outline-none focus:outline-none pr-5 cursor-pointer max-w-[150px] truncate"
                  value={selectedProfileId || ''}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                >
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="text-neutral-400 absolute right-0 pointer-events-none" />
                <span className="text-[9.5px] text-[#FF8A00] bg-[#FFF3E0] px-1.5 py-0.5 rounded-full font-extrabold uppercase tracking-widest ml-1">{birthDetails.gender}</span>
              </div>
              <div className="flex items-center space-x-1.5 text-neutral-500 text-[11px] font-semibold mt-1.5">
                <span>{birthDetails.dob}</span>
                <span className="text-neutral-300">•</span>
                <span>{birthDetails.tob}</span>
              </div>
            </div>
            
            <div className="text-right shrink-0 pl-2">
              <span className="text-[10px] font-bold text-neutral-400 block tracking-wide uppercase">Place</span>
              <span className="text-[11.5px] font-extrabold text-neutral-700 block truncate max-w-[80px] mt-0.5">{birthDetails.city}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Scrollable Tab Bar - Sticky beneath profile */}
      <div className="sticky top-[61px] bg-[#FCFBF8] border-b border-[#F1EFE9] py-3 z-10">
        <div className="flex space-x-2 overflow-x-auto px-4 no-scrollbar scroll-smooth">
          {[
            { id: 'charts', label: 'Lagna Chart' },
            { id: 'planets', label: 'Planets Degrees' },
            { id: 'dasha', label: 'Vimshottari Dasha' },
            { id: 'insights', label: 'Predictions' },
            { id: 'basic', label: 'Basic Details' }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4.5 py-2 rounded-full text-[12.5px] font-[800] transition-all whitespace-nowrap active:scale-[0.97] focus:outline-none ${
                  isActive
                    ? 'bg-[#FF8A00] text-white shadow-[0_3px_10px_rgba(255,138,0,0.25)] border border-[#FF8A00]'
                    : 'bg-white text-neutral-600 border border-[#EBE8E0] hover:bg-[#FFFDF9]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area with Dynamic Panels */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="px-4 py-4 max-w-md mx-auto w-full flex-1"
      >
        
        {/* PANEL: CHARTS */}
        {activeTab === 'charts' && (
          <div className="space-y-5 animate-fadeIn">
            <div className="text-center max-w-xs mx-auto mb-2">
              <span className="text-[#FF8A00] text-[10.5px] font-[850] uppercase tracking-wider block">Main Ascendant Chart</span>
              <h3 className="text-[17px] font-[850] text-[#111827] tracking-tight mt-0.5">Lagna Kundli (D1)</h3>
              <p className="text-[11.5px] text-neutral-400 font-semibold leading-relaxed mt-1">This celestial map diagrams the exact rising zodiac sign and planetary coordinates at your birth moment. Tap on the chart to view fullscreen zoom.</p>
            </div>

            <div className="flex flex-col items-center">
              <KundliChart 
                ascendantSign={apiChartData.ascendant.sign}
                planets={apiChartData.planets}
                onZoom={() => {
                  setIsFullscreenChartOpen(true);
                  setZoomScale(1.2);
                }}
              />
            </div>
            {/* Outlined AI Explanation Capsule Button */}
            <div className="w-full">
              <button
                onClick={() => handleExplainWithAI('charts')}
                disabled={explanations.charts.loading}
                className="w-full h-11 border border-[#FFE0B2] bg-[#FFFDF9] hover:bg-[#FFF5E6] rounded-2xl text-[12.5px] font-[800] text-[#FF8A00] flex items-center justify-center space-x-2 transition-all active:scale-[0.98] focus:outline-none disabled:opacity-50"
              >
                {explanations.charts.loading ? (
                  <div className="w-4 h-4 border-2 border-t-transparent border-[#FF8A00] rounded-full animate-spin" />
                ) : (
                  <Sparkles size={14} className="fill-[#FF8A00] text-[#FF8A00]" />
                )}
                <span>{explanations.charts.loading ? 'Acharya Dev Sharma is analyzing...' : 'Explain Lagna Chart with AI'}</span>
              </button>

              <AnimatePresence>
                {explanations.charts.text && (
                  <motion.div 
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 bg-gradient-to-tr from-[#FFFDF9] to-[#FFF9F0] border border-[#F5E6D3] rounded-2xl p-4 shadow-[0_2px_8px_rgba(255,138,0,0.02)] text-[12.5px] font-semibold text-neutral-700 leading-relaxed relative"
                  >
                    <div className="absolute top-3.5 right-3.5">
                      <Sparkles size={13} className="text-[#FF8A00]/30 animate-pulse" />
                    </div>
                    <p className="pr-4">{explanations.charts.text}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Subtle Divider Line */}
            <div className="border-t border-[#FF8A00]/10 my-4" />

            {/* Interactive House Meaning Explainer - Astrotalk Premium accordion */}
            <div className="bg-white border border-[#EBE8E0] rounded-2xl p-4.5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-3">
              <div className="flex items-center space-x-2 border-b border-[#F5F2EB] pb-2.5">
                <BookOpen size={16} className="text-[#FF8A00]" />
                <h4 className="text-[13px] font-[850] text-[#111827] uppercase tracking-wider">Major House Key Factors</h4>
              </div>

              <div className="space-y-2.5">
                {[1, 4, 7, 10].map((num) => {
                  const isOpen = activeAccordionHouse === num;
                  return (
                    <div key={num} className="border border-[#F5F2EB] rounded-xl overflow-hidden transition-all">
                      <button
                        onClick={() => setActiveAccordionHouse(isOpen ? 0 : num)}
                        className="w-full px-3.5 py-3 flex items-center justify-between bg-[#FFFDF9]/60 hover:bg-[#FFFDF9] transition-colors text-left"
                      >
                        <span className="font-extrabold text-[12.5px] text-[#111827]">{houseMeanings[num].title}</span>
                        {isOpen ? (
                          <ChevronUp size={15} className="text-[#FF8A00]" />
                        ) : (
                          <ChevronDown size={15} className="text-neutral-400" />
                        )}
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white"
                          >
                            <div className="px-3.5 pb-3.5 pt-1 text-[12px] text-neutral-500 font-semibold leading-[1.5]">
                              {houseMeanings[num].desc}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* PANEL: PLANETS */}
        {activeTab === 'planets' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-white border border-[#EBE8E0] rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
              <div className="bg-[#FFFDF9] border-b border-[#F5F2EB] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Compass size={15} className="text-[#FF8A00]" />
                  <span className="text-[12.5px] font-[850] text-[#111827] uppercase tracking-wider">Grahas Planetary Degrees</span>
                </div>
                <span className="text-[9.5px] font-extrabold text-neutral-400 uppercase tracking-widest bg-neutral-100 px-2 py-0.5 rounded-full">
                  9 Planets
                </span>
              </div>

              <div className="divide-y divide-[#F5F2EB]">
                {planetaryPositions.map((planet, index) => {
                  const isRetrograde = planet.name.includes('Rahu') || planet.name.includes('Ketu');
                  return (
                    <div 
                      key={index} 
                      className="px-4 py-3 flex items-center justify-between hover:bg-neutral-50/50 transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="text-[13px] font-[850] text-[#111827] flex items-center space-x-1.5">
                          <span>{planet.name.split(' ')[0]}</span>
                          {isRetrograde && (
                            <span className="text-[8.5px] font-extrabold text-red-500 bg-red-50 px-1 py-0.2 rounded uppercase">Rx</span>
                          )}
                        </span>
                        <span className="text-[10.5px] font-bold text-neutral-400 uppercase tracking-wider mt-0.5">
                          {planet.zodiac} • House {planet.house}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[12.5px] font-bold text-neutral-600 font-mono">{planet.degree}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Outlined AI Explanation Capsule Button for Planets */}
            <div className="w-full">
              <button
                onClick={() => handleExplainWithAI('planets')}
                disabled={explanations.planets.loading}
                className="w-full h-11 border border-[#FFE0B2] bg-[#FFFDF9] hover:bg-[#FFF5E6] rounded-2xl text-[12.5px] font-[800] text-[#FF8A00] flex items-center justify-center space-x-2 transition-all active:scale-[0.98] focus:outline-none disabled:opacity-50"
              >
                {explanations.planets.loading ? (
                  <div className="w-4 h-4 border-2 border-t-transparent border-[#FF8A00] rounded-full animate-spin" />
                ) : (
                  <Sparkles size={14} className="fill-[#FF8A00] text-[#FF8A00]" />
                )}
                <span>{explanations.planets.loading ? 'Acharya Dev Sharma is analyzing...' : 'Explain Planets Degrees with AI'}</span>
              </button>

              <AnimatePresence>
                {explanations.planets.text && (
                  <motion.div 
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 bg-gradient-to-tr from-[#FFFDF9] to-[#FFF9F0] border border-[#F5E6D3] rounded-2xl p-4 shadow-[0_2px_8px_rgba(255,138,0,0.02)] text-[12.5px] font-semibold text-neutral-700 leading-relaxed relative"
                  >
                    <div className="absolute top-3.5 right-3.5">
                      <Sparkles size={13} className="text-[#FF8A00]/30 animate-pulse" />
                    </div>
                    <p className="pr-4">{explanations.planets.text}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Subtle Divider Line */}
            <div className="border-t border-[#FF8A00]/10 my-4" />
          </div>
        )}

        {/* PANEL: DASHA */}
        {activeTab === 'dasha' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="text-center max-w-xs mx-auto mb-1">
              <span className="text-[#FF8A00] text-[10.5px] font-[850] uppercase tracking-wider block">Planetary Period Timeline</span>
              <h3 className="text-[17px] font-[850] text-[#111827] tracking-tight mt-0.5">Vimshottari Dasha Periods</h3>
              <p className="text-[11.5px] text-neutral-400 font-semibold leading-relaxed mt-1">Calculated using 120 years lunar cycle timeline to determine planetary influences in current life phase.</p>
            </div>

            {/* Active Dasha Highlight Card */}
            <div className="bg-[#FFFDF9] border-2 border-[#FFE0B2] rounded-2xl p-4.5 space-y-3 relative overflow-hidden shadow-[0_4px_16px_rgba(255,138,0,0.03)]">
              <div className="absolute right-0 top-0 bottom-0 w-1/5 bg-[#FF8A00]/5 pointer-events-none rounded-r-xl" />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="border-r border-[#FFF3E0] pr-2">
                  <span className="text-[9px] font-bold text-[#FF8A00] uppercase tracking-widest block">Active Mahadasha</span>
                  <span className="text-[15px] font-[900] text-[#111827] mt-1 block leading-tight">{currentDasha.mahadasha}</span>
                  <span className="text-[9.5px] font-bold text-neutral-400 block mt-1">Primary Lord planet influence</span>
                </div>
                <div className="pl-2">
                  <span className="text-[9px] font-bold text-[#FF8A00] uppercase tracking-widest block">Active Antardasha</span>
                  <span className="text-[15px] font-[900] text-[#111827] mt-1 block leading-tight">{currentDasha.antardasha}</span>
                  <span className="text-[9.5px] font-bold text-neutral-400 block mt-1">Secondary sub-period ruler</span>
                </div>
              </div>

              {/* Minimal Clean Current Focus Card */}
              <div className="bg-white border border-[#F5E6D3] rounded-xl p-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.015)] mt-3">
                <span className="text-[10px] font-extrabold text-[#FF8A00] uppercase tracking-wider block">Current Focus & Influence</span>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mt-2.5">
                  {[
                    { name: 'Career', rating: 5 },
                    { name: 'Finance', rating: 4 },
                    { name: 'Relationships', rating: 3 },
                    { name: 'Health', rating: 3 },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-[11.5px]">
                      <span className="text-neutral-500 font-bold">{item.name}</span>
                      <span className="text-[#FF8A00] font-mono tracking-wider font-extrabold text-[10px]">
                        {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[#F5E6D3] flex items-start space-x-2">
                <Info size={14} className="text-[#FF8A00] shrink-0 mt-0.5" />
                <p className="text-[11.5px] text-neutral-500 font-semibold leading-[1.4]">
                  This transit cycle is highly supportive for career development, self-elevation, and seeking spiritual/intellectual wisdom.
                </p>
              </div>
            </div>

            {/* Outlined AI Explanation Capsule Button for Dasha */}
            <div className="w-full">
              <button
                onClick={() => handleExplainWithAI('dasha')}
                disabled={explanations.dasha.loading}
                className="w-full h-11 border border-[#FFE0B2] bg-[#FFFDF9] hover:bg-[#FFF5E6] rounded-2xl text-[12.5px] font-[800] text-[#FF8A00] flex items-center justify-center space-x-2 transition-all active:scale-[0.98] focus:outline-none disabled:opacity-50"
              >
                {explanations.dasha.loading ? (
                  <div className="w-4 h-4 border-2 border-t-transparent border-[#FF8A00] rounded-full animate-spin" />
                ) : (
                  <Sparkles size={14} className="fill-[#FF8A00] text-[#FF8A00]" />
                )}
                <span>{explanations.dasha.loading ? 'Acharya Dev Sharma is analyzing...' : 'Explain Vimshottari Dasha with AI'}</span>
              </button>

              <AnimatePresence>
                {explanations.dasha.text && (
                  <motion.div 
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 bg-gradient-to-tr from-[#FFFDF9] to-[#FFF9F0] border border-[#F5E6D3] rounded-2xl p-4 shadow-[0_2px_8px_rgba(255,138,0,0.02)] text-[12.5px] font-semibold text-neutral-700 leading-relaxed relative"
                  >
                    <div className="absolute top-3.5 right-3.5">
                      <Sparkles size={13} className="text-[#FF8A00]/30 animate-pulse" />
                    </div>
                    <p className="pr-4">{explanations.dasha.text}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Subtle Divider Line */}
            <div className="border-t border-[#FF8A00]/10 my-4" />

            {/* Vedic Timeline flow representation */}
            <div className="bg-white border border-[#EBE8E0] rounded-2xl p-4.5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
              <span className="text-[11px] font-extrabold text-neutral-400 uppercase tracking-widest block">Dasha Order Flow</span>
              
              <div className="relative border-l-2 border-[#FFF3E0] pl-5 ml-2.5 space-y-5.5 py-1">
                {[
                  { planet: currentDasha.mahadasha.split(' ')[0], period: 'Current Phase (Dominant)', desc: 'Focuses deeply on personal development, authority, and destiny alignment.', active: true },
                  { planet: currentDasha.antardasha.split(' ')[0], period: 'Active Sub-Phase', desc: 'Directs the active daily energies towards relationships and profession.', active: true },
                  { planet: 'Pratyantardasha', period: 'Micro Transit Phase', desc: 'Determines short-term events, mind state, and quick financial gains.', active: false }
                ].map((item, idx) => (
                  <div key={idx} className="relative">
                    {/* Circle bullet node */}
                    <div className={`absolute -left-[26px] top-1 w-3 h-3 rounded-full border-2 ${
                      item.active ? 'bg-[#FF8A00] border-[#FF8A00] ring-4 ring-[#FFF3E0]' : 'bg-white border-[#EBE8E0]'
                    }`} />
                    <div className="text-[12.5px] leading-tight">
                      <span className={`font-extrabold block ${item.active ? 'text-[#FF8A00]' : 'text-[#111827]'}`}>{item.planet}</span>
                      <span className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider block mt-0.5">{item.period}</span>
                      <span className="text-neutral-500 font-semibold text-[11.5px] leading-relaxed mt-1 block">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PANEL: INSIGHTS */}
        {activeTab === 'insights' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="text-center max-w-xs mx-auto mb-1">
              <span className="text-[#FF8A00] text-[10.5px] font-[850] uppercase tracking-wider block">Personalized Horoscopes</span>
              <h3 className="text-[17px] font-[850] text-[#111827] tracking-tight mt-0.5">Life Insights & Predictions</h3>
              <p className="text-[11.5px] text-neutral-400 font-semibold leading-relaxed mt-1">Calculated and calculated by Kundli Nova’s dynamic Vedic calculations based on your planetary transits.</p>
            </div>

            <div className="space-y-3">
              {[
                { title: 'Career & Professional Growth', desc: lifeInsights.career, icon: Briefcase, color: 'text-amber-600 bg-amber-50 border-amber-100/60' },
                { title: 'Love, Marriage & Relationships', desc: lifeInsights.marriage, icon: Heart, color: 'text-red-500 bg-red-50 border-red-100/60' },
                { title: 'Wealth, Assets & Finances', desc: lifeInsights.finance, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 border-emerald-100/60' },
                { title: 'Physical Health & Vitality', desc: lifeInsights.health, icon: Activity, color: 'text-blue-500 bg-blue-50 border-blue-100/60' },
                { title: 'Family Happiness & House Peace', desc: lifeInsights.family, icon: Users, color: 'text-purple-500 bg-purple-50 border-purple-100/60' }
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index} className="bg-white border border-[#EBE8E0] p-4 rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.01)] flex items-start space-x-3.5">
                    <div className={`p-2.5 rounded-xl border shrink-0 ${item.color}`}>
                      <Icon size={16} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h4 className="text-[13.5px] font-[850] text-[#111827]">{item.title}</h4>
                      <p className="text-[12px] font-semibold text-[#525252] leading-[1.5] mt-1">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PANEL: BASIC */}
        {activeTab === 'basic' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Core Vedic Astrological Calculations Table */}
            <div className="bg-white border border-[#EBE8E0] rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
              <div className="bg-[#FFFDF9] border-b border-[#F5F2EB] px-4 py-3">
                <span className="text-[12.5px] font-[850] text-[#111827] uppercase tracking-wider block">Astrological Calculations</span>
              </div>
              
              <div className="divide-y divide-[#F5F2EB]">
                {[
                  { label: 'Ascendant (Lagna)', value: astrologySummary.lagna },
                  { label: 'Sun Sign (Surya Rashi)', value: astrologySummary.sunSign },
                  { label: 'Moon Sign (Chandra Rashi)', value: astrologySummary.moonSign },
                  { label: 'Birth Nakshatra', value: astrologySummary.nakshatra },
                  { label: 'Psychic Number (Moolank)', value: String(astrologySummary.moolank) },
                  { label: 'Destiny Number (Bhagyank)', value: String(astrologySummary.bhagyank) }
                ].map((item, idx) => (
                  <div key={idx} className="px-4 py-3 flex justify-between text-[12.5px] items-center">
                    <span className="text-neutral-500 font-semibold">{item.label}</span>
                    <span className="text-[#111827] font-extrabold text-right">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Birth Details Parameters Table */}
            <div className="bg-white border border-[#EBE8E0] rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
              <div className="bg-[#FFFDF9] border-b border-[#F5F2EB] px-4 py-3">
                <span className="text-[12.5px] font-[850] text-[#111827] uppercase tracking-wider block">User Parameters Summary</span>
              </div>
              
              <div className="divide-y divide-[#F5F2EB]">
                {[
                  { label: 'Full Name', value: birthDetails.name },
                  { label: 'Gender Type', value: birthDetails.gender },
                  { label: 'Date of Birth', value: birthDetails.dob },
                  { label: 'Time of Birth', value: birthDetails.tob },
                  { label: 'Place of Birth', value: `${birthDetails.city}, ${birthDetails.state}` }
                ].map((item, idx) => (
                  <div key={idx} className="px-4 py-3 flex justify-between text-[12.5px] items-center">
                    <span className="text-neutral-500 font-semibold">{item.label}</span>
                    <span className="text-[#111827] font-extrabold text-right">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM DOWNLOAD PDF BUTTON - Sticky behavior on bottom */}
        <div className="pt-6 pb-2">
          <button 
            onClick={handleDownloadPdf}
            className="w-full h-13.5 bg-[#FF8A00] hover:bg-[#E97700] text-white rounded-2xl text-[14.5px] font-[800] flex items-center justify-center space-x-2 shadow-[0_4px_16px_rgba(255,138,0,0.25)] active:scale-[0.98] transition-all focus:outline-none"
          >
            <Download size={16} strokeWidth={3} />
            <span>Download PDF Report</span>
          </button>

          {/* Lighter Gray Subtle Footer */}
          <p className="text-center text-[10.5px] font-bold text-neutral-400/60 uppercase tracking-widest mt-5 select-none">
            Generated by Kundli Nova
          </p>
        </div>

      </div>

      {/* PDF Generation Bottom Sheet Modal */}
      <AnimatePresence>
        {pdfModalState !== 'idle' && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              onClick={() => {
                if (pdfModalState === 'ready') setPdfModalState('idle');
              }}
            />

            <motion.div 
              initial={{ y: '100%' }} 
              animate={{ y: 0 }} 
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md mx-auto bg-white rounded-t-3xl p-6 flex flex-col items-center text-center shadow-2xl overflow-hidden z-10"
            >
              <div className="w-12 h-1.5 bg-[#E5E7EB] rounded-full mb-6" />

              {pdfModalState === 'generating' ? (
                <div className="py-6 flex flex-col items-center">
                  <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
                    <div className="absolute inset-0 border-4 border-[#FF8A00]/20 rounded-full" />
                    <div className="absolute inset-0 border-4 border-t-[#FF8A00] rounded-full animate-spin" />
                    <Sparkles size={22} className="text-[#FF8A00] animate-pulse" />
                  </div>

                  <h3 className="text-[17px] font-[850] text-[#111827] tracking-tight">Preparing your Kundli PDF...</h3>
                  <p className="text-[12.5px] font-semibold text-[#6B7280] leading-[1.5] mt-2 max-w-[280px]">
                    Structuring zodiac charts, placing dynamic planetary details, and generating remedies report.
                  </p>
                </div>
              ) : (
                <div className="py-6 flex flex-col items-center w-full">
                  <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-4 border border-emerald-100">
                    <CheckCircle2 size={30} strokeWidth={2.5} />
                  </div>

                  <h3 className="text-[17px] font-[850] text-[#111827] tracking-tight">Your Kundli PDF is ready</h3>
                  <p className="text-[12.5px] font-semibold text-[#6B7280] leading-[1.5] mt-1">
                    Download complete. You can also view or share the file directly.
                  </p>

                  <div className="grid grid-cols-2 gap-3 w-full mt-6">
                    <a 
                      href={pdfUrls?.blobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-12 bg-white border border-[#E5E7EB] text-[#374151] rounded-xl text-[13.5px] font-[800] flex items-center justify-center space-x-1.5 hover:bg-gray-50 active:scale-[0.98] transition-all"
                    >
                      <ExternalLink size={15} strokeWidth={2.5} />
                      <span>Open PDF</span>
                    </a>
                    
                    <button 
                      onClick={() => {
                        if (navigator.share && pdfUrls?.blobUrl) {
                          navigator.share({
                            title: `${birthDetails.name} Janam Kundli`,
                            text: `Personalized Horoscope Report from Kundli Nova`,
                            url: window.location.href
                          }).catch(console.error);
                        } else {
                          // Copy URL to clipboard fallback
                          navigator.clipboard.writeText(pdfUrls?.blobUrl || '').then(() => {
                            alert('PDF link copied to clipboard!');
                          });
                        }
                      }}
                      className="h-12 bg-[#FF8A00] text-white rounded-xl text-[13.5px] font-[800] flex items-center justify-center space-x-1.5 hover:bg-[#E97700] active:scale-[0.98] transition-all"
                    >
                      <Share2 size={15} strokeWidth={2.5} />
                      <span>Share PDF</span>
                    </button>
                  </div>

                  <button 
                    onClick={() => setPdfModalState('idle')}
                    className="mt-4 text-[12.5px] font-[750] text-[#9CA3AF] hover:text-[#4B5563]"
                  >
                    Close Panel
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fullscreen Zoomable/Pinchable Chart Overlay */}
      <AnimatePresence>
        {isFullscreenChartOpen && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md select-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 cursor-zoom-out"
              onClick={() => setIsFullscreenChartOpen(false)}
            />

            {/* Scale controls */}
            <div className="absolute top-6 left-6 z-10 flex items-center space-x-3 text-white">
              <button 
                onClick={() => setIsFullscreenChartOpen(false)}
                className="p-3 bg-white/10 hover:bg-white/20 active:scale-95 rounded-full backdrop-blur-md text-white transition-all focus:outline-none"
              >
                <ArrowLeft size={18} strokeWidth={2.5} />
              </button>
              <span className="text-[14px] font-[800] tracking-tight text-white/90">Lagna Kundli (D1)</span>
            </div>

            <div className="absolute top-6 right-6 z-10 flex items-center space-x-2.5">
              <button 
                onClick={() => setZoomScale(prev => Math.max(0.6, prev - 0.2))}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 active:scale-95 rounded-full flex items-center justify-center text-white text-[20px] font-bold backdrop-blur-md transition-all focus:outline-none"
              >
                －
              </button>
              <button 
                onClick={() => setZoomScale(prev => Math.min(3.0, prev + 0.2))}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 active:scale-95 rounded-full flex items-center justify-center text-white text-[20px] font-bold backdrop-blur-md transition-all focus:outline-none"
              >
                ＋
              </button>
              <button 
                onClick={() => setZoomScale(1.2)}
                className="px-3 h-10 bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl flex items-center justify-center text-white text-[11px] font-bold uppercase tracking-widest backdrop-blur-md transition-all focus:outline-none"
              >
                Reset
              </button>
            </div>

            {/* Double click/tap anywhere or zoom scale indication */}
            <div className="absolute bottom-6 text-white/50 text-[10.5px] font-extrabold uppercase tracking-widest pointer-events-none">
              Zoom: {Math.round(zoomScale * 100)}% • Swipe or Tap outside to close
            </div>

            {/* Pinchable/zoomable container */}
            <motion.div 
              style={{ scale: zoomScale }}
              className="w-[90vw] aspect-square max-w-[450px] bg-[#FFFDF9] border border-[#D97706]/40 rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-10 relative transition-transform duration-200 ease-out"
            >
              <svg className="w-full h-full text-[#B45309]" viewBox="0 0 200 200">
                {/* Outer boundary square */}
                <rect x="0" y="0" width="200" height="200" stroke="currentColor" strokeWidth="1.5" fill="none" />
                
                {/* Diagonals */}
                <line x1="0" y1="0" x2="200" y2="200" stroke="currentColor" strokeWidth="1.5" />
                <line x1="200" y1="0" x2="0" y2="200" stroke="currentColor" strokeWidth="1.5" />

                {/* Inner Diamond lines */}
                <line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="1.2" />
                <line x1="0" y1="100" x2="100" y2="200" stroke="currentColor" strokeWidth="1.2" />
                <line x1="100" y1="200" x2="200" y2="100" stroke="currentColor" strokeWidth="1.2" />
                <line x1="200" y1="100" x2="100" y2="0" stroke="currentColor" strokeWidth="1.2" />

                {/* Dynamic placement of Zodiac sign numbers & Planets for all 12 houses */}
                {/* House 1 */}
                <text x="100" y="48" textAnchor="middle" className="text-[10px] font-[900] fill-[#D97706]">{getZodiacNumberForHouse(1)}</text>
                <text x="100" y="28" textAnchor="middle" className="text-[8.5px] font-[850] fill-[#111827]">{getPlanetsInHouse(1)}</text>

                {/* House 2 */}
                <text x="55" y="30" textAnchor="middle" className="text-[8px] font-extrabold fill-neutral-400">{getZodiacNumberForHouse(2)}</text>
                <text x="45" y="18" textAnchor="middle" className="text-[8.5px] font-[850] fill-[#111827]">{getPlanetsInHouse(2)}</text>

                {/* House 3 */}
                <text x="30" y="55" textAnchor="middle" className="text-[8px] font-extrabold fill-neutral-400">{getZodiacNumberForHouse(3)}</text>
                <text x="18" y="45" textAnchor="middle" className="text-[8.5px] font-[850] fill-[#111827]">{getPlanetsInHouse(3)}</text>

                {/* House 4 */}
                <text x="52" y="108" textAnchor="middle" className="text-[10px] font-[900] fill-[#D97706]">{getZodiacNumberForHouse(4)}</text>
                <text x="34" y="100" textAnchor="middle" className="text-[8.5px] font-[850] fill-[#111827]">{getPlanetsInHouse(4)}</text>

                {/* House 5 */}
                <text x="30" y="145" textAnchor="middle" className="text-[8px] font-extrabold fill-neutral-400">{getZodiacNumberForHouse(5)}</text>
                <text x="18" y="155" textAnchor="middle" className="text-[8.5px] font-[850] fill-[#111827]">{getPlanetsInHouse(5)}</text>

                {/* House 6 */}
                <text x="55" y="170" textAnchor="middle" className="text-[8px] font-extrabold fill-neutral-400">{getZodiacNumberForHouse(6)}</text>
                <text x="45" y="184" textAnchor="middle" className="text-[8.5px] font-[850] fill-[#111827]">{getPlanetsInHouse(6)}</text>

                {/* House 7 */}
                <text x="100" y="148" textAnchor="middle" className="text-[10px] font-[900] fill-[#D97706]">{getZodiacNumberForHouse(7)}</text>
                <text x="100" y="168" textAnchor="middle" className="text-[8.5px] font-[850] fill-[#111827]">{getPlanetsInHouse(7)}</text>

                {/* House 8 */}
                <text x="145" y="170" textAnchor="middle" className="text-[8px] font-extrabold fill-neutral-400">{getZodiacNumberForHouse(8)}</text>
                <text x="155" y="184" textAnchor="middle" className="text-[8.5px] font-[850] fill-[#111827]">{getPlanetsInHouse(8)}</text>

                {/* House 9 */}
                <text x="170" y="145" textAnchor="middle" className="text-[8px] font-extrabold fill-neutral-400">{getZodiacNumberForHouse(9)}</text>
                <text x="184" y="155" textAnchor="middle" className="text-[8.5px] font-[850] fill-[#111827]">{getPlanetsInHouse(9)}</text>

                {/* House 10 */}
                <text x="148" y="108" textAnchor="middle" className="text-[10px] font-[900] fill-[#D97706]">{getZodiacNumberForHouse(10)}</text>
                <text x="166" y="100" textAnchor="middle" className="text-[8.5px] font-[850] fill-[#111827]">{getPlanetsInHouse(10)}</text>

                {/* House 11 */}
                <text x="170" y="55" textAnchor="middle" className="text-[8px] font-extrabold fill-neutral-400">{getZodiacNumberForHouse(11)}</text>
                <text x="184" y="45" textAnchor="middle" className="text-[8.5px] font-[850] fill-[#111827]">{getPlanetsInHouse(11)}</text>

                {/* House 12 */}
                <text x="145" y="30" textAnchor="middle" className="text-[8px] font-extrabold fill-neutral-400">{getZodiacNumberForHouse(12)}</text>
                <text x="155" y="18" textAnchor="middle" className="text-[8.5px] font-[850] fill-[#111827]">{getPlanetsInHouse(12)}</text>
              </svg>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
