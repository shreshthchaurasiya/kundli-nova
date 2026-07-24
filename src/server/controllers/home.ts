import { Response, NextFunction } from 'express';
import { homeService } from '../services/homeService';
import { AuthenticatedRequest } from '../types';

export const getHomePersonalized = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { profileId } = req.query;

    const data = await homeService.getHomePersonalized(userId, profileId as string | undefined);
    
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
