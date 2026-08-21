import React from 'react';
import { KundliNovaDetailedReport } from '../../server/types/astrologyProvider';

interface DetailedKundliReportPanelProps {
  report: KundliNovaDetailedReport | null;
  loading: boolean;
  error: any;
  onRetry: () => void;
}

export const DetailedKundliReportPanel: React.FC<DetailedKundliReportPanelProps> = ({
  report,
  loading,
  error,
  onRetry
}) => {
  if (loading) {
    return (
      <div className="bg-white border border-[#EBE8E0] rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3 animate-fadeIn">
        <div className="w-8 h-8 border-2 border-[#FF8A00]/20 border-t-[#FF8A00] rounded-full animate-spin" />
        <p className="text-[13px] font-[800] text-[#111827]">Generating Report...</p>
        <p className="text-[11px] text-neutral-400 font-semibold">Compiling detailed astrological data.</p>
      </div>
    );
  }

  if (error) {
    let title = 'Report Generation Failed';
    let msg = 'There was an error generating your detailed report. Please try again.';
    
    if (error.code === 'DETAILED_REPORT_SERVICE_NOT_CONFIGURED') {
      title = 'Report Unavailable';
      msg = 'The Detailed Kundli Report feature is currently being integrated and is not yet available.';
    }

    return (
      <div className="bg-white border border-red-100 rounded-2xl p-6 text-center animate-fadeIn">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-[15px] font-[850] text-gray-900 mb-1.5">{title}</h3>
        <p className="text-[12px] text-gray-500 mb-4">{msg}</p>
        <button 
          onClick={onRetry}
          className="px-5 py-2 bg-red-50 text-red-600 rounded-xl text-[12px] font-bold hover:bg-red-100 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!report) return null;

  const { availableSections, unavailableSections, reportStatus } = report;

  return (
    <div className="space-y-4 animate-fadeIn pb-6">
      <div className="text-center max-w-xs mx-auto mb-4">
        <span className="text-[#FF8A00] text-[10.5px] font-[850] uppercase tracking-wider block">Astrology Report</span>
        <h3 className="text-[17px] font-[850] text-[#111827] tracking-tight mt-0.5">Detailed Kundli</h3>
        <p className="text-[11.5px] text-neutral-400 font-semibold leading-relaxed mt-1">
          {reportStatus === 'complete' ? 'Complete structural report.' : reportStatus === 'partial' ? 'Partial report available.' : 'Report unavailable.'}
        </p>
        <div className="flex justify-center items-center space-x-2 mt-3">
          <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold">
            {availableSections.length} Available
          </span>
          <span className="text-[10px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full font-bold">
            {unavailableSections.length} Unavailable
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {['BIRTH_SUMMARY', 'ASCENDANT', 'PLANETARY_POSITIONS', 'HOUSE_ANALYSIS', 'NAKSHATRA_ANALYSIS', 'DASHA_SUMMARY', 'DOSHA_SUMMARY', 'YOGA_SUMMARY'].map((code) => {
          const isAvailable = availableSections.includes(code as any);
          
          return (
            <div key={code} className="bg-white border border-[#EBE8E0] rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[13px] font-[800] text-neutral-800">{code.replace(/_/g, ' ')}</h4>
                {!isAvailable && (
                  <span className="text-[10px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full font-bold">
                    UNAVAILABLE
                  </span>
                )}
              </div>
              {isAvailable ? (
                <div className="text-[12px] text-neutral-600">
                  {code === 'BIRTH_SUMMARY' && report.birthSummary && (
                    <div className="space-y-1">
                      <p><span className="font-semibold text-neutral-800">Name:</span> {report.birthSummary.profileName}</p>
                      <p><span className="font-semibold text-neutral-800">Date/Time:</span> {report.birthSummary.dateOfBirth} {report.birthSummary.timeOfBirth}</p>
                      <p><span className="font-semibold text-neutral-800">Place:</span> {report.birthSummary.placeOfBirth}</p>
                    </div>
                  )}
                  {code === 'ASCENDANT' && report.ascendant && (
                    <div className="space-y-1">
                      <p><span className="font-semibold text-neutral-800">Sign:</span> {report.ascendant.sign}</p>
                      <p><span className="font-semibold text-neutral-800">Degree:</span> {report.ascendant.degree}°</p>
                    </div>
                  )}
                  {code === 'PLANETARY_POSITIONS' && report.planetaryPositions && (
                    <div className="space-y-1">
                      <p><span className="font-semibold text-neutral-800">Planets Recorded:</span> {report.planetaryPositions.planets.length}</p>
                    </div>
                  )}
                  {code === 'HOUSE_ANALYSIS' && report.houseAnalysis && (
                    <div className="space-y-1">
                      <p><span className="font-semibold text-neutral-800">Houses Recorded:</span> {report.houseAnalysis.houses.length}</p>
                    </div>
                  )}
                  {code === 'NAKSHATRA_ANALYSIS' && report.nakshatraAnalysis && (
                    <div className="space-y-1">
                      <p><span className="font-semibold text-neutral-800">Nakshatra:</span> {report.nakshatraAnalysis.moonNakshatra}</p>
                      <p><span className="font-semibold text-neutral-800">Lord:</span> {report.nakshatraAnalysis.nakshatraLord}</p>
                    </div>
                  )}
                  {code === 'DASHA_SUMMARY' && report.dashaSummary && (
                    <div className="space-y-1">
                      <p><span className="font-semibold text-neutral-800">Current Mahadasha:</span> {report.dashaSummary.currentMahadasha}</p>
                    </div>
                  )}
                  {code === 'DOSHA_SUMMARY' && report.doshaSummary && (
                    <div className="space-y-1">
                      <p><span className="font-semibold text-neutral-800">Doshas Analyzed:</span> {report.doshaSummary.doshas.length}</p>
                    </div>
                  )}
                  {code === 'YOGA_SUMMARY' && report.yogaSummary && (
                    <div className="space-y-1">
                      <p><span className="font-semibold text-neutral-800">Yogas Analyzed:</span> {report.yogaSummary.yogas.length}</p>
                    </div>
                  )}
                  {((code === 'BIRTH_SUMMARY' && !report.birthSummary) ||
                    (code === 'ASCENDANT' && !report.ascendant) ||
                    (code === 'PLANETARY_POSITIONS' && !report.planetaryPositions) ||
                    (code === 'HOUSE_ANALYSIS' && !report.houseAnalysis) ||
                    (code === 'NAKSHATRA_ANALYSIS' && !report.nakshatraAnalysis) ||
                    (code === 'DASHA_SUMMARY' && !report.dashaSummary) ||
                    (code === 'DOSHA_SUMMARY' && !report.doshaSummary) ||
                    (code === 'YOGA_SUMMARY' && !report.yogaSummary)) && (
                    <p className="italic">Data payload is empty.</p>
                  )}
                </div>
              ) : (
                <div className="bg-neutral-50 rounded-xl p-3 text-[11px] text-neutral-400 font-medium italic text-center">
                  This section is currently unavailable from the calculation provider.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
