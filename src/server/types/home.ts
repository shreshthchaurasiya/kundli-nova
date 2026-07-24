import { DailyPersonalizedInsights } from './dailyInsights';
import { DailyLuckyInsights } from './luckyInsights';

export interface HomePersonalizedResponse {
  schemaVersion: string;
  profile: {
    firstName: string;
  };

  today: {
    formattedDate: string;
    weekday: string;
    timezone: string;
  };

  dailyInsights: DailyPersonalizedInsights;
  luckyInsights?: DailyLuckyInsights;

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

  dataStatus: "complete" | "partial";

  unavailableInputs: string[];

  generatedAt: string;
}
