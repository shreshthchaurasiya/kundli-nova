// Frontend contract mirroring the backend HomePersonalizedResponse DTO.
// Property names must exactly match what GET /api/v1/home/personalized returns.

export type LuckyColor =
  | 'Saffron'
  | 'Yellow'
  | 'White'
  | 'Green'
  | 'Red'
  | 'Blue'
  | 'Cream'
  | 'Light Pink'
  | 'Black'
  | 'Grey';

export type LuckyDirection =
  | 'North'
  | 'North-East'
  | 'East'
  | 'South-East'
  | 'South'
  | 'South-West'
  | 'West'
  | 'North-West';

export type LuckyActivity =
  | 'Communication'
  | 'Planning'
  | 'Financial review'
  | 'Relationship conversations'
  | 'Learning'
  | 'Creative work'
  | 'Spiritual practice'
  | 'Rest and reflection';

export type LuckyFactorSource = 'weekday' | 'mahadasha' | 'tithi' | 'nakshatra' | 'dailyInsights';

export interface DailyLuckyInsightsDto {
  schemaVersion: '1.0';
  calculationVersion: string;
  profileId: string;
  localDate: string;
  timezone: string;

  luckyColor?: {
    value: LuckyColor;
    sources: LuckyFactorSource[];
    confidence: 'high' | 'medium' | 'low';
  };

  luckyNumber?: {
    value: number;
    sources: LuckyFactorSource[];
    confidence: 'high' | 'medium' | 'low';
  };

  luckyDirection?: {
    value: LuckyDirection;
    sources: LuckyFactorSource[];
    confidence: 'high' | 'medium' | 'low';
  };

  bestTime?: {
    start: string;
    end: string;
    label: string;
    source: 'abhijitMuhurat' | 'verifiedGoodTime';
  };

  bestActivity?: {
    value: LuckyActivity;
    sources: LuckyFactorSource[];
    confidence: 'high' | 'medium' | 'low';
  };

  cautionWindow?: {
    start: string;
    end: string;
    label: 'Rahu Kaal';
    source: 'rahuKaal';
  };

  dataStatus: 'complete' | 'partial';
  unavailableInputs: string[];
  generatedAt: string;
}

// Property names must exactly match what GET /api/v1/home/personalized returns.

export interface DailyInsightFactor {
  id: string;
  category: 'natal' | 'dasha' | 'transit' | 'panchang';
  label: string;
  impact: number;
  polarity: 'positive' | 'negative' | 'neutral';
  source: string;
}

export interface DailyCategoryInsight {
  score: number;
  confidence: 'high' | 'medium' | 'low';
  factors: DailyInsightFactor[];
}

export interface DailyPersonalizedInsightsDto {
  schemaVersion: '1.0';
  calculationVersion: string;
  profileId: string;
  localDate: string;
  timezone: string;
  cosmicEnergy: DailyCategoryInsight;
  love: DailyCategoryInsight;
  career: DailyCategoryInsight;
  wealth: DailyCategoryInsight;
  generatedAt: string;
  dataStatus: 'complete' | 'partial';
  unavailableInputs: string[];
  /** true when real birth + dasha data was used; false when a neutral skeleton was returned */
  scoringAvailable: boolean;
  fomoAlertMessage?: string;
}

export interface HomePersonalizedResponse {
  schemaVersion: string;
  profile: {
    firstName: string;
  };
  subscriptionPlan?: 'free' | 'pro' | 'elite';
  today: {
    formattedDate: string;
    weekday: string;
    timezone: string;
  };
  dailyInsights: DailyPersonalizedInsightsDto;
  luckyInsights?: DailyLuckyInsightsDto;
  panchang: {
    tithi: string;
    nakshatra: string;
    yoga?: string;
    karana?: string;
    sunrise?: string;
    sunset?: string;
    rahuKaal?: string;
    abhijitMuhurat?: string;
  };
  dasha: {
    mahadasha: string;
    antardasha?: string;
  };
  dataStatus: 'complete' | 'partial';
  unavailableInputs: string[];
  generatedAt: string;
}
