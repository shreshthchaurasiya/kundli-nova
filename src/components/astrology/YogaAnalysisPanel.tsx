import React from 'react';
import { KundliNovaYogaAnalysis } from '../../server/types/astrologyProvider';
import { YogaResultCard } from './YogaResultCard';
import { AstrologyApi } from '../../services/api/astrologyApi';

interface YogaAnalysisPanelProps {
  apiYogaData: KundliNovaYogaAnalysis | null;
  loadingYoga: boolean;
  yogaErrorState: { code: string; message: string } | null;
  selectedProfileId: string;
  onRetry: () => void;
}

const SUPPORTED_YOGAS = [
  'GAJ_KESARI_YOGA',
  'BUDHA_ADITYA_YOGA',
  'DHAN_YOGA',
  'RAJ_YOGA',
  'NEECH_BHANG_RAJ_YOGA'
];

export const YogaAnalysisPanel: React.FC<YogaAnalysisPanelProps> = ({
  apiYogaData,
  loadingYoga,
  yogaErrorState,
  onRetry
}) => {
  return (
    <div className="space-y-4 animate-fadeIn" role="region" aria-live="polite">
      <div className="text-center max-w-xs mx-auto mb-1">
        <span className="text-[#FF8A00] text-[10.5px] font-[850] uppercase tracking-wider block">Vedic Yoga Check</span>
        <h3 className="text-[17px] font-[850] text-[#111827] tracking-tight mt-0.5">Yoga Analysis</h3>
        <p className="text-[11.5px] text-neutral-400 font-semibold leading-relaxed mt-1">
          Factual assessment of planetary Yoga configurations in your birth chart.
        </p>
      </div>

      {loadingYoga ? (
        <div className="flex flex-col items-center justify-center py-10 space-y-3" aria-busy="true" aria-label="Loading Yoga configurations">
          <div className="w-8 h-8 border-4 border-[#FF8A00]/20 border-t-[#FF8A00] rounded-full animate-spin" />
          <span className="text-[12.5px] text-neutral-500 font-bold">Analyzing Yoga configurations...</span>
        </div>
      ) : yogaErrorState ? (
        <div className="bg-[#FEF2F2] border-2 border-[#FECACA] rounded-2xl p-4.5 text-center flex flex-col items-center shadow-[0_4px_16px_rgba(239,68,68,0.03)]" role="alert">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mb-3">
            <span className="text-red-500 font-bold" aria-hidden="true">!</span>
          </div>
          <h4 className="text-[14px] font-[900] text-[#111827] mb-1">Analysis Failed</h4>
          <p className="text-[12.5px] text-neutral-500 font-semibold leading-relaxed mb-4 max-w-[250px]">
            {yogaErrorState.message}
          </p>
          <button
            onClick={onRetry}
            aria-label="Retry Yoga analysis"
            className="px-6 py-2 bg-[#111827] hover:bg-[#1F2937] text-white text-[12.5px] font-[850] rounded-full transition-all active:scale-[0.98]"
          >
            Try Again
          </button>
        </div>
      ) : apiYogaData ? (
        <div className="space-y-3">
          {SUPPORTED_YOGAS.map((code) => {
            const yoga = apiYogaData.results.find((r) => r.code === code);
            if (!yoga) return null;
            return <YogaResultCard key={yoga.code} yoga={yoga} />;
          })}

          <div className="bg-[#FFFDF9] border border-[#F5E6D3] rounded-xl px-4 py-3 mt-2">
            <p className="text-[10.5px] text-neutral-400 font-semibold leading-relaxed">
              Yoga analysis is derived from planetary positions in the birth chart. This is a factual assessment based on classical Vedic rules.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};
