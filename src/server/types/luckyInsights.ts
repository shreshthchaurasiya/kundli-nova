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

export interface DailyLuckyInsights {
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
