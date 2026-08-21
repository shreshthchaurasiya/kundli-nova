import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Sparkles, Compass, Shield, User, Calendar, Clock, MapPin, Info, ListFilter, AlertCircle, FileText, Download, Loader2 } from 'lucide-react';
import { Screen } from '../types';
import { useProfile } from '../contexts/ProfileContext';
import { KundliChart } from '../components/astrology/KundliChart';
import { AstrologyApi } from '../services/api/astrologyApi';
import { generateKundliPdf, KundliPdfPayload } from '../services/kundliPdfService';
import { KundliNovaNatalChart, KundliNovaVimshottariDasha, KundliNovaDoshaAnalysis, KundliNovaYogaAnalysis, KundliNovaDetailedReport } from '../server/types/astrologyProvider';

interface ViewKundliScreenProps {
  onNavigate: (screen: Screen) => void;
}

export default function ViewKundliScreen({ onNavigate }: ViewKundliScreenProps) {
  const { profile, defaultKundliProfile } = useProfile();

  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<KundliNovaNatalChart | null>(null);
  const [dashaData, setDashaData] = useState<KundliNovaVimshottariDasha | null>(null);
  const [doshaData, setDoshaData] = useState<KundliNovaDoshaAnalysis | null>(null);
  const [yogaData, setYogaData] = useState<KundliNovaYogaAnalysis | null>(null);
  const [detailedReport, setDetailedReport] = useState<KundliNovaDetailedReport | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const fullName = profile?.fullName || profile?.name || defaultKundliProfile?.name || 'Guest User';
  const dob = profile?.dob || defaultKundliProfile?.dateOfBirth || 'Not Provided';
  const tob = profile?.tob || profile?.birthTime || defaultKundliProfile?.timeOfBirth || 'Not Provided';
  
  const getBirthPlace = () => {
    const parts = [
      profile?.city || defaultKundliProfile?.placeOfBirth,
      profile?.district,
      profile?.state,
      profile?.country
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Not Provided';
  };
  const birthPlace = getBirthPlace();

  useEffect(() => {
    let isMounted = true;
    const loadKundli = async () => {
      setLoading(true);
      try {
        const profileId = defaultKundliProfile?.id || 'self';
        const [chart, dasha, dosha, yoga, report] = await Promise.all([
          AstrologyApi.getKundli(profileId).catch(() => null),
          AstrologyApi.getDasha(profileId).catch(() => null),
          AstrologyApi.getDoshaAnalysis(profileId).catch(() => null),
          AstrologyApi.getYogaAnalysis(profileId).catch(() => null),
          AstrologyApi.getDetailedKundliReport(profileId).catch(() => null)
        ]);

        if (isMounted) {
          setChartData(chart);
          setDashaData(dasha);
          setDoshaData(dosha);
          setYogaData(yoga);
          setDetailedReport(report);
        }
      } catch (err) {
        console.error('Error loading Kundli details:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadKundli();
    return () => { isMounted = false; };
  }, [defaultKundliProfile]);

  const handleDownloadPdf = async () => {
    if (!chartData) return;
    setIsGeneratingPdf(true);
    try {
      const pdfPayload: KundliPdfPayload = {
        birthDetails: {
          name: fullName,
          gender: profile?.gender || 'Male',
          dob,
          tob,
          city: profile?.city || defaultKundliProfile?.placeOfBirth || 'New Delhi',
          state: profile?.state || 'Delhi'
        },
        chart: chartData,
        dasha: dashaData,
        dosha: doshaData,
        yoga: yogaData,
        detailedReport: detailedReport,
        generatedAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      };

      const pdfResult = await generateKundliPdf(pdfPayload);
      pdfResult.download(`Kundli_Nova_Report_${fullName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const ascendantSign = chartData?.ascendant?.sign || 'Aries';
  const planetsList = chartData?.planets || [];

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
        
        {/* Title & PDF Download Banner */}
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[#FF8A00] text-xs font-[800] tracking-wider uppercase block mb-1">Celestial Blueprint</span>
            <h2 className="text-2xl font-[900] text-neutral-900 tracking-tight leading-none">Janam Kundli Report</h2>
            <p className="text-neutral-500 text-[13.5px] font-medium leading-relaxed mt-2.5">
              Precision calculated based on your birth coordinates and exact planetary alignments.
            </p>
          </div>
        </div>

        {/* Action Button: Download Detailed PDF Report */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleDownloadPdf}
          disabled={loading || isGeneratingPdf || !chartData}
          className="w-full h-[54px] bg-gradient-to-r from-[#FF8A00] to-[#E07A00] text-white font-[800] rounded-2xl text-[14.5px] flex items-center justify-center space-x-2.5 shadow-lg shadow-[#FF8A00]/20 cursor-pointer disabled:opacity-50 transition-all"
        >
          {isGeneratingPdf ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Generating Detailed AI Report...</span>
            </>
          ) : (
            <>
              <Download size={18} />
              <span>Download Detailed AI Report (PDF)</span>
            </>
          )}
        </motion.button>

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

        {/* 2. Interactive North Indian Kundli Chart */}
        <div className="bg-neutral-50/40 border border-neutral-100 rounded-[22px] p-5 flex flex-col items-center relative overflow-hidden">
          <div className="w-full flex items-center justify-between border-b border-neutral-100 pb-3 mb-4">
            <div className="flex items-center space-x-2">
              <Sparkles size={16} className="text-[#FF8A00]" />
              <span className="text-[11.5px] font-[800] text-neutral-400 uppercase tracking-wider">Lagna Kundli (D1 Chart)</span>
            </div>
            <span className="text-[10px] font-[800] text-emerald-600 uppercase tracking-widest bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full">
              Live Chart
            </span>
          </div>

          {/* Authentic Kundli Chart Component with Sign Numbers (1-12) & Planet Badges */}
          {loading ? (
            <div className="w-full aspect-square max-w-[280px] flex flex-col items-center justify-center space-y-2 bg-neutral-50 rounded-2xl border border-neutral-100">
              <Loader2 size={24} className="animate-spin text-[#FF8A00]" />
              <span className="text-xs font-bold text-neutral-400">Calculating planetary houses...</span>
            </div>
          ) : (
            <div className="w-full max-w-[290px]">
              <KundliChart
                style="NORTH"
                ascendantSign={ascendantSign}
                planets={planetsList}
              />
            </div>
          )}

          <div className="mt-4 text-center px-4 max-w-[280px]">
            <p className="text-[12px] text-neutral-500 font-medium leading-relaxed">
              Ascendant: <strong className="text-neutral-900 font-extrabold">{ascendantSign}</strong> • Rashi numbers (1-12) indicate house zodiac signs.
            </p>
          </div>
        </div>

        {/* 3. Planetary Positions Section */}
        <div className="bg-neutral-50/50 border border-neutral-100/80 rounded-[20px] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center space-x-2">
              <Compass size={16} className="text-[#FF8A00]" />
              <span className="text-[11.5px] font-[800] text-neutral-400 uppercase tracking-wider">Planetary Positions (9 Grahas)</span>
            </div>
            <span className="text-[10px] font-bold text-neutral-400 uppercase bg-neutral-100 px-2.5 py-0.5 rounded-full">
              {planetsList.length} Planets
            </span>
          </div>

          {loading ? (
            <div className="py-6 text-center text-xs font-bold text-neutral-400">Loading planetary data...</div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {planetsList.map((p, idx) => (
                <div key={p.name} className={`flex items-center justify-between py-3 ${idx === 0 ? 'pt-1' : ''} ${idx === planetsList.length - 1 ? 'pb-1' : ''}`}>
                  <div className="flex flex-col">
                    <span className="text-[14px] font-bold text-neutral-800">{p.name}</span>
                    <span className="text-[11px] text-neutral-400 font-semibold">{p.zodiac} • House {p.house}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-[12px] font-bold text-neutral-700 bg-white border border-neutral-200/80 px-2.5 py-1 rounded-lg">
                      {p.degree ? `${p.degree}°` : 'Direct'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Vimshottari Dasha Section */}
        <div className="bg-neutral-50/50 border border-neutral-100/80 rounded-[20px] p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-neutral-100 pb-3">
            <Clock size={16} className="text-[#FF8A00]" />
            <span className="text-[11.5px] font-[800] text-neutral-400 uppercase tracking-wider">Vimshottari Dasha Status</span>
          </div>
          
          {loading ? (
            <div className="py-4 text-center text-xs font-bold text-neutral-400">Calculating Dasha timelines...</div>
          ) : dashaData ? (
            <div className="space-y-3">
              <div className="bg-white border border-neutral-100 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Current Mahadasha</span>
                  <span className="text-base font-black text-[#FF8A00]">{dashaData.currentMahadasha.planet}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Ends On</span>
                  <span className="text-xs font-bold text-neutral-800">{new Date(dashaData.currentMahadasha.endDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
              {dashaData.currentAntardasha && (
                <div className="bg-white border border-neutral-100 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Active Antardasha</span>
                    <span className="text-base font-black text-neutral-800">{dashaData.currentAntardasha.planet}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-2.5 text-center flex flex-col items-center justify-center">
              <Info size={18} className="text-neutral-400 mb-1" />
              <p className="text-[12px] text-neutral-500 font-medium">Dasha timeline active in full PDF report.</p>
            </div>
          )}
        </div>

        {/* 5. Dosha & Yogas Section */}
        <div className="bg-neutral-50/50 border border-neutral-100/80 rounded-[20px] p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-neutral-100 pb-3">
            <Sparkles size={16} className="text-[#FF8A00]" />
            <span className="text-[11.5px] font-[800] text-neutral-400 uppercase tracking-wider">Dosha & Yoga Highlights</span>
          </div>
          
          {loading ? (
            <div className="py-4 text-center text-xs font-bold text-neutral-400">Analyzing planetary yogas...</div>
          ) : (
            <div className="space-y-2">
              {doshaData?.results.map(d => (
                <div key={d.name} className="flex items-center justify-between bg-white border border-neutral-100 rounded-xl p-3">
                  <span className="text-xs font-bold text-neutral-800">{d.name}</span>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${d.detected ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
                    {d.detected ? 'Present' : 'Not Present'}
                  </span>
                </div>
              ))}
            </div>
          )}
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
