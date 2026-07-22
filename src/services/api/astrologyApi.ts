import { ApiClient } from './apiClient';
import { ENDPOINTS } from './endpoints';
import { KundliNovaDailyHoroscope, ZodiacSign, KundliNovaNatalChart, KundliNovaVimshottariDasha } from '../../server/types/astrologyProvider';

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
}
