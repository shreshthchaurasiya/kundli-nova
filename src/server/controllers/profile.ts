import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import type { AuthenticatedRequest } from '../types';
import { ApiError } from '../errors/ApiError';

/**
 * Maps frontend field names to DB column names for the profiles table.
 * Frontend sends: state, district, city
 * DB stores:      birth_state, birth_district, birth_city
 */
function toDbFields(body: Record<string, any>): Record<string, any> {
  const mapped: Record<string, any> = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === 'state') mapped['birth_state'] = value;
    else if (key === 'district') mapped['birth_district'] = value;
    else if (key === 'city') mapped['birth_city'] = value;
    else mapped[key] = value;
  }
  return mapped;
}

/**
 * Maps DB column names back to frontend field names when reading.
 * DB returns:       birth_state, birth_district, birth_city
 * Frontend expects: state, district, city
 */
function fromDbFields(profile: Record<string, any>): Record<string, any> {
  const mapped: Record<string, any> = { ...profile };
  if ('birth_state' in profile) {
    mapped['state'] = profile['birth_state'];
    delete mapped['birth_state'];
  }
  if ('birth_district' in profile) {
    mapped['district'] = profile['birth_district'];
    delete mapped['birth_district'];
  }
  if ('birth_city' in profile) {
    mapped['city'] = profile['birth_city'];
    delete mapped['birth_city'];
  }
  return mapped;
}

export const getProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new ApiError(500, 'Failed to fetch profile');
    }

    res.json({
      status: 'success',
      data: profile ? fromDbFields(profile) : null,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const rawUpdates = { ...req.body };

    // Security: never allow client to set id or phone
    delete rawUpdates.id;
    delete rawUpdates.phone;

    // Map frontend field names → DB column names
    const updates = toDbFields(rawUpdates);
    updates.updated_at = new Date().toISOString();

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: userId, ...updates }, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      throw new ApiError(500, 'Failed to update profile');
    }

    res.json({
      status: 'success',
      data: profile ? fromDbFields(profile) : null,
    });
  } catch (error) {
    next(error);
  }
};
