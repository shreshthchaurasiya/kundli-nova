import React from 'react';
import { KundliNovaYogaResult } from '../../server/types/astrologyProvider';

interface YogaResultCardProps {
  yoga: KundliNovaYogaResult;
}

export const YogaResultCard: React.FC<YogaResultCardProps> = ({ yoga }) => {
  return (
    <div className="bg-white border border-[#EBE8E0] rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
      <div className="bg-[#FFFDF9] border-b border-[#F5F2EB] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-2.5 h-2.5 rounded-full ${
            yoga.calculationStatus === 'unavailable' ? 'bg-neutral-300' :
            yoga.detected ? 'bg-amber-400' : 'bg-emerald-400'
          }`} />
          <h4 className="text-[12.5px] font-[850] text-[#111827] m-0">{yoga.name}</h4>
        </div>
        <span className={`text-[10px] font-[850] uppercase tracking-widest px-2 py-0.5 rounded-full ${
          yoga.calculationStatus === 'unavailable' ? 'bg-neutral-50 text-neutral-500 border border-neutral-200' :
          yoga.detected ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
        }`}>
          {yoga.calculationStatus === 'unavailable' ? 'Unavailable' :
           yoga.detected ? 'Present' : 'Not Present'}
        </span>
      </div>
      <div className="px-4 py-3">
        {yoga.calculationStatus === 'unavailable' ? (
          <p className="text-[12px] text-neutral-400 font-semibold italic">This Yoga could not be calculated with the current astrology service.</p>
        ) : !yoga.detected ? (
          <p className="text-[12px] text-neutral-500 font-semibold leading-relaxed">Not detected in the available calculation.</p>
        ) : (
          <>
            {yoga.strength && yoga.strength !== 'unknown' && yoga.strength !== 'none' && (
              <p className="text-[11px] text-[#FF8A00] font-bold mb-1 uppercase tracking-wider">Strength: {yoga.strength}</p>
            )}
            <p className="text-[12px] text-neutral-500 font-semibold leading-relaxed">{yoga.summary}</p>
            {yoga.evidence && yoga.evidence.length > 0 && (
              <ul className="mt-2 space-y-1 list-none p-0 m-0">
                {yoga.evidence.map((ev, idx) => (
                  <li key={idx} className="text-[11px] text-neutral-400 font-medium">
                    • {ev.description || `Formed by ${ev.planets.join(', ')} in house ${ev.houses.join(', ')}`}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
};
