import { Request, Response, NextFunction } from 'express';
import { dailyHoroscopeService } from '../services/dailyHoroscopeService';
import { ZodiacSign, ZODIAC_SIGNS } from '../types/astrologyProvider';
import { ProviderError } from '../errors/ProviderError';
import { ApiError } from '../errors/ApiError';
import { supabaseAdmin } from '../config/supabase';
import type { AuthenticatedRequest } from '../types';
import { KundliCalculationService } from '../services/kundliCalculationService';
import { NavamshaProvider } from '../providers/navamshaProvider';

const navamshaProvider = new NavamshaProvider();
const kundliCalculationService = new KundliCalculationService(navamshaProvider);

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

const handleAstrologyError = (error: any, res: Response, next: NextFunction, feature: 'KUNDLI' | 'DASHA') => {
  // Handle expected operational errors thrown by the service
  if (error && error.statusCode && error.code) {
    return res.status(error.statusCode).json({
      status: 'error',
      code: error.code,
      message: error.message
    });
  }
  
  if (error instanceof ProviderError) {
    let statusCode = 500;
    let code = `${feature}_CALCULATION_FAILED`;
    let message = `We could not calculate this ${feature === 'KUNDLI' ? 'Kundli' : 'Dasha'} right now.`;

    if (error.errorCode === 'PROVIDER_NOT_CONFIGURED') {
      statusCode = 503;
      code = `${feature}_SERVICE_NOT_CONFIGURED`;
      message = `${feature === 'KUNDLI' ? 'Kundli' : 'Dasha'} calculation service is not configured yet.`;
    } else if (['PROVIDER_TIMEOUT', 'PROVIDER_RATE_LIMITED', 'PROVIDER_UNAVAILABLE'].includes(error.errorCode)) {
      statusCode = 503;
      code = `${feature}_TEMPORARILY_UNAVAILABLE`;
      message = `${feature === 'KUNDLI' ? 'Kundli' : 'Dasha'} calculation is temporarily unavailable. Please try again shortly.`;
    } else if (error.errorCode === 'PROVIDER_BAD_RESPONSE') {
      statusCode = 502;
      code = `${feature}_CALCULATION_FAILED`;
      message = `We could not calculate this ${feature === 'KUNDLI' ? 'Kundli' : 'Dasha'} right now.`;
    }

    return res.status(statusCode).json({
      status: 'error',
      code,
      message,
    });
  }
  next(error);
};

export const getKundli = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { profileId } = req.params;

    if (!profileId) {
      return res.status(400).json({ status: 'error', message: 'Profile ID is required' });
    }

    const kundli = await kundliCalculationService.getKundli(profileId, userId);

    return res.status(200).json({
      status: 'success',
      data: kundli,
    });
  } catch (error: any) {
    handleAstrologyError(error, res, next, 'KUNDLI');
  }
};

export const getDasha = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { profileId } = req.params;

    if (!profileId) {
      return res.status(400).json({ status: 'error', message: 'Profile ID is required' });
    }

    const dasha = await kundliCalculationService.getVimshottariDasha(profileId, userId);

    return res.status(200).json({
      status: 'success',
      data: dasha,
    });
  } catch (error: any) {
    handleAstrologyError(error, res, next, 'DASHA');
  }
};
