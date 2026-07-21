export const ZODIAC_SIGNS = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
] as const;

export type ZodiacSign = (typeof ZODIAC_SIGNS)[number];

export interface KundliNovaCalcInput {
  profileId: string;
  name: string;
  dateOfBirth: string; // YYYY-MM-DD
  timeOfBirth: string; // HH:MM:SS
  latitude: number;
  longitude: number;
  timezone: string; // IANA string e.g. "Asia/Kolkata"
  ayanamsha?: string; // Default "lahiri"
}

export interface PlanetData {
  name: string;
  sign: string;
  degreeInSign: number;
  degree?: number;
  house: number;
  nakshatra: string;
  pada: number;
  isRetrograde: boolean;
  signLord: string;
}

export interface HouseData {
  number: number;
  sign: string;
  degree?: number;
}

export interface KundliNovaNatalChart {
  schemaVersion: '1.0';
  provider: string;
  providerVersion: string;
  houseSystem?: string;
  calculatedAt: string;
  input: KundliNovaCalcInput;
  ascendant: {
    sign: string;
    degree: number;
    nakshatra: string;
  };
  planets: PlanetData[];
  houses?: HouseData[];
  moonSign: string;
  sunSign: string;
  nakshatra: string;
  pada: number;
  warnings?: string[];
}

export interface KundliNovaDasha {
  schemaVersion: '1.0';
  provider: string;
  currentDasha: {
    mahadasha: string;
    antardasha: string;
    startDate: string;
    endDate: string;
  };
  fullTree?: Record<string, unknown>;
}

export interface KundliNovaDoshaResult {
  schemaVersion: '1.0';
  provider: string;
  mangalDosha: {
    hasDosha: boolean;
    isCancelled: boolean;
    description: string;
  };
  kaalSarpDosha: {
    hasDosha: boolean;
    type?: string;
    description: string;
  };
  sadeSati: {
    isUnderway: boolean;
    phase?: string;
    description: string;
  };
}

export interface KundliNovaYogaResult {
  schemaVersion: '1.0';
  provider: string;
  yogas: Array<{
    name: string;
    category: string;
    description: string;
    hasYoga: boolean;
  }>;
}

export interface KundliNovaPanchang {
  schemaVersion: '1.0';
  provider: string;
  date: string;
  tithi: { name: string; number: number; endTime?: string };
  nakshatra: { name: string; number: number; endTime?: string };
  yoga: { name: string; number: number };
  karana: { name: string; number: number };
  vara: string;
  sunrise: string;
  sunset: string;
  choghadiya?: Array<{ name: string; type: 'good' | 'bad' | 'neutral'; startTime: string; endTime: string }>;
}

export interface KundliNovaMatchResult {
  schemaVersion: '1.0';
  provider: string;
  totalScore: number;
  maxScore: number; // 36 for Ashtakoot
  isCompatible: boolean;
  areaScores: Array<{
    kootaName: string;
    obtainedPoints: number;
    maxPoints: number;
    description: string;
  }>;
}

export interface KundliNovaDailyHoroscope {
  schemaVersion: '1.0';
  provider: string;
  providerVersion: string;
  zodiacSign: ZodiacSign;
  period: 'today';
  date: string; // YYYY-MM-DD in Asia/Kolkata
  overview: string;
  generatedAt: string;
  isStaleFallback?: boolean;
  warning?: string;
}

export interface AstrologyCalculationProvider {
  getNatalChart(input: KundliNovaCalcInput): Promise<KundliNovaNatalChart>;
  getPlanets(input: KundliNovaCalcInput): Promise<PlanetData[]>;
  getDasha(input: KundliNovaCalcInput): Promise<KundliNovaDasha>;
  getDoshas(input: KundliNovaCalcInput): Promise<KundliNovaDoshaResult>;
  getYogas(input: KundliNovaCalcInput): Promise<KundliNovaYogaResult>;
  getPanchang(input: KundliNovaCalcInput, date?: string): Promise<KundliNovaPanchang>;
  getMatching(bride: KundliNovaCalcInput, groom: KundliNovaCalcInput): Promise<KundliNovaMatchResult>;
}

export interface HoroscopeContentProvider {
  getDailyHoroscope(zodiac: ZodiacSign, dateContext?: string): Promise<KundliNovaDailyHoroscope>;
}
