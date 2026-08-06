import { Request, Response, NextFunction } from 'express';
import { dailyHoroscopeService } from '../services/dailyHoroscopeService';
import { dailyAstrologyService } from '../services/dailyAstrologyService';
import { dailyInsightsService } from '../services/dailyInsightsService';
import { ZodiacSign, ZODIAC_SIGNS } from '../types/astrologyProvider';
import { ProviderError } from '../errors/ProviderError';
import { ApiError } from '../errors/ApiError';
import { supabaseAdmin } from '../config/supabase';
import type { AuthenticatedRequest } from '../types';
import { KundliCalculationService } from '../services/kundliCalculationService';
import { NavamshaProvider } from '../providers/navamshaProvider';

const navamshaProvider = new NavamshaProvider({ timeoutMs: 15000 });
const kundliCalculationService = new KundliCalculationService(navamshaProvider);

export const getDailyHoroscope = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { zodiac, date } = req.query;

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

    const targetDate = typeof date === 'string' ? date : undefined;
    const horoscope = await dailyHoroscopeService.getDailyHoroscope(zodiacLower, targetDate);

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

const handleAstrologyError = (error: unknown, res: Response, next: NextFunction, feature: 'KUNDLI' | 'DASHA' | 'DOSHA' | 'YOGA' | 'COMPATIBILITY' | 'DETAILED_REPORT') => {
  // Handle expected operational errors thrown by the service
  const err = error as any;
  if (err && err.statusCode && err.code) {
    return res.status(err.statusCode).json({
      status: 'error',
      code: err.code,
      message: err.message
    });
  }
  
  if (error instanceof ProviderError) {
    let statusCode = 500;
    let code = `${feature}_CALCULATION_FAILED`;
    let featureName = feature === 'KUNDLI' ? 'Kundli' : feature === 'DASHA' ? 'Dasha' : feature === 'DOSHA' ? 'Dosha analysis' : feature === 'YOGA' ? 'Yoga analysis' : feature === 'COMPATIBILITY' ? 'Compatibility analysis' : 'Detailed report';
    let message = `We could not calculate this ${featureName} right now.`;

    if (error.errorCode === 'PROVIDER_NOT_CONFIGURED' || error.errorCode === 'PROVIDER_AUTH_ERROR') {
      statusCode = 503;
      code = `${feature}_SERVICE_NOT_CONFIGURED`;
      message = `${feature === 'YOGA' ? 'Yoga analysis will be available after the astrology service is configured.' : feature === 'COMPATIBILITY' ? 'Compatibility analysis will be available after the astrology service is configured.' : featureName + ' calculation service is not configured yet.'}`;
    } else if (['PROVIDER_TIMEOUT', 'PROVIDER_RATE_LIMITED', 'PROVIDER_UNAVAILABLE'].includes(error.errorCode)) {
      statusCode = 503;
      code = `${feature}_TEMPORARILY_UNAVAILABLE`;
      message = `${feature === 'YOGA' ? 'Yoga analysis is temporarily unavailable. Please try again.' : feature === 'COMPATIBILITY' ? 'Compatibility analysis is temporarily unavailable. Please try again.' : featureName + ' calculation is temporarily unavailable. Please try again shortly.'}`;
    } else if (error.errorCode === 'PROVIDER_BAD_RESPONSE') {
      statusCode = 502;
      code = `${feature}_CALCULATION_FAILED`;
      message = `We could not generate the ${featureName} right now.`;
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

export const getDosha = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { profileId } = req.params;

    if (!profileId) {
      return res.status(400).json({ status: 'error', message: 'Profile ID is required' });
    }

    const dosha = await kundliCalculationService.getDoshaAnalysis(profileId, userId);

    return res.status(200).json({
      status: 'success',
      data: dosha,
    });
  } catch (error: any) {
    handleAstrologyError(error, res, next, 'DOSHA');
  }
};

export const getYoga = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { profileId } = req.params;

    if (!profileId) {
      return res.status(400).json({ status: 'error', message: 'Profile ID is required' });
    }

    const yoga = await kundliCalculationService.getYogaAnalysis(profileId, userId);

    return res.status(200).json({
      status: 'success',
      data: yoga,
    });
  } catch (error: any) {
    handleAstrologyError(error, res, next, 'YOGA');
  }
};

export const getCompatibility = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { profileAId, profileBId } = req.query;

    if (!profileAId || !profileBId || typeof profileAId !== 'string' || typeof profileBId !== 'string' || profileAId.trim() === '' || profileBId.trim() === '') {
      return res.status(400).json({ status: 'error', code: 'INVALID_COMPATIBILITY_PROFILES', message: 'Please select two valid profiles for Kundli matching.' });
    }

    const [compatibility, manglik] = await Promise.all([
      kundliCalculationService.getCompatibilityAnalysis(profileAId, profileBId, userId),
      kundliCalculationService.getManglikCompatibility(profileAId, profileBId, userId)
    ]);

    return res.status(200).json({
      status: 'success',
      data: {
        compatibility,
        manglik
      },
    });
  } catch (error: any) {
    handleAstrologyError(error, res, next, 'COMPATIBILITY');
  }
};

export const getDetailedKundliReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { profileId } = req.params;

    if (!profileId) {
      return res.status(400).json({ status: 'error', message: 'Profile ID is required' });
    }

    const report = await kundliCalculationService.getDetailedKundliReport(profileId, userId);

    return res.status(200).json({
      status: 'success',
      data: report,
    });
  } catch (error: any) {
    handleAstrologyError(error, res, next, 'DETAILED_REPORT');
  }
};

export const getDailyAstrologyData = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { profileId } = req.query;

    const data = await dailyAstrologyService.getDailyData(userId, profileId as string | undefined);
    
    return res.status(200).json({
      status: 'success',
      data
    });
  } catch (error: any) {
    const message = error.message;
    if (['SELF_PROFILE_NOT_FOUND', 'INCOMPLETE_BIRTH_DATA', 'LOCATION_COORDINATES_MISSING', 'TIMEZONE_MISSING', 'PROVIDER_UNAVAILABLE'].includes(message)) {
      return res.status(400).json({ status: 'error', message, code: message });
    }
    next(error);
  }
};

export const getDailyInsights = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { profileId } = req.query;

    const data = await dailyInsightsService.getDailyInsights(userId, profileId as string | undefined);
    
    return res.status(200).json({
      status: 'success',
      data
    });
  } catch (error: any) {
    const message = error.message;
    if (['SELF_PROFILE_NOT_FOUND', 'INCOMPLETE_BIRTH_DATA', 'LOCATION_COORDINATES_MISSING', 'TIMEZONE_MISSING', 'DAILY_ASTROLOGY_UNAVAILABLE', 'NATAL_CHART_UNAVAILABLE', 'PROVIDER_UNAVAILABLE'].includes(message)) {
      return res.status(400).json({ status: 'error', message, code: message });
    }
    next(error);
  }
};
