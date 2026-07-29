import { ApiClient } from './apiClient';
import { ENDPOINTS } from './endpoints';
import { KundliNovaDailyHoroscope, ZodiacSign, KundliNovaNatalChart, KundliNovaVimshottariDasha, KundliNovaDoshaAnalysis, KundliNovaYogaAnalysis, KundliNovaCompatibilityAnalysis } from '../../server/types/astrologyProvider';

export class AstrologyApi {
  /**
   * Fetches the daily horoscope for a given zodiac sign.
   * @param zodiac The lowercase zodiac sign (e.g., 'aries', 'taurus')
   */
  static async getDailyHoroscope(zodiac: ZodiacSign | string): Promise<KundliNovaDailyHoroscope> {
    return ApiClient.get<KundliNovaDailyHoroscope>(ENDPOINTS.ASTROLOGY.DAILY_HOROSCOPE(zodiac));
  }
  
  /**
   * Fetches the generated Kundli for a given profile ID.
   * @param profileId The ID of the saved Kundli profile
   */
  static async getKundli(profileId: string): Promise<KundliNovaNatalChart> {
    return ApiClient.get<KundliNovaNatalChart>(ENDPOINTS.ASTROLOGY.GET_KUNDLI(profileId));
  }

  /**
   * Fetches the Vimshottari Dasha for a given profile ID.
   * @param profileId The ID of the saved Kundli profile
   */
  static async getDasha(profileId: string): Promise<KundliNovaVimshottariDasha> {
    return ApiClient.get<KundliNovaVimshottariDasha>(ENDPOINTS.ASTROLOGY.GET_DASHA(profileId));
  }

  /**
   * Fetches the Dosha analysis for a given profile ID.
   * @param profileId The ID of the saved Kundli profile
   */
  static async getDoshaAnalysis(profileId: string): Promise<KundliNovaDoshaAnalysis> {
    return ApiClient.get<KundliNovaDoshaAnalysis>(ENDPOINTS.ASTROLOGY.GET_DOSHA(profileId));
  }

  /**
   * Fetches the Yoga analysis for a given profile ID.
   * @param profileId The ID of the saved Kundli profile
   */
  static async getYogaAnalysis(profileId: string): Promise<KundliNovaYogaAnalysis> {
    return ApiClient.get<KundliNovaYogaAnalysis>(ENDPOINTS.ASTROLOGY.GET_YOGA(profileId));
  }

  /**
   * Fetches the unified compatibility analysis (Ashtakoota + Manglik) between two profile IDs.
   * @param profileAId The ID of the first saved Kundli profile
   * @param profileBId The ID of the second saved Kundli profile
   */
  static async getCompatibility(profileAId: string, profileBId: string): Promise<{ compatibility: KundliNovaCompatibilityAnalysis; manglik: import('../../server/types/astrologyProvider').KundliNovaManglikAnalysis }> {
    return ApiClient.get<{ compatibility: KundliNovaCompatibilityAnalysis; manglik: import('../../server/types/astrologyProvider').KundliNovaManglikAnalysis }>(ENDPOINTS.ASTROLOGY.GET_COMPATIBILITY(profileAId, profileBId));
  }

  static async getDetailedKundliReport(profileId: string): Promise<import('../../server/types/astrologyProvider').KundliNovaDetailedReport> {
    // Increase timeout to 300s for massive AI generation (8 pages)
    return ApiClient.get<import('../../server/types/astrologyProvider').KundliNovaDetailedReport>(
      ENDPOINTS.ASTROLOGY.GET_DETAILED_KUNDLI_REPORT(profileId),
      { timeout: 360000 }
    );
  }
}


