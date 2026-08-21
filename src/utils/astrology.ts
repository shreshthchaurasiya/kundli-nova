import { ZodiacSign, ZODIAC_SIGNS } from '../server/types/astrologyProvider';

/**
 * Derives Western Sun Sign from a date of birth string (YYYY-MM-DD).
 * If the date is invalid or missing, returns null.
 */
export function getWesternSunSign(dob: string): ZodiacSign | null {
  if (!dob) return null;

  const date = new Date(dob);
  if (isNaN(date.getTime())) return null;

  const month = date.getUTCMonth() + 1; // 1-12
  const day = date.getUTCDate();

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'aries';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'taurus';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'gemini';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'cancer';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'leo';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'virgo';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'libra';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'scorpio';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'sagittarius';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'capricorn';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'aquarius';
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return 'pisces';

  return null;
}

export const ZODIAC_METADATA: Record<ZodiacSign, { dateRange: string, element: string, planet: string, symbol: string }> = {
  aries: { dateRange: 'Mar 21 - Apr 19', element: 'Fire', planet: 'Mars', symbol: 'Ram' },
  taurus: { dateRange: 'Apr 20 - May 20', element: 'Earth', planet: 'Venus', symbol: 'Bull' },
  gemini: { dateRange: 'May 21 - Jun 20', element: 'Air', planet: 'Mercury', symbol: 'Twins' },
  cancer: { dateRange: 'Jun 21 - Jul 22', element: 'Water', planet: 'Moon', symbol: 'Crab' },
  leo: { dateRange: 'Jul 23 - Aug 22', element: 'Fire', planet: 'Sun', symbol: 'Lion' },
  virgo: { dateRange: 'Aug 23 - Sep 22', element: 'Earth', planet: 'Mercury', symbol: 'Maiden' },
  libra: { dateRange: 'Sep 23 - Oct 22', element: 'Air', planet: 'Venus', symbol: 'Scales' },
  scorpio: { dateRange: 'Oct 23 - Nov 21', element: 'Water', planet: 'Mars & Pluto', symbol: 'Scorpion' },
  sagittarius: { dateRange: 'Nov 22 - Dec 21', element: 'Fire', planet: 'Jupiter', symbol: 'Archer' },
  capricorn: { dateRange: 'Dec 22 - Jan 19', element: 'Earth', planet: 'Saturn', symbol: 'Sea-Goat' },
  aquarius: { dateRange: 'Jan 20 - Feb 18', element: 'Air', planet: 'Uranus & Saturn', symbol: 'Water Bearer' },
  pisces: { dateRange: 'Feb 19 - Mar 20', element: 'Water', planet: 'Neptune & Jupiter', symbol: 'Fishes' },
};
