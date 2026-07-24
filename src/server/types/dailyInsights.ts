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

export interface DailyPersonalizedInsights {
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
  /** true when real birth + dasha data was used; false when only a neutral skeleton was produced */
  scoringAvailable: boolean;
}
