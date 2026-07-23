import React from 'react';
import { Sparkles, Download, Compass } from 'lucide-react';
import { KundliPdfPayload } from '../services/kundliPdfService';

interface KundliPreviewMessageProps {
  data: KundliPdfPayload;
  onViewComplete: () => void;
  onDownloadPdf: () => void;
}

export default function KundliPreviewMessage({ data, onViewComplete, onDownloadPdf }: KundliPreviewMessageProps) {
  const { birthDetails, chart } = data;

  // Astrological helper functions for dynamic North Indian Chart drawing
  const getLagnaZodiacNumber = (): number => {
    if (!chart?.ascendant?.sign) return 1;
    const lagnaLower = chart.ascendant.sign.toLowerCase();
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
    if (!chart?.planets) {
      // Fallback if not loaded
      if (houseNum === 1) return 'Lg';
      return '';
    }

    const abbreviations: { [key: string]: string } = {
      'Sun': 'Su',
      'Moon': 'Mo',
      'Mars': 'Ma',
      'Mercury': 'Me',
      'Jupiter': 'Ju',
      'Venus': 'Ve',
      'Saturn': 'Sa',
      'Rahu': 'Ra',
      'Ketu': 'Ke'
    };

    const found = chart.planets
      .filter(p => p.house === houseNum)
      .map(p => abbreviations[p.name] || p.name.substring(0, 2));

    if (houseNum === 1) {
      found.unshift('Lg');
    }

    return found.length > 0 ? found.join(', ') : '';
  };

  return (
    <div className="w-full max-w-sm sm:max-w-md bg-white border-2 border-[#FFE0B2] rounded-[24px] overflow-hidden shadow-[0_4px_24px_rgba(255,138,0,0.05)] my-3 animate-fadeIn">
      {/* Brand Header with saffron gradient */}
      <div className="bg-gradient-to-r from-[#FFFDF9] to-[#FFF5E6] border-b border-[#FFE0B2] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-[30px] h-[30px] rounded-full bg-[#FF8A00]/10 flex items-center justify-center text-[#FF8A00] border border-[#FFE0B2]">
            <Sparkles size={14} className="fill-[#FF8A00] text-[#FF8A00]" />
          </div>
          <div>
            <span className="text-[13px] font-[900] text-[#111827] tracking-tight block">
              {birthDetails.name}’s Janam Kundli
            </span>
            <span className="text-[9px] font-bold text-[#FF8A00] tracking-wider uppercase block -mt-0.5">Vedic D1 Chart</span>
          </div>
        </div>
        <span className="text-[8.5px] font-extrabold text-[#10B981] bg-[#10B981]/8 px-2 py-0.5 rounded-md border border-[#A7F3D0]/60 uppercase tracking-widest">
          Verified
        </span>
      </div>

      {/* Birth Details Parameters Grid */}
      <div className="px-4.5 py-3.5 bg-white border-b border-[#F5F2EB]">
        <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-[11.5px] font-semibold text-neutral-600">
          <div>
            <span className="text-neutral-400 text-[9px] block font-extrabold uppercase tracking-widest">Date of Birth</span>
            <span className="text-[#111827] font-extrabold mt-0.5 block">{birthDetails.dob}</span>
          </div>
          <div>
            <span className="text-neutral-400 text-[9px] block font-extrabold uppercase tracking-widest">Time of Birth</span>
            <span className="text-[#111827] font-extrabold mt-0.5 block">{birthDetails.tob}</span>
          </div>
          <div className="col-span-2">
            <span className="text-neutral-400 text-[9px] block font-extrabold uppercase tracking-widest">Place of Birth</span>
            <span className="text-[#111827] font-extrabold mt-0.5 block truncate">
              {birthDetails.city}, {birthDetails.state}
            </span>
          </div>
        </div>
      </div>

      {/* Saffron-line high quality dynamic chart preview */}
      <div className="p-4 bg-[#FCFBF8] flex flex-col items-center border-b border-[#F5F2EB]">
        <div className="relative w-[180px] h-[180px] bg-[#FFFDF9] border-2 border-[#D97706] rounded-xl p-1 shadow-[0_2px_10px_rgba(217,119,6,0.03)] select-none">
          <svg className="w-full h-full text-[#B45309]" viewBox="0 0 200 200">
            {/* Outer square */}
            <rect x="0" y="0" width="200" height="200" stroke="currentColor" strokeWidth="1.2" fill="none" />
            
            {/* Diagonals */}
            <line x1="0" y1="0" x2="200" y2="200" stroke="currentColor" strokeWidth="1.2" />
            <line x1="200" y1="0" x2="0" y2="200" stroke="currentColor" strokeWidth="1.2" />

            {/* Inner Diamond */}
            <line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="1" />
            <line x1="0" y1="100" x2="100" y2="200" stroke="currentColor" strokeWidth="1" />
            <line x1="100" y1="200" x2="200" y2="100" stroke="currentColor" strokeWidth="1" />
            <line x1="200" y1="100" x2="100" y2="0" stroke="currentColor" strokeWidth="1" />

            {/* Dynamic placements inside preview card */}
            {/* House 1: Lagna House */}
            <text x="100" y="48" textAnchor="middle" className="text-[9.5px] font-[900] fill-[#D97706]">{getZodiacNumberForHouse(1)}</text>
            <text x="100" y="28" textAnchor="middle" className="text-[8px] font-extrabold fill-[#111827]">{getPlanetsInHouse(1)}</text>

            {/* House 2: Top Left */}
            <text x="55" y="30" textAnchor="middle" className="text-[8px] font-extrabold fill-neutral-400">{getZodiacNumberForHouse(2)}</text>
            <text x="45" y="18" textAnchor="middle" className="text-[8px] font-extrabold fill-[#111827]">{getPlanetsInHouse(2)}</text>

            {/* House 3: Left Top */}
            <text x="30" y="55" textAnchor="middle" className="text-[8px] font-extrabold fill-neutral-400">{getZodiacNumberForHouse(3)}</text>
            <text x="18" y="45" textAnchor="middle" className="text-[8px] font-extrabold fill-[#111827]">{getPlanetsInHouse(3)}</text>

            {/* House 4: Left Center */}
            <text x="52" y="108" textAnchor="middle" className="text-[9.5px] font-[900] fill-[#D97706]">{getZodiacNumberForHouse(4)}</text>
            <text x="34" y="100" textAnchor="middle" className="text-[8px] font-extrabold fill-[#111827]">{getPlanetsInHouse(4)}</text>

            {/* House 5: Left Bottom */}
            <text x="30" y="145" textAnchor="middle" className="text-[8px] font-extrabold fill-neutral-400">{getZodiacNumberForHouse(5)}</text>
            <text x="18" y="155" textAnchor="middle" className="text-[8px] font-extrabold fill-[#111827]">{getPlanetsInHouse(5)}</text>

            {/* House 6: Bottom Left */}
            <text x="55" y="170" textAnchor="middle" className="text-[8px] font-extrabold fill-neutral-400">{getZodiacNumberForHouse(6)}</text>
            <text x="45" y="184" textAnchor="middle" className="text-[8px] font-extrabold fill-[#111827]">{getPlanetsInHouse(6)}</text>

            {/* House 7: Bottom Center */}
            <text x="100" y="148" textAnchor="middle" className="text-[9.5px] font-[900] fill-[#D97706]">{getZodiacNumberForHouse(7)}</text>
            <text x="100" y="168" textAnchor="middle" className="text-[8px] font-extrabold fill-[#111827]">{getPlanetsInHouse(7)}</text>

            {/* House 8: Bottom Right */}
            <text x="145" y="170" textAnchor="middle" className="text-[8px] font-extrabold fill-neutral-400">{getZodiacNumberForHouse(8)}</text>
            <text x="155" y="184" textAnchor="middle" className="text-[8px] font-extrabold fill-[#111827]">{getPlanetsInHouse(8)}</text>

            {/* House 9: Right Bottom */}
            <text x="170" y="145" textAnchor="middle" className="text-[8px] font-extrabold fill-neutral-400">{getZodiacNumberForHouse(9)}</text>
            <text x="184" y="155" textAnchor="middle" className="text-[8px] font-extrabold fill-[#111827]">{getPlanetsInHouse(9)}</text>

            {/* House 10: Right Center */}
            <text x="148" y="108" textAnchor="middle" className="text-[9.5px] font-[900] fill-[#D97706]">{getZodiacNumberForHouse(10)}</text>
            <text x="166" y="100" textAnchor="middle" className="text-[8px] font-extrabold fill-[#111827]">{getPlanetsInHouse(10)}</text>

            {/* House 11: Right Top */}
            <text x="170" y="55" textAnchor="middle" className="text-[8px] font-extrabold fill-neutral-400">{getZodiacNumberForHouse(11)}</text>
            <text x="184" y="45" textAnchor="middle" className="text-[8px] font-extrabold fill-[#111827]">{getPlanetsInHouse(11)}</text>

            {/* House 12: Top Right */}
            <text x="145" y="30" textAnchor="middle" className="text-[8px] font-extrabold fill-neutral-400">{getZodiacNumberForHouse(12)}</text>
            <text x="155" y="18" textAnchor="middle" className="text-[8px] font-extrabold fill-[#111827]">{getPlanetsInHouse(12)}</text>
          </svg>
        </div>

        {/* Major Planetary Quick Signs */}
        <div className="w-full mt-3.5 grid grid-cols-3 gap-2 text-center">
          <div className="bg-white border border-[#EBE8E0] px-1 py-1.5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
            <span className="text-[8px] font-bold text-neutral-400 block uppercase tracking-wider">Lagna</span>
            <span className="text-[10px] font-extrabold text-[#111827] truncate block mt-0.5">{chart?.ascendant?.sign ? chart.ascendant.sign.split(' ')[0] : 'N/A'}</span>
          </div>
          <div className="bg-white border border-[#EBE8E0] px-1 py-1.5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
            <span className="text-[8px] font-bold text-neutral-400 block uppercase tracking-wider">Rashi</span>
            <span className="text-[10px] font-extrabold text-[#111827] truncate block mt-0.5">{chart?.moonSign ? chart.moonSign.split(' ')[0] : 'N/A'}</span>
          </div>
          <div className="bg-white border border-[#EBE8E0] px-1 py-1.5 rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
            <span className="text-[8px] font-bold text-neutral-400 block uppercase tracking-wider">Nakshatra</span>
            <span className="text-[10px] font-extrabold text-[#111827] truncate block mt-0.5">{chart?.nakshatra || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Actions layout with beautiful buttons */}
      <div className="p-3 bg-white flex flex-col sm:flex-row gap-2">
        <button 
          onClick={onViewComplete}
          className="flex-1 h-[40px] bg-[#FF8A00] text-white rounded-xl text-[12.5px] font-[800] flex items-center justify-center space-x-1.5 hover:bg-[#E97700] active:scale-[0.98] transition-all shadow-[0_2px_8px_rgba(255,138,0,0.2)] focus:outline-none"
        >
          <Compass size={14} strokeWidth={2.5} />
          <span>Open Full Kundli</span>
        </button>
        <button 
          onClick={onDownloadPdf}
          className="flex-1 h-[40px] bg-white border border-[#EBE8E0] text-neutral-600 rounded-xl text-[12.5px] font-[800] flex items-center justify-center space-x-1.5 hover:bg-neutral-50 active:scale-[0.98] transition-all focus:outline-none"
        >
          <Download size={14} strokeWidth={2.5} />
          <span>Get PDF</span>
        </button>
      </div>
    </div>
  );
}
