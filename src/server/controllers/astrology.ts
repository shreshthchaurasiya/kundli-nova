import { Request, Response, NextFunction } from 'express';
import { dailyHoroscopeService } from '../services/dailyHoroscopeService';
import { ZodiacSign, ZODIAC_SIGNS } from '../types/astrologyProvider';
import { ProviderError } from '../errors/ProviderError';

export const getDailyHoroscope = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { zodiac } = req.query;

    if (!zodiac || typeof zodiac !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'Zodiac sign is required as a query parameter.',
      });
    }

    const zodiacLower = zodiac.toLowerCase() as ZodiacSign;

    if (!ZODIAC_SIGNS.includes(zodiacLower)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid zodiac sign: ${zodiac}. Must be one of ${ZODIAC_SIGNS.join(', ')}.`,
      });
    }

    const horoscope = await dailyHoroscopeService.getDailyHoroscope(zodiacLower);

    return res.status(200).json({
      status: 'success',
      data: horoscope,
    });
  } catch (error) {
    if (error instanceof ProviderError) {
      return next(error);
    }
    next(error);
  }
};
