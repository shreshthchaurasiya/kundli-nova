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

export interface DashaPeriod {
  planet: 'Ketu' | 'Venus' | 'Sun' | 'Moon' | 'Mars' | 'Rahu' | 'Jupiter' | 'Saturn' | 'Mercury';
  startDate: string; // ISO date
  endDate: string; // ISO date
  isCurrent: boolean;
  remainingDays?: number;
}

export interface KundliNovaVimshottariDasha {
  schemaVersion: '1.0';
  provider: string;
  providerVersion: string;
  calculatedAt: string; // ISO date
  currentMahadasha: DashaPeriod;
  currentAntardasha: DashaPeriod | null;
  mahadashaTimeline: DashaPeriod[];
}

export interface LegacyKundliNovaDoshaResult {
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

export type DoshaCode =
  | 'MANGAL_DOSHA'
  | 'KAAL_SARP_DOSHA'
  | 'PITRU_DOSHA'
  | 'GRAHAN_DOSHA';

export type DoshaSeverity =
  | 'none'
  | 'mild'
  | 'moderate'
  | 'strong'
  | 'unknown';

export interface DoshaEvidence {
  planets: string[];
  houses: number[];
  signs?: string[];
  description?: string;
}

export interface KundliNovaDoshaResult {
  code: DoshaCode;
  name: string;
  detected: boolean;
  severity: DoshaSeverity;
  summary: string;
  evidence: DoshaEvidence[];
  calculationStatus: 'calculated' | 'unavailable';
}

export interface KundliNovaDoshaAnalysis {
  schemaVersion: '1.0';
  provider: string;
  providerVersion: string;
  calculatedAt: string;
  profileId: string;
  results: KundliNovaDoshaResult[];
}

export interface LegacyKundliNovaYogaResult {
  schemaVersion: '1.0';
  provider: string;
  yogas: Array<{
    name: string;
    category: string;
    description: string;
    hasYoga: boolean;
  }>;
}

export type YogaCode =
  | 'GAJ_KESARI_YOGA'
  | 'BUDHA_ADITYA_YOGA'
  | 'DHAN_YOGA'
  | 'RAJ_YOGA'
  | 'NEECH_BHANG_RAJ_YOGA';

export type YogaStrength =
  | 'none'
  | 'weak'
  | 'moderate'
  | 'strong'
  | 'unknown';

export interface YogaEvidence {
  planets: string[];
  houses: number[];
  signs?: string[];
  relationships?: string[];
  description?: string;
}

export interface KundliNovaYogaResult {
  code: YogaCode;
  name: string;
  detected: boolean;
  strength: YogaStrength;
  summary: string;
  evidence: YogaEvidence[];
  calculationStatus: 'calculated' | 'unavailable';
}

export interface KundliNovaYogaAnalysis {
  schemaVersion: '1.0';
  provider: string;
  providerVersion: string;
  calculatedAt: string;
  profileId: string;
  results: KundliNovaYogaResult[];
}

export interface KundliNovaPanchang {
  schemaVersion: '1.0';
  provider: string;
  date: string;
  timezone: string;
  latitude: number;
  longitude: number;
  
  tithi: {
    name: string | null;
    paksha: string | null;
    startTime: string | null;
    endTime: string | null;
  };
  
  nakshatra: {
    name: string | null;
    pada: number | null;
    startTime: string | null;
    endTime: string | null;
  };
  
  yoga: {
    name: string | null;
    startTime: string | null;
    endTime: string | null;
  };
  
  karana: {
    name: string | null;
    startTime: string | null;
    endTime: string | null;
  };
  
  vara: string | null;
  
  sunrise: string | null;
  sunset: string | null;
  moonrise: string | null;
  moonset: string | null;
  
  rahuKaal: {
    startTime: string | null;
    endTime: string | null;
  } | null;
  
  abhijitMuhurat: {
    startTime: string | null;
    endTime: string | null;
  } | null;
  
  choghadiya: Array<{
    name: string;
    nature: string | null;
    startTime: string;
    endTime: string;
  }>;
  
  hora: Array<{
    planet: string;
    startTime: string;
    endTime: string;
  }>;
  
