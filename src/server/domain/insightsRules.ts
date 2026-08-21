export const PLANETARY_NATURE: Record<string, 'benefic' | 'malefic' | 'neutral'> = {
  JUPITER: 'benefic',
  VENUS: 'benefic',
  MERCURY: 'benefic', // conditional, but let's assume benefic for simple score
  MOON: 'benefic',
  SUN: 'malefic',
  MARS: 'malefic',
  SATURN: 'malefic',
  RAHU: 'malefic',
  KETU: 'malefic'
};

export const TITHI_NATURE: Record<number, 'auspicious' | 'inauspicious' | 'neutral'> = {
  // Amavasya (30) and Rikta tithis (4, 9, 14, 19, 24, 29) are generally inauspicious
  4: 'inauspicious', 9: 'inauspicious', 14: 'inauspicious',
  19: 'inauspicious', 24: 'inauspicious', 29: 'inauspicious',
  30: 'inauspicious'
};

export function getDashaImpact(planet: string): number {
  if (!planet) return 0;
  const nature = PLANETARY_NATURE[planet.toUpperCase()];
  if (nature === 'benefic') return 10;
  if (nature === 'malefic') return -10;
  return 0;
}

export function getTithiImpact(tithiNumber: number): number {
  const nature = TITHI_NATURE[tithiNumber] || 'auspicious'; // simplified default
  if (nature === 'auspicious') return 5;
  if (nature === 'inauspicious') return -5;
  return 0;
}

export function getVaraImpact(weekdayIndex: number, category: 'love' | 'career' | 'wealth' | 'energy'): number {
  // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  // Just simplified rules
  if (category === 'love') {
    if (weekdayIndex === 5) return 10; // Friday / Venus
    if (weekdayIndex === 1) return 5;  // Monday / Moon
    if (weekdayIndex === 2 || weekdayIndex === 6) return -5; // Mars, Saturn
  }
  if (category === 'career') {
    if (weekdayIndex === 0) return 10; // Sunday / Sun
    if (weekdayIndex === 3) return 10; // Wed / Mercury
    if (weekdayIndex === 4) return 5;  // Thu / Jupiter
  }
  if (category === 'wealth') {
    if (weekdayIndex === 4) return 10; // Thu / Jupiter
    if (weekdayIndex === 5) return 10; // Fri / Venus
    if (weekdayIndex === 6) return -5; // Sat / Saturn
  }
  if (category === 'energy') {
    if (weekdayIndex === 0 || weekdayIndex === 2) return 10; // Sun, Mars
    if (weekdayIndex === 6) return -10; // Sat
  }
  return 0;
}
