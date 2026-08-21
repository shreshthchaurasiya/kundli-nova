import React from 'react';
import { AlertCircle, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';
import { KundliNovaCompatibilityAnalysis, AshtakootaFactor } from '../../server/types/astrologyProvider';
import { KundliProfile } from '../../types';
import {
  getKootaMetadata,
  getCompatibilityCategory,
  buildMatchSummary,
} from '../../features/astrology/compatibilityMetadata';

interface CompatibilityPanelProps {
  apiCompatibilityData: {
    compatibility: KundliNovaCompatibilityAnalysis;
    manglik: import('../../server/types/astrologyProvider').KundliNovaManglikAnalysis;
  } | null;
  loadingCompatibility: boolean;
  compatibilityErrorState: { code: string; message: string } | null;
  selectedProfileId: string;
  selectedProfileBId: string | null;
  profiles: KundliProfile[];
  onSelectProfileB: (profileId: string) => void;
  onRetry: () => void;
  onNavigateToNovaAI?: (profileBId: string, data: any) => void;
  onViewKundli?: (profileId: string) => void;
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
  onRetry,
  onNavigateToNovaAI,
  onViewKundli,
}) => {
  const profileA = profiles.find(p => p.id === selectedProfileId);
  const profileB = profiles.find(p => p.id === selectedProfileBId);

  const getBD = (p: KundliProfile | undefined) => {
    if (!p) return null;
    return (p as any).birthDetails || p;
  };

  const bdA = getBD(profileA);
  const bdB = getBD(profileB);

  return (
    <div className="space-y-4 pb-6">
      {/* Section Header */}
      <div className="text-center max-w-xs mx-auto mb-2">
        <span className="text-[#FF8A00] text-[10.5px] font-[850] uppercase tracking-wider block">
          Kundli Matching Result
        </span>
        <h3 className="text-[17px] font-[850] text-[#111827] tracking-tight mt-0.5">
          Ashtakoota Milan
        </h3>
        <p className="text-[11.5px] text-neutral-400 font-semibold leading-relaxed mt-1">
          Vedic 36-point compatibility system checking 8 traditional factors.
        </p>
      </div>

      {/* Profile A & B Cards */}
      {profileA && profileB && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { profile: profileA, bd: bdA, label: 'You' },
            { profile: profileB, bd: bdB, label: 'Partner' },
          ].map(({ profile, bd, label }) => (
            <div
              key={profile.id}
              className="bg-white border border-[#EBE8E0] rounded-2xl p-3 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col items-center text-center space-y-1.5"
            >
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#FF8A00] to-[#FFB74D] text-white flex items-center justify-center font-[800] text-[18px] shadow-sm">
                {(bd?.name || profile.name || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="text-[8.5px] font-bold text-neutral-400 uppercase tracking-widest block">
                  {label}
                </span>
                <p className="text-[12px] font-[850] text-[#111827] leading-tight truncate max-w-[100px]">
                  {bd?.name || profile.name}
                </p>
                <p className="text-[10px] font-semibold text-neutral-400 mt-0.5">
                  {bd?.dob || ''}
                </p>
              </div>
              {onViewKundli && (
                <button
                  onClick={() => onViewKundli(profile.id)}
                  className="text-[10px] font-[800] text-[#FF8A00] border border-[#F5E6D3] rounded-full px-2.5 py-1 hover:bg-[#FFF9F0] transition-colors"
                >
                  View Kundli
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Loading State */}
      {loadingCompatibility && selectedProfileBId && (
        <div className="bg-white border border-[#EBE8E0] rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#FF8A00]/20 border-t-[#FF8A00] rounded-full animate-spin" />
          <p className="text-[13px] font-[800] text-[#111827]">Calculating Match…</p>
          <p className="text-[11px] text-neutral-400 font-semibold">
            Analysing 36 points across 8 traditional factors.
          </p>
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
          {/* Score Hero */}
          <div className="bg-gradient-to-br from-[#FFFDF9] to-[#FFF9F0] border border-[#F5E6D3] rounded-2xl p-5 shadow-[0_4px_12px_rgba(255,138,0,0.03)] text-center relative overflow-hidden">
            <div className="absolute -right-6 -top-6 text-[#FF8A00] opacity-[0.03] pointer-events-none">
              <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>

            <p className="text-[11px] font-[850] text-neutral-500 uppercase tracking-widest mb-1 relative z-10">
              Total Match Score
            </p>
            <div className="flex items-baseline justify-center space-x-1 relative z-10 mb-2">
              <span className="text-[32px] font-[900] text-[#FF8A00] tracking-tighter leading-none">
                {apiCompatibilityData.compatibility.totalScore.toFixed(1)}
              </span>
              <span className="text-[16px] font-[800] text-neutral-400">
                / {apiCompatibilityData.compatibility.maximumScore}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-[#F5E6D3] rounded-full h-2 mb-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#FFB74D] to-[#FF8A00] h-2 rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(0, apiCompatibilityData.compatibility.compatibilityPercentage)
                  )}%`,
                }}
              />
            </div>

            <p className="text-[12px] font-[800] text-[#111827] relative z-10">
              {apiCompatibilityData.compatibility.compatibilityPercentage.toFixed(0)}% ·{' '}
              {getCompatibilityCategory(apiCompatibilityData.compatibility.totalScore)}
            </p>
          </div>

          {/* Match Summary */}
          {bdA && bdB && (
            <div className="bg-[#FFFDF9] border border-[#F5E6D3] rounded-2xl p-4 space-y-1">
              <p className="text-[10.5px] font-[850] text-[#FF8A00] uppercase tracking-widest">
                Compatibility Summary
              </p>
              <p className="text-[12.5px] font-medium text-neutral-700 leading-relaxed">
                {buildMatchSummary(
                  bdA.name || profileA?.name || 'Profile A',
                  bdB.name || profileB?.name || 'Profile B',
                  apiCompatibilityData.compatibility.totalScore,
                  apiCompatibilityData.compatibility.maximumScore,
                  apiCompatibilityData.compatibility.factors,
                  apiCompatibilityData.manglik.compatibility
                )}
              </p>
            </div>
          )}

          {/* Factor Cards */}
          <div className="space-y-3">
            {apiCompatibilityData.compatibility.factors.map(factor => (
              <CompatibilityFactorCard key={factor.code} factor={factor} />
            ))}
          </div>

          {/* Manglik Analysis */}
          <div className="mt-2">
            <div className="text-center max-w-xs mx-auto mb-3">
              <span className="text-red-500 text-[10.5px] font-[850] uppercase tracking-wider block">
                Dosha Analysis
              </span>
              <h3 className="text-[16px] font-[850] text-[#111827] tracking-tight mt-0.5">
                Manglik Match
              </h3>
            </div>
            <div className="bg-white border border-[#EBE8E0] rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
              <div className="flex justify-between items-center border-b border-[#EBE8E0] pb-3">
                <span className="text-[13px] font-[800] text-[#111827]">Match Status</span>
                <span className="text-[12px] font-[850] text-neutral-500 bg-neutral-50 px-3 py-1 rounded-full border border-neutral-200">
                  {formatManglikValue(apiCompatibilityData.manglik.compatibility)}
                </span>
              </div>

              <p className="text-[11.5px] text-neutral-500 font-medium leading-relaxed">
                Manglik dosha is determined by Mars placement at birth. The impact and severity depend on chart context; consult an astrologer for personalised guidance.
              </p>

              <div className="space-y-3">
                {[
                  {
                    label: bdA?.name || 'Profile A',
                    isManglik: apiCompatibilityData.manglik.profileAManglik,
                    cancellation: apiCompatibilityData.manglik.profileACancellation,
                  },
                  {
                    label: bdB?.name || 'Profile B',
                    isManglik: apiCompatibilityData.manglik.profileBManglik,
                    cancellation: apiCompatibilityData.manglik.profileBCancellation,
                  },
                ].map(({ label, isManglik, cancellation }) => (
                  <div
                    key={label}
                    className="flex justify-between items-center bg-[#FCFBF8] p-3 rounded-xl border border-[#F5E6D3]"
                  >
                    <div>
                      <p className="text-[10.5px] font-[850] text-neutral-400 uppercase tracking-wider mb-0.5">
                        {label}
                      </p>
                      <p className="text-[13px] font-[800] text-[#111827]">
                        {isManglik ? 'Manglik' : 'Non-Manglik'}
                      </p>
                    </div>
                    {cancellation && cancellation !== 'not_evaluated' && (
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-neutral-400 uppercase">
                          Cancellation
                        </p>
                        <p className="text-[11.5px] font-semibold text-neutral-500">
                          {formatManglikValue(cancellation)}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Ask Nova AI Banner */}
          {onNavigateToNovaAI && selectedProfileBId && (
            <div className="mt-4 bg-gradient-to-r from-[#111827] to-[#1F2937] rounded-2xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
              <div className="relative z-10 flex flex-col items-center text-center">
                <span className="text-[10px] font-[850] text-[#FFB74D] uppercase tracking-widest mb-1.5">
                  Deep Analysis
                </span>
                <h4 className="text-[15px] font-[850] text-white tracking-tight leading-snug max-w-[220px]">
                  Ask Nova AI About This Match
                </h4>
                <p className="text-[11.5px] text-neutral-400 font-medium leading-relaxed mt-2 max-w-[260px]">
                  Get detailed insights about this compatibility result, doshas, and astrological synergies.
                </p>
                <button
                  onClick={() => onNavigateToNovaAI(selectedProfileBId, apiCompatibilityData)}
                  className="mt-4 px-6 py-3 bg-[#FF8A00] text-white rounded-full text-[13px] font-[800] shadow-[0_4px_14px_rgba(255,138,0,0.3)] active:scale-95 transition-all w-full flex justify-center items-center hover:bg-[#FF9B26]"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2"
                  >
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                  Chat with Nova AI
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const CompatibilityFactorCard: React.FC<{ factor: AshtakootaFactor }> = ({ factor }) => {
  const isUnavailable = factor.calculationStatus === 'unavailable';
  const scorePercent =
    isUnavailable || factor.maximumScore === 0 ? 0 : (factor.score / factor.maximumScore) * 100;

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

  const meta = getKootaMetadata(factor.name || factor.code);

  return (
    <div className="bg-white border border-[#EBE8E0] rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center space-x-2">
          {indicator}
          <div>
            <h4 className="text-[13.5px] font-[850] text-[#111827] leading-tight">
              {meta.title}
            </h4>
            <p className="text-[10px] font-[700] text-neutral-400 uppercase tracking-wider leading-tight">
              {meta.friendlyLabel}
            </p>
          </div>
        </div>
        <div className={`px-2 py-1 rounded-lg border text-[11.5px] font-[850] leading-none ${colorTheme}`}>
          {isUnavailable ? 'N/A' : `${factor.score} / ${factor.maximumScore}`}
        </div>
      </div>
      <p className="text-[12px] text-neutral-500 font-medium leading-relaxed mt-1">
        {isUnavailable ? 'Calculation unavailable for this factor.' : meta.description}
      </p>
    </div>
  );
};
