import { LuckyColor, LuckyDirection, LuckyActivity, LuckyFactorSource } from '../types/luckyInsights';
import { DailyPersonalizedInsights } from '../types/dailyInsights';

export const WEEKDAY_BASE_NUMBER: Record<number, number> = {
  0: 1, // Sunday / Sun
  1: 2, // Monday / Moon
  2: 9, // Tuesday / Mars
  3: 5, // Wednesday / Mercury
  4: 3, // Thursday / Jupiter
  5: 6, // Friday / Venus
  6: 8  // Saturday / Saturn
};

export const PLANETARY_NUMBER: Record<string, number> = {
  SUN: 1,
  MOON: 2,
  JUPITER: 3,
  RAHU: 4,
  MERCURY: 5,
  VENUS: 6,
  KETU: 7,
  SATURN: 8,
  MARS: 9
};

export const WEEKDAY_BASE_COLOR: Record<number, LuckyColor> = {
  0: 'Saffron', // Sunday
  1: 'White',   // Monday
  2: 'Red',     // Tuesday
  3: 'Green',   // Wednesday
  4: 'Yellow',  // Thursday
  5: 'Light Pink', // Friday
  6: 'Black'    // Saturday
};

export const PLANETARY_COLOR: Record<string, LuckyColor> = {
  SUN: 'Saffron',
  MOON: 'White',
  JUPITER: 'Yellow',
  RAHU: 'Grey',
  MERCURY: 'Green',
  VENUS: 'Light Pink',
  KETU: 'Grey',
  SATURN: 'Black',
  MARS: 'Red'
};

export const WEEKDAY_DIRECTION: Record<number, LuckyDirection> = {
  0: 'East',        // Sunday / Sun
  1: 'North-West',  // Monday / Moon
  2: 'South',       // Tuesday / Mars
  3: 'North',       // Wednesday / Mercury
  4: 'North-East',  // Thursday / Jupiter
  5: 'South-East',  // Friday / Venus
  6: 'West'         // Saturday / Saturn
};

export const PLANETARY_DIRECTION: Record<string, LuckyDirection> = {
  SUN: 'East',
  MOON: 'North-West',
  JUPITER: 'North-East',
  RAHU: 'South-West',
  MERCURY: 'North',
  VENUS: 'South-East',
  KETU: 'South-West',
  SATURN: 'West',
  MARS: 'South'
};

/**
 * Returns integer 1-9
 */
export function getLuckyNumber(weekdayIndex: number, mahadashaPlanet?: string, tithiNumber?: number): { value: number; sources: LuckyFactorSource[]; confidence: 'high' | 'medium' | 'low' } {
  let raw = WEEKDAY_BASE_NUMBER[weekdayIndex];
  const sources: LuckyFactorSource[] = ['weekday'];
  let confidence: 'high' | 'medium' | 'low' = 'low';

  if (mahadashaPlanet && PLANETARY_NUMBER[mahadashaPlanet.toUpperCase()]) {
    raw += PLANETARY_NUMBER[mahadashaPlanet.toUpperCase()];
    sources.push('mahadasha');
    confidence = 'medium';
  }

  if (tithiNumber && tithiNumber > 0 && tithiNumber <= 30) {
    raw += tithiNumber;
    sources.push('tithi');
    if (confidence === 'medium') confidence = 'high';
    else confidence = 'medium';
  }

  const normalized = ((raw - 1) % 9) + 1;
  return { value: normalized, sources, confidence };
}

export function getLuckyColor(weekdayIndex: number, mahadashaPlanet?: string, nakshatraRuler?: string): { value: LuckyColor; sources: LuckyFactorSource[]; confidence: 'high' | 'medium' | 'low' } {
  const sources: LuckyFactorSource[] = [];
  let confidence: 'high' | 'medium' | 'low' = 'low';
  let value: LuckyColor = WEEKDAY_BASE_COLOR[weekdayIndex];

  // Conflict Resolution:
  // 1. Mahadasha lord is the primary overriding factor if present.
  // 2. Otherwise Weekday base.
  // (Nakshatra is excluded as requested to avoid duplicate provider calls, but supported in signature if later passed)
  
  if (mahadashaPlanet && PLANETARY_COLOR[mahadashaPlanet.toUpperCase()]) {
    value = PLANETARY_COLOR[mahadashaPlanet.toUpperCase()];
    sources.push('mahadasha');
    confidence = 'medium';
  } else {
    sources.push('weekday');
  }

  if (nakshatraRuler) {
    sources.push('nakshatra');
    confidence = confidence === 'medium' ? 'high' : 'medium';
  }

  return { value, sources, confidence };
}

export function getLuckyDirection(weekdayIndex: number, mahadashaPlanet?: string): { value: LuckyDirection; sources: LuckyFactorSource[]; confidence: 'high' | 'medium' | 'low' } {
  const sources: LuckyFactorSource[] = [];
  let confidence: 'high' | 'medium' | 'low' = 'low';
  let value: LuckyDirection = WEEKDAY_DIRECTION[weekdayIndex];

  if (mahadashaPlanet && PLANETARY_DIRECTION[mahadashaPlanet.toUpperCase()]) {
    value = PLANETARY_DIRECTION[mahadashaPlanet.toUpperCase()];
    sources.push('mahadasha');
    confidence = 'high'; // Weekday + Mahadasha = personalized
  } else {
    sources.push('weekday');
  }

  return { value, sources, confidence };
}

export function getBestActivity(
  weekdayIndex: number, 
  dailyInsights: DailyPersonalizedInsights
): { value: LuckyActivity; sources: LuckyFactorSource[]; confidence: 'high' | 'medium' | 'low' } {
  
  // Stable priority tie-breaker: Career > Wealth > Love > Energy (ignored here)
  let bestScore = -Infinity;
  let bestCategory: 'career' | 'wealth' | 'love' = 'career';

  if (dailyInsights.career.score > bestScore) {
    bestScore = dailyInsights.career.score;
    bestCategory = 'career';
  }
  if (dailyInsights.wealth.score > bestScore) {
    bestScore = dailyInsights.wealth.score;
    bestCategory = 'wealth';
  }
  if (dailyInsights.love.score > bestScore) {
    bestScore = dailyInsights.love.score;
    bestCategory = 'love';
  }

  let activity: LuckyActivity = 'Planning';

  if (bestCategory === 'career') {
    // Tie-break with weekday
    if (weekdayIndex === 1 || weekdayIndex === 3) activity = 'Learning';
    else if (weekdayIndex === 5) activity = 'Creative work';
    else activity = 'Planning';
  } else if (bestCategory === 'wealth') {
    activity = 'Financial review';
  } else if (bestCategory === 'love') {
    if (weekdayIndex === 0 || weekdayIndex === 6) activity = 'Spiritual practice';
    else if (weekdayIndex === 1 || weekdayIndex === 5) activity = 'Relationship conversations';
    else activity = 'Communication';
  }

  // If daily insights scoring wasn't available (or was just a neutral skeleton), confidence is lower
  const confidence = dailyInsights.scoringAvailable ? 'high' : 'low';
  
  return {
    value: activity,
    sources: ['dailyInsights', 'weekday'],
    confidence
  };
}
