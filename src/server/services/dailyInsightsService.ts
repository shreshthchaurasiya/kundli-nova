import { supabaseAdmin } from '../config/supabase';
import { NavamshaProvider } from '../providers/navamshaProvider';
import { dailyAstrologyService, DailyAstrologyData } from './dailyAstrologyService';
import { KundliNovaCalcInput } from '../types/astrologyProvider';
import { DailyPersonalizedInsights, DailyInsightFactor } from '../types/dailyInsights';
import { getDashaImpact, getVaraImpact } from '../domain/insightsRules';
import { KundliCalculationService } from './kundliCalculationService';

const memoryCache = new Map<string, { data: DailyPersonalizedInsights, expiresAt: number }>();
const inFlightInsights = new Map<string, Promise<DailyPersonalizedInsights>>();
const CACHE_VERSION = 'v1';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

export class DailyInsightsService {
  private navamsha: NavamshaProvider;
  private kundliService: KundliCalculationService;

  constructor() {
    this.navamsha = new NavamshaProvider();
    this.kundliService = new KundliCalculationService(this.navamsha);
  }

  public async getDailyInsights(ownerId: string, profileId?: string): Promise<DailyPersonalizedInsights> {
    let dailyData;
    try {
      dailyData = await dailyAstrologyService.getDailyData(ownerId, profileId);
    } catch (e: any) {
      if (e.message === 'PROVIDER_UNAVAILABLE') throw new Error('DAILY_ASTROLOGY_UNAVAILABLE');
      throw e;
    }
    return this.getDailyInsightsFromData(ownerId, dailyData);
  }

  public async getDailyInsightsFromData(ownerId: string, dailyData: DailyAstrologyData): Promise<DailyPersonalizedInsights> {
    const cacheKey = `${dailyData.profileId}_${dailyData.localDate}_${dailyData.timezone}_${CACHE_VERSION}`;
    const cached = memoryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    if (inFlightInsights.has(cacheKey)) {
      return inFlightInsights.get(cacheKey)!;
    }

    const fetchPromise = (async () => {
      // 3. Load Natal Data (Planets) using existing canonical Kundli cache instead of raw navamsha
      let planets;
      try {
        const kundli = await this.kundliService.getKundli(dailyData.profileId, ownerId);
        planets = kundli.planets;
      } catch {
        throw new Error('NATAL_CHART_UNAVAILABLE');
      }

    // 4. Calculate Scores
    const calculateCategory = (category: 'love' | 'career' | 'wealth' | 'energy') => {
      let score = 50;
      const factors: DailyInsightFactor[] = [];
      const addFactor = (label: string, impact: number, cat: DailyInsightFactor['category'], source: string) => {
        if (impact === 0) return;
        factors.push({
          id: `${category}_${cat}_${source}`,
          category: cat,
          label,
          impact,
          polarity: impact > 0 ? 'positive' : 'negative',
          source
        });
        score += impact;
      };

      // Dasha Impact
      if (dailyData.currentDasha?.mahadasha) {
         const imp = getDashaImpact(dailyData.currentDasha.mahadasha.planet);
         addFactor(`Mahadasha Lord (${dailyData.currentDasha.mahadasha.planet})`, imp, 'dasha', 'mahadasha');
      }

      // Panchang Impact (Vara)
      if (dailyData.panchang?.vara) {
         const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
         const idx = days.indexOf(dailyData.panchang.vara);
         if (idx !== -1) {
            const imp = getVaraImpact(idx, category);
            addFactor(`${dailyData.panchang.vara} Energy`, imp, 'panchang', 'vara');
         }
      }

      // Panchang Impact (Tithi) - mostly for energy
      if (category === 'energy' && dailyData.panchang?.tithi?.name) {
         const isShukla = dailyData.panchang.tithi.paksha?.toLowerCase() === 'shukla';
         addFactor(`${dailyData.panchang.tithi.name} Phase`, isShukla ? 5 : -2, 'panchang', 'tithi');
      }

      // Natal planets simplified usage
      if (category === 'love') {
         const venus = planets.find(p => p.name.toUpperCase() === 'VENUS');
         if (venus && venus.isRetrograde) addFactor('Venus Retrograde', -5, 'natal', 'venus');
         else if (venus) addFactor('Venus Placement', 5, 'natal', 'venus');
      }
      if (category === 'career') {
         const saturn = planets.find(p => p.name.toUpperCase() === 'SATURN');
         if (saturn && saturn.isRetrograde) addFactor('Saturn Retrograde', -5, 'natal', 'saturn');
         else if (saturn) addFactor('Saturn Discipline', 5, 'natal', 'saturn');
      }
      if (category === 'wealth') {
         const jupiter = planets.find(p => p.name.toUpperCase() === 'JUPITER');
         if (jupiter && jupiter.isRetrograde) addFactor('Jupiter Retrograde', -5, 'natal', 'jupiter');
         else if (jupiter) addFactor('Jupiter Blessing', 5, 'natal', 'jupiter');
      }

      score = Math.max(0, Math.min(100, score));
      
      const conf = (dailyData.dataStatus === 'complete' && planets.length > 0) ? 'high' : 'medium';

      return { score, factors, confidence: conf as 'high' | 'medium' | 'low' };
    };

    const cosmicEnergy = calculateCategory('energy');
    const love = calculateCategory('love');
    const career = calculateCategory('career');
    const wealth = calculateCategory('wealth');

    const result: DailyPersonalizedInsights = {
      schemaVersion: '1.0',
      calculationVersion: CACHE_VERSION,
      profileId: dailyData.profileId,
      localDate: dailyData.localDate,
      timezone: dailyData.timezone,
      cosmicEnergy,
      love,
      career,
      wealth,
      generatedAt: new Date().toISOString(),
      dataStatus: dailyData.dataStatus,
      unavailableInputs: dailyData.unavailableFields,
      scoringAvailable: true
    };

    if (dailyData.dataStatus !== 'partial') {
      memoryCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
    }

    return result;
    })();

    inFlightInsights.set(cacheKey, fetchPromise);
    try {
      return await fetchPromise;
    } finally {
      inFlightInsights.delete(cacheKey);
    }
  }
}

export const dailyInsightsService = new DailyInsightsService();