  dishaShool: {
    direction: string | null;
    remedy: string | null;
  } | null;
  
  source: string;
  calculatedAt: string;
}

export interface KundliNovaCurrentDasha {
  mahadasha: {
    planet: string;
    startDate: string | null;
    endDate: string | null;
  } | null;
  
  antardasha: {
    planet: string;
    startDate: string | null;
    endDate: string | null;
  } | null;
  
  pratyantardasha: {
    planet: string;
    startDate: string | null;
    endDate: string | null;
  } | null;
  
  asOf: string;
  source: string;
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

export type AshtakootaFactorCode =
  | 'VARNA'
  | 'VASHYA'
  | 'TARA'
  | 'YONI'
  | 'GRAHA_MAITRI'
  | 'GANA'
  | 'BHAKOOT'
  | 'NADI';

export interface AshtakootaFactor {
  code: AshtakootaFactorCode;
  name: string;
  score: number;
  maximumScore: number;
  summary: string;
  calculationStatus: 'calculated' | 'unavailable';
}

export interface KundliNovaCompatibilityAnalysis {
  schemaVersion: '1.0';
  provider: string;
  providerVersion: string;
  calculatedAt: string;
  profileAId: string;
  profileBId: string;
  totalScore: number;
  maximumScore: number;
  compatibilityPercentage: number;
  factors: AshtakootaFactor[];
}

export interface KundliNovaManglikAnalysis {
  schemaVersion: '1.0';
  provider: string;
  providerVersion: string;
  calculatedAt: string;
  profileAId: string;
  profileBId: string;
  profileAManglik: boolean;
  profileBManglik: boolean;
  profileACancellation: string;
  profileBCancellation: string;
  compatibility: string;
}

export interface AstrologyCalculationProvider {
  getNatalChart(input: KundliNovaCalcInput): Promise<KundliNovaNatalChart>;
  getPlanets(input: KundliNovaCalcInput): Promise<PlanetData[]>;
  getVimshottariDasha(input: KundliNovaCalcInput): Promise<KundliNovaVimshottariDasha>;
  getDoshas(input: KundliNovaCalcInput): Promise<LegacyKundliNovaDoshaResult>;
  getDoshaAnalysis(input: KundliNovaCalcInput): Promise<KundliNovaDoshaAnalysis>;
  getYogas(input: KundliNovaCalcInput): Promise<LegacyKundliNovaYogaResult>;
  getYogaAnalysis(input: KundliNovaCalcInput): Promise<KundliNovaYogaAnalysis>;
  getPanchang(input: KundliNovaCalcInput, targetDate?: string): Promise<KundliNovaPanchang>;
  getCurrentDasha(input: KundliNovaCalcInput, targetDate?: string): Promise<KundliNovaCurrentDasha>;
  getMatching(bride: KundliNovaCalcInput, groom: KundliNovaCalcInput): Promise<KundliNovaMatchResult>;
  getCompatibilityAnalysis(inputA: KundliNovaCalcInput, inputB: KundliNovaCalcInput): Promise<KundliNovaCompatibilityAnalysis>;
  getManglikCompatibility(inputA: KundliNovaCalcInput, inputB: KundliNovaCalcInput): Promise<KundliNovaManglikAnalysis>;
  getDetailedKundliReport(input: KundliNovaCalcInput): Promise<KundliNovaDetailedReport>;
}

export type DetailedReportSectionCode =
  | 'BIRTH_SUMMARY'
  | 'ASCENDANT'
  | 'PLANETARY_POSITIONS'
  | 'HOUSE_ANALYSIS'
  | 'NAKSHATRA_ANALYSIS'
  | 'DASHA_SUMMARY'
  | 'DOSHA_SUMMARY'
  | 'YOGA_SUMMARY';

export interface DetailedBirthSummarySection {
  profileName: string;
  dateOfBirth: string;
  timeOfBirth: string;
  placeOfBirth: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
}

export interface DetailedAscendantSection {
  sign: string;
  degree: number | null;
  nakshatra: string | null;
  pada: number | null;
  summary: string | null;
  calculationStatus: 'calculated' | 'unavailable';
}

export interface DetailedPlanetPosition {
  planet: string;
  sign: string | null;
  house: number | null;
  degree: number | null;
  nakshatra: string | null;
  pada: number | null;
  retrograde: boolean | null;
  combust: boolean | null;
  calculationStatus: 'calculated' | 'unavailable';
}

export interface DetailedPlanetaryPositionsSection {
  planets: DetailedPlanetPosition[];
}

export interface DetailedHouseItem {
  houseNumber: number;
  sign: string | null;
  lord: string | null;
  occupants: string[];
  summary: string | null;
  calculationStatus: 'calculated' | 'unavailable';
}

export interface DetailedHouseAnalysisSection {
  houses: DetailedHouseItem[];
}

export interface DetailedNakshatraSection {
  moonNakshatra: string | null;
  moonPada: number | null;
  nakshatraLord: string | null;
  deity: string | null;
  gana: string | null;
  symbol: string | null;
  summary: string | null;
  calculationStatus: 'calculated' | 'unavailable';
}

export interface DetailedDashaSummarySection {
  currentMahadasha: string | null;
  currentAntardasha: string | null;
  mahadashaStartDate: string | null;
  mahadashaEndDate: string | null;
  summary: string | null;
  calculationStatus: 'calculated' | 'unavailable';
}

export interface DetailedDoshaSummaryItem {
  code:
    | 'MANGAL_DOSHA'
    | 'KAAL_SARP_DOSHA'
    | 'PITRU_DOSHA'
    | 'GRAHAN_DOSHA';

