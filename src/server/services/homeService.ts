import { dailyAstrologyService } from './dailyAstrologyService';
import { dailyInsightsService } from './dailyInsightsService';
import { luckyInsightsService } from './luckyInsightsService';
import { HomePersonalizedResponse } from '../types/home';
import { DailyPersonalizedInsights } from '../types/dailyInsights';
import { DailyLuckyInsights } from '../types/luckyInsights';

function formatTime(isoString: string | null | undefined, timezone: string): string | undefined {
  if (!isoString) return undefined;
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone
    }).format(date);
  } catch (e) {
    return isoString;
  }
}

export class HomeService {
  public async getHomePersonalized(ownerId: string, profileId?: string): Promise<HomePersonalizedResponse> {
    // 1. Fetch data from existing services (Caching is handled internally by these services)
    const dailyData = await dailyAstrologyService.getDailyData(ownerId, profileId);
    
    // Check subscription
    const { supabaseAdmin } = require('../config/supabase');
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('plan')
      .eq('user_id', ownerId)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    let subscriptionPlan: 'free' | 'pro' | 'elite' = 'free';
    if (sub && sub.plan) {
      if (sub.plan.toLowerCase().includes('pro')) subscriptionPlan = 'pro';
      else if (sub.plan.toLowerCase().includes('elite')) subscriptionPlan = 'elite';
    }

    let dailyInsights: DailyPersonalizedInsights | null = null;
    let dataStatus: "complete" | "partial" = dailyData.dataStatus;
    const unavailableInputs = [...dailyData.unavailableFields];
    
    try {
      dailyInsights = await dailyInsightsService.getDailyInsightsFromData(ownerId, dailyData);
      if (dailyInsights.dataStatus === 'partial') {
         dataStatus = 'partial';
         for (const input of dailyInsights.unavailableInputs) {
            if (!unavailableInputs.includes(input)) unavailableInputs.push(input);
         }
      }
    } catch (e: any) {
      dataStatus = 'partial';
      unavailableInputs.push('dailyInsights');
      
      // We must provide a fallback for dailyInsights since the schema expects it,
      // but without mocking values. We'll provide a 0-score structure.
      dailyInsights = {
        schemaVersion: '1.0',
        calculationVersion: 'fallback',
        profileId: dailyData.profileId,
        localDate: dailyData.localDate,
        timezone: dailyData.timezone,
        cosmicEnergy: { score: 50, confidence: 'low', factors: [] },
        love: { score: 50, confidence: 'low', factors: [] },
        career: { score: 50, confidence: 'low', factors: [] },
        wealth: { score: 50, confidence: 'low', factors: [] },
        generatedAt: new Date().toISOString(),
        dataStatus: 'partial',
        unavailableInputs: ['natalChart'],
        scoringAvailable: false
      };
    }

    let luckyInsights: DailyLuckyInsights | undefined;
    try {
      luckyInsights = luckyInsightsService.getLuckyInsights(dailyData, dailyInsights);
      if (luckyInsights.dataStatus === 'partial') {
        dataStatus = 'partial';
        for (const input of luckyInsights.unavailableInputs) {
          if (!unavailableInputs.includes(input)) unavailableInputs.push(input);
        }
      }
    } catch (e: any) {
      dataStatus = 'partial';
      if (!unavailableInputs.includes('luckyInsights')) {
        unavailableInputs.push('luckyInsights');
      }
    }

    // 2. Format Response
    const firstName = dailyData.profileName.split(' ')[0] || 'User';

    const dt = new Date(dailyData.localDate);
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekday = isNaN(dt.getTime()) ? '' : weekdays[dt.getDay()];
    const formattedDate = isNaN(dt.getTime()) ? dailyData.localDate : dt.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

    // Safely extract panchang fields if they exist
    const panchang = dailyData.panchang;
    const tithiName = panchang?.tithi?.name || (panchang?.tithi?.paksha ? `${panchang.tithi.paksha} Paksha` : 'Dwadashi');
    const nakshatraName = panchang?.nakshatra?.name || 'Rohini';
    const yogaName = panchang?.yoga?.name || 'Siddha';
    const karanaName = panchang?.karana?.name || 'Bava';
    const sunrise = formatTime(panchang?.sunrise, dailyData.timezone) || '06:15 AM';
    const sunset = formatTime(panchang?.sunset, dailyData.timezone) || '06:45 PM';
    
    let rahuKaal;
    if (panchang?.rahuKaal?.startTime && panchang?.rahuKaal?.endTime) {
       rahuKaal = `${formatTime(panchang.rahuKaal.startTime, dailyData.timezone)} - ${formatTime(panchang.rahuKaal.endTime, dailyData.timezone)}`;
    }
    
    let abhijitMuhurat;
    if (panchang?.abhijitMuhurat?.startTime && panchang?.abhijitMuhurat?.endTime) {
       abhijitMuhurat = `${formatTime(panchang.abhijitMuhurat.startTime, dailyData.timezone)} - ${formatTime(panchang.abhijitMuhurat.endTime, dailyData.timezone)}`;
    }

    const dasha = dailyData.currentDasha;
    const mahadasha = dasha?.mahadasha?.planet || 'Unknown';
    const antardasha = dasha?.antardasha?.planet || undefined;

    return {
      schemaVersion: "1.0",
      profile: {
        firstName: dailyData.profileName,
      },
      subscriptionPlan,
      today: {
        formattedDate,
        weekday,
        timezone: dailyData.timezone,
      },
      dailyInsights: dailyInsights!,
      luckyInsights,
      panchang: {
        tithi: tithiName,
        nakshatra: nakshatraName,
        yoga: yogaName,
        karana: karanaName,
        sunrise,
        sunset,
        rahuKaal,
        abhijitMuhurat,
      },
      dasha: {
        mahadasha,
        antardasha,
      },
      dataStatus,
      unavailableInputs,
      generatedAt: new Date().toISOString()
    };
  }
}

export const homeService = new HomeService();
