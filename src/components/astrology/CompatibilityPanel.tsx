import React from 'react';
import { AlertCircle, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';
import { KundliNovaCompatibilityAnalysis, AshtakootaFactor } from '../../server/types/astrologyProvider';
import { KundliProfile } from '../../types';

interface CompatibilityPanelProps {
  apiCompatibilityData: { compatibility: KundliNovaCompatibilityAnalysis; manglik: import('../../server/types/astrologyProvider').KundliNovaManglikAnalysis } | null;
  loadingCompatibility: boolean;
  compatibilityErrorState: { code: string; message: string } | null;
  selectedProfileId: string;
  selectedProfileBId: string | null;
  profiles: KundliProfile[];
  onSelectProfileB: (profileId: string) => void;
  onRetry: () => void;
}

const formatManglikValue = (val: string) => {
  if (!val) return 'Unknown';
  if (val === 'both_manglik') return 'Both profiles are Manglik';
  if (val === 'neither_manglik') return 'Neither profile is Manglik';
  if (val === 'manglik_non_manglik') return 'Manglik status differs';
  if (val === 'not_evaluated') return 'Not evaluated';
  return val.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

export const CompatibilityPanel: React.FC<CompatibilityPanelProps> = ({
  apiCompatibilityData,
  loadingCompatibility,
  compatibilityErrorState,
  selectedProfileId,
  selectedProfileBId,
  profiles,
  onSelectProfileB,
  onRetry
}) => {
  // Filter out the primary profile so user can't select themselves
  const availableProfilesForB = profiles.filter(p => p.id !== selectedProfileId);

  return (
    <div className="space-y-4 animate-fadeIn pb-6">
      <div className="text-center max-w-xs mx-auto mb-2">
        <span className="text-[#FF8A00] text-[10.5px] font-[850] uppercase tracking-wider block">Astrology Match</span>
        <h3 className="text-[17px] font-[850] text-[#111827] tracking-tight mt-0.5">Ashtakoota Milan</h3>
        <p className="text-[11.5px] text-neutral-400 font-semibold leading-relaxed mt-1">
          Vedic 36-point compatibility system checking 8 traditional factors.
        </p>
      </div>

      {/* Profile B Selection */}
      <div className="bg-white border border-[#EBE8E0] rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
        <label htmlFor="partner-profile-select" className="block text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Select Partner Profile</label>
        {availableProfilesForB.length === 0 ? (
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-[12px] text-orange-700 font-semibold text-center">
            You need to create another profile to check compatibility.
          </div>
        ) : (
          <div className="relative">
            <select
              id="partner-profile-select"
              className="w-full appearance-none bg-[#FCFBF8] border border-[#EBE8E0] text-[14px] font-[800] text-[#111827] rounded-xl px-4 py-3 outline-none focus:border-[#FF8A00] transition-colors"
              value={selectedProfileBId || ''}
              onChange={(e) => onSelectProfileB(e.target.value)}
            >
              <option value="" disabled>Select a profile...</option>
              {availableProfilesForB.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-neutral-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loadingCompatibility && selectedProfileBId && (
        <div className="bg-white border border-[#EBE8E0] rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#FF8A00]/20 border-t-[#FF8A00] rounded-full animate-spin" />
          <p className="text-[13px] font-[800] text-[#111827]">Calculating Match...</p>
          <p className="text-[11px] text-neutral-400 font-semibold">Analyzing 36 points of compatibility.</p>
        </div>
      )}

      {/* Error State */}
      {!loadingCompatibility && compatibilityErrorState && (
        <div className="bg-white border border-red-100 rounded-2xl p-6 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-3">
            <AlertCircle size={24} className="text-red-500" />
          </div>
          <h4 className="text-[14px] font-[850] text-[#111827] mb-1">Calculation Failed</h4>
          <p className="text-[12px] text-neutral-500 font-medium leading-relaxed mb-4">
            {compatibilityErrorState.message}
          </p>
          <button 
            onClick={onRetry}
            className="flex items-center space-x-1.5 px-4 py-2 bg-red-50 text-red-600 rounded-full text-[12px] font-[800] active:scale-95 transition-transform"
          >
            <RefreshCw size={14} />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Success State */}
      {!loadingCompatibility && !compatibilityErrorState && apiCompatibilityData && (
        <>
          {/* Total Score Summary */}
          <div className="bg-gradient-to-br from-[#FFFDF9] to-[#FFF9F0] border border-[#F5E6D3] rounded-2xl p-5 shadow-[0_4px_12px_rgba(255,138,0,0.03)] text-center relative overflow-hidden">
            <div className="absolute -right-6 -top-6 text-[#FF8A00] opacity-[0.03] pointer-events-none">
              <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            
            <p className="text-[11px] font-[850] text-neutral-500 uppercase tracking-widest mb-1 relative z-10">Total Match Score</p>
            <div className="flex items-baseline justify-center space-x-1 relative z-10 mb-2">
              <span className="text-[32px] font-[900] text-[#FF8A00] tracking-tighter leading-none">{apiCompatibilityData.compatibility.totalScore.toFixed(1)}</span>
              <span className="text-[16px] font-[800] text-neutral-400">/ {apiCompatibilityData.compatibility.maximumScore}</span>
            </div>
            
            <div className="w-full bg-[#F5E6D3] rounded-full h-2 mb-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#FFB74D] to-[#FF8A00] h-2 rounded-full" 
                style={{ width: `${Math.min(100, Math.max(0, apiCompatibilityData.compatibility.compatibilityPercentage))}%` }}
              />
            </div>
            <p className="text-[12px] font-[800] text-[#111827]">
              {apiCompatibilityData.compatibility.compatibilityPercentage.toFixed(0)}% Compatibility
            </p>
          </div>

          {/* Factor Cards */}
          <div className="space-y-3">
            {apiCompatibilityData.compatibility.factors.map(factor => (
              <CompatibilityFactorCard key={factor.code} factor={factor} />
            ))}
          </div>

          {/* Disclaimer */}
          <div className="bg-[#FFFDF9] border border-[#F5E6D3] rounded-xl px-4 py-3 mt-4">
            <p className="text-[10.5px] text-neutral-400 font-semibold leading-relaxed text-center">
              Ashtakoota milan is a traditional mathematical calculation. This score alone does not guarantee or deny marriage success, which depends on personal understanding.
            </p>
          </div>

          {/* Manglik Section */}
          <div className="mt-6">
            <div className="text-center max-w-xs mx-auto mb-3">
              <span className="text-red-500 text-[10.5px] font-[850] uppercase tracking-wider block">Dosha Analysis</span>
              <h3 className="text-[16px] font-[850] text-[#111827] tracking-tight mt-0.5">Manglik Match</h3>
            </div>
            <div className="bg-white border border-[#EBE8E0] rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
              
              <div className="flex justify-between items-center border-b border-[#EBE8E0] pb-3">
                <span className="text-[13px] font-[800] text-[#111827]">Match Status</span>
                <span className="text-[12px] font-[850] text-neutral-500 bg-neutral-50 px-3 py-1 rounded-full border border-neutral-200">
                  {formatManglikValue(apiCompatibilityData.manglik.compatibility)}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center bg-[#FCFBF8] p-3 rounded-xl border border-[#F5E6D3]">
                  <div>
                    <p className="text-[10.5px] font-[850] text-neutral-400 uppercase tracking-wider mb-0.5">Profile A</p>
                    <p className="text-[13px] font-[800] text-[#111827]">
                      {apiCompatibilityData.manglik.profileAManglik ? 'Manglik' : 'Non-Manglik'}
                    </p>
                  </div>
                  {apiCompatibilityData.manglik.profileACancellation && apiCompatibilityData.manglik.profileACancellation !== 'not_evaluated' && (
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-neutral-400 uppercase">Cancellation</p>
                      <p className="text-[11.5px] font-semibold text-neutral-500">{formatManglikValue(apiCompatibilityData.manglik.profileACancellation)}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center bg-[#FCFBF8] p-3 rounded-xl border border-[#F5E6D3]">
                  <div>
                    <p className="text-[10.5px] font-[850] text-neutral-400 uppercase tracking-wider mb-0.5">Profile B</p>
                    <p className="text-[13px] font-[800] text-[#111827]">
                      {apiCompatibilityData.manglik.profileBManglik ? 'Manglik' : 'Non-Manglik'}
                    </p>
                  </div>
                  {apiCompatibilityData.manglik.profileBCancellation && apiCompatibilityData.manglik.profileBCancellation !== 'not_evaluated' && (
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-neutral-400 uppercase">Cancellation</p>
                      <p className="text-[11.5px] font-semibold text-neutral-500">{formatManglikValue(apiCompatibilityData.manglik.profileBCancellation)}</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </>
      )}
      
      {!loadingCompatibility && !compatibilityErrorState && !apiCompatibilityData && selectedProfileBId && (
        <div className="text-center py-6">
          <p className="text-[13px] text-neutral-400 font-semibold">Please select a partner profile to begin calculation.</p>
        </div>
      )}
    </div>
  );
};

const CompatibilityFactorCard: React.FC<{ factor: AshtakootaFactor }> = ({ factor }) => {
  const isUnavailable = factor.calculationStatus === 'unavailable';
  const scorePercent = isUnavailable || factor.maximumScore === 0 ? 0 : (factor.score / factor.maximumScore) * 100;
  
  // Colors based on score ratio
  let colorTheme = 'text-emerald-600 bg-emerald-50 border-emerald-100';
  let indicator = <CheckCircle2 size={14} className="text-emerald-500" />;
  
  if (isUnavailable) {
    colorTheme = 'text-neutral-500 bg-neutral-50 border-neutral-200';
    indicator = <ShieldAlert size={14} className="text-neutral-400" />;
  } else if (scorePercent < 40) {
    colorTheme = 'text-red-600 bg-red-50 border-red-100';
    indicator = <AlertCircle size={14} className="text-red-500" />;
  } else if (scorePercent < 75) {
    colorTheme = 'text-amber-600 bg-amber-50 border-amber-100';
    indicator = <AlertCircle size={14} className="text-amber-500" />;
  }

  return (
    <div className="bg-white border border-[#EBE8E0] rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          {indicator}
          <h4 className="text-[13.5px] font-[850] text-[#111827]">{factor.name}</h4>
        </div>
        <div className={`px-2 py-1 rounded-lg border text-[11.5px] font-[850] leading-none ${colorTheme}`}>
          {isUnavailable ? 'N/A' : `${factor.score} / ${factor.maximumScore}`}
        </div>
      </div>
      <p className="text-[12px] text-neutral-500 font-medium leading-relaxed">
        {isUnavailable ? 'Calculation unavailable for this factor.' : factor.summary}
      </p>
    </div>
  );
};
