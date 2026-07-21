import { ApiClient } from './apiClient';
import { ENDPOINTS } from './endpoints';
import { KundliNovaDailyHoroscope, ZodiacSign } from '../../server/types/astrologyProvider';

export class AstrologyApi {
  /**
   * Fetches the daily horoscope for a given zodiac sign.
   */
  static async getDailyHoroscope(zodiac: ZodiacSign): Promise<KundliNovaDailyHoroscope> {
    return ApiClient.get<KundliNovaDailyHoroscope>(ENDPOINTS.ASTROLOGY.DAILY_HOROSCOPE(zodiac));
  }
}