  present: boolean | null;
  severity: string | null;
  summary: string | null;
  calculationStatus: 'calculated' | 'unavailable';
}

export interface DetailedDoshaSummarySection {
  doshas: DetailedDoshaSummaryItem[];
  summary: string | null;
}

export interface DetailedYogaSummaryItem {
  code:
    | 'GAJ_KESARI_YOGA'
    | 'BUDHA_ADITYA_YOGA'
    | 'DHAN_YOGA'
    | 'RAJ_YOGA'
    | 'NEECH_BHANG_RAJ_YOGA';

  present: boolean | null;
  strength: string | null;
  summary: string | null;
  calculationStatus: 'calculated' | 'unavailable';
}

export interface DetailedYogaSummarySection {
  yogas: DetailedYogaSummaryItem[];
  summary: string | null;
}

export interface KundliNovaDetailedReport {
  schemaVersion: '1.0';

  provider: string;
  providerVersion: string;
  calculatedAt: string;

  profileId: string;

  reportStatus:
    | 'complete'
    | 'partial'
    | 'unavailable';

  availableSections: DetailedReportSectionCode[];
  unavailableSections: DetailedReportSectionCode[];

  birthSummary: DetailedBirthSummarySection | null;
  executiveSummary: string | null;
  lifeDomains: {
    career: string | null;
    education: string | null;
    loveAndMarriage: string | null;
    health: string | null;
    wealthAndProperty: string | null;
    familyAndChildren: string | null;
  } | null;
  luckyItems: {
    colors: string[];
    days: string[];
    numbers: number[];
  } | null;
  ascendant: DetailedAscendantSection | null;
  planetaryPositions: DetailedPlanetaryPositionsSection | null;
  houseAnalysis: DetailedHouseAnalysisSection | null;
  nakshatraAnalysis: DetailedNakshatraSection | null;
  dashaSummary: DetailedDashaSummarySection | null;
  doshaSummary: DetailedDoshaSummarySection | null;
  yogaSummary: DetailedYogaSummarySection | null;
  
  // Bundled raw data to ensure PDF has everything it needs synchronously
  bundledDasha?: import('./astrologyProvider').KundliNovaVimshottariDasha | null;
  bundledDosha?: import('./astrologyProvider').KundliNovaDoshaAnalysis | null;
  bundledYoga?: import('./astrologyProvider').KundliNovaYogaAnalysis | null;
}

export interface HoroscopeContentProvider {
  getDailyHoroscope(zodiac: ZodiacSign, dateContext?: string): Promise<KundliNovaDailyHoroscope>;
}
