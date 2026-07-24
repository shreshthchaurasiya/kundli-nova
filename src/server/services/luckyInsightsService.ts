import { DailyAstrologyData } from './dailyAstrologyService';
import { DailyPersonalizedInsights } from '../types/dailyInsights';
import { DailyLuckyInsights } from '../types/luckyInsights';
import {
  getLuckyNumber,
  getLuckyColor,
  getLuckyDirection,
  getBestActivity
} from '../domain/luckyRules';

export class LuckyInsightsService {
  /**
   * Pure deterministic computation function.
   * No caching required inside this service because it executes synchronously
   * and does not make provider calls.
   */
  public getLuckyInsights(
    dailyData: DailyAstrologyData,
    dailyInsights: DailyPersonalizedInsights
  ): DailyLuckyInsights {
    const dt = new Date(dailyData.localDate);
    const weekdayIndex = isNaN(dt.getTime()) ? new Date().getDay() : dt.getDay(); // fallback if localDate is somehow invalid

    // Extract normalized provider inputs safely
    const mahadashaPlanet = dailyData.currentDasha?.mahadasha?.planet;
    
    // Tithi number extraction: tithi name usually has a number or paksha, but we don't have a reliable number. 
    // Wait, panchang tithi usually doesn't have a direct number. 
    // If not available, we omit it and use the fallback rule.
    // Let's check if we can parse it from name or just skip.
    // For now we'll just skip tithi number as we don't have a normalized 1-30 number in KundliNovaPanchang.
    
    const luckyColor = getLuckyColor(weekdayIndex, mahadashaPlanet);
    const luckyNumber = getLuckyNumber(weekdayIndex, mahadashaPlanet, undefined);
    const luckyDirection = getLuckyDirection(weekdayIndex, mahadashaPlanet);
    const bestActivity = getBestActivity(weekdayIndex, dailyInsights);

    const result: DailyLuckyInsights = {
      schemaVersion: '1.0',
      calculationVersion: 'v1',
      profileId: dailyData.profileId,
      localDate: dailyData.localDate,
      timezone: dailyData.timezone,
      
      luckyColor,
      luckyNumber,
      luckyDirection,
      bestActivity,
      
      dataStatus: 'complete',
      unavailableInputs: [],
      generatedAt: new Date().toISOString()
    };

    // Best Time (Abhijit Muhurat is preferred)
    if (dailyData.panchang?.abhijitMuhurat?.startTime && dailyData.panchang?.abhijitMuhurat?.endTime) {
      result.bestTime = {
        start: dailyData.panchang.abhijitMuhurat.startTime,
        end: dailyData.panchang.abhijitMuhurat.endTime,
        label: 'Abhijit Muhurat',
        source: 'abhijitMuhurat'
      };
    } else {
       // Omit bestTime if no valid verified window exists.
       result.unavailableInputs.push('bestTime');
    }

    // Caution Window (Rahu Kaal)
    if (dailyData.panchang?.rahuKaal?.startTime && dailyData.panchang?.rahuKaal?.endTime) {
      result.cautionWindow = {
        start: dailyData.panchang.rahuKaal.startTime,
        end: dailyData.panchang.rahuKaal.endTime,
        label: 'Rahu Kaal',
        source: 'rahuKaal'
      };
    } else {
       result.unavailableInputs.push('cautionWindow');
    }
    
    if (result.unavailableInputs.length > 0) {
       result.dataStatus = 'partial';
    }

    return result;
  }
}

export const luckyInsightsService = new LuckyInsightsService();
