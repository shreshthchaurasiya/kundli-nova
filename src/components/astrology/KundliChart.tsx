import React from 'react';

export type ChartStyle = 'NORTH' | 'SOUTH' | 'GRID';

interface PlanetInfo {
  name: string;
  zodiac: string;
  degree: number;
  house: number;
}

interface KundliChartProps {
  style?: ChartStyle;
  ascendantSign: string;
  planets: PlanetInfo[];
  className?: string;
  onZoom?: () => void;
}

export function KundliChart({ style = 'NORTH', ascendantSign, planets, className = '', onZoom }: KundliChartProps) {
  // Astrological helper functions for North Indian Chart
  const getLagnaZodiacNumber = (): number => {
    const lagnaLower = ascendantSign.toLowerCase();
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

    const found = planets
      .filter(p => p.house === houseNum)
      .map(p => abbreviations[p.name] || p.name.substring(0, 2));

    if (houseNum === 1) {
      found.unshift('Lg');
    }

    return found.length > 0 ? found.join(', ') : '';
  };

  // Currently only NORTH style is implemented
  return (
    <div 
      onClick={onZoom}
      className={`w-full aspect-square bg-[#FFFDF9] border-2 border-[#D97706] rounded-2xl p-3.5 shadow-[0_6px_24px_rgba(217,119,6,0.06)] relative select-none ${onZoom ? 'cursor-zoom-in hover:scale-[1.01] active:scale-[0.99] transition-all' : ''} ${className}`}
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
        {/* House 1: Lagna House (Top Central Diamond) */}
        <text data-testid="house-sign-1" x="100" y="48" textAnchor="middle" className="text-[10px] font-[900] fill-[#D97706]">{getZodiacNumberForHouse(1)}</text>
        <text data-testid="house-planets-1" x="100" y="28" textAnchor="middle" className="text-[8.5px] font-[850] fill-[#111827]">{getPlanetsInHouse(1)}</text>

        {/* House 2: Upper Left corner */}
        <text data-testid="house-sign-2" x="55" y="30" textAnchor="middle" className="text-[8px] font-extrabold fill-neutral-400">{getZodiacNumberForHouse(2)}</text>
        <text data-testid="house-planets-2" x="45" y="18" textAnchor="middle" className="text-[8.5px] font-[850] fill-[#111827]">{getPlanetsInHouse(2)}</text>

        {/* House 3: Left Upper corner */}
        <text data-testid="house-sign-3" x="30" y="55" textAnchor="middle" className="text-[8px] font-extrabold fill-neutral-400">{getZodiacNumberForHouse(3)}</text>
        <text data-testid="house-planets-3" x="18" y="45" textAnchor="middle" className="text-[8.5px] font-[850] fill-[#111827]">{getPlanetsInHouse(3)}</text>

        {/* House 4: Left Central Diamond */}
        <text data-testid="house-sign-4" x="48" y="100" textAnchor="middle" className="text-[10px] font-[900] fill-[#D97706]">{getZodiacNumberForHouse(4)}</text>
        <text data-testid="house-planets-4" x="28" y="100" textAnchor="middle" className="text-[8.5px] font-[850] fill-[#111827]">{getPlanetsInHouse(4)}</text>

        {/* House 5: Left Lower corner */}
        <text data-testid="house-sign-5" x="30" y="150" textAnchor="middle" className="text-[8px] font-extrabold fill-neutral-400">{getZodiacNumberForHouse(5)}</text>
        <text data-testid="house-planets-5" x="18" y="160" textAnchor="middle" className="text-[8.5px] font-[850] fill-[#111827]">{getPlanetsInHouse(5)}</text>

        {/* House 6: Lower Left corner */}
        <text data-testid="house-sign-6" x="55" y="175" textAnchor="middle" className="text-[8px] font-extrabold fill-neutral-400">{getZodiacNumberForHouse(6)}</text>
        <text data-testid="house-planets-6" x="45" y="188" textAnchor="middle" className="text-[8.5px] font-[850] fill-[#111827]">{getPlanetsInHouse(6)}</text>

        {/* House 7: Bottom Central Diamond */}
        <text data-testid="house-sign-7" x="100" y="158" textAnchor="middle" className="text-[10px] font-[900] fill-[#D97706]">{getZodiacNumberForHouse(7)}</text>
        <text data-testid="house-planets-7" x="100" y="178" textAnchor="middle" className="text-[8.5px] font-[850] fill-[#111827]">{getPlanetsInHouse(7)}</text>

        {/* House 8: Lower Right corner */}
        <text data-testid="house-sign-8" x="145" y="175" textAnchor="middle" className="text-[8px] font-extrabold fill-neutral-400">{getZodiacNumberForHouse(8)}</text>
        <text data-testid="house-planets-8" x="155" y="188" textAnchor="middle" className="text-[8.5px] font-[850] fill-[#111827]">{getPlanetsInHouse(8)}</text>

        {/* House 9: Right Lower corner */}
        <text data-testid="house-sign-9" x="170" y="150" textAnchor="middle" className="text-[8px] font-extrabold fill-neutral-400">{getZodiacNumberForHouse(9)}</text>
        <text data-testid="house-planets-9" x="182" y="160" textAnchor="middle" className="text-[8.5px] font-[850] fill-[#111827]">{getPlanetsInHouse(9)}</text>

        {/* House 10: Right Central Diamond */}
        <text data-testid="house-sign-10" x="152" y="100" textAnchor="middle" className="text-[10px] font-[900] fill-[#D97706]">{getZodiacNumberForHouse(10)}</text>
        <text data-testid="house-planets-10" x="172" y="100" textAnchor="middle" className="text-[8.5px] font-[850] fill-[#111827]">{getPlanetsInHouse(10)}</text>

        {/* House 11: Right Upper corner */}
        <text data-testid="house-sign-11" x="170" y="55" textAnchor="middle" className="text-[8px] font-extrabold fill-neutral-400">{getZodiacNumberForHouse(11)}</text>
        <text data-testid="house-planets-11" x="182" y="45" textAnchor="middle" className="text-[8.5px] font-[850] fill-[#111827]">{getPlanetsInHouse(11)}</text>

        {/* House 12: Upper Right corner */}
        <text data-testid="house-sign-12" x="145" y="30" textAnchor="middle" className="text-[8px] font-extrabold fill-neutral-400">{getZodiacNumberForHouse(12)}</text>
        <text data-testid="house-planets-12" x="155" y="18" textAnchor="middle" className="text-[8.5px] font-[850] fill-[#111827]">{getPlanetsInHouse(12)}</text>
      </svg>
      {onZoom && (
        <div className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur-md rounded-md px-1.5 py-0.5 text-[8.5px] font-bold text-white uppercase tracking-widest pointer-events-none">
          Tap to Zoom
        </div>
      )}
    </div>
  );
}
