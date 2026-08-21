import { Response, NextFunction } from 'express';
import { supabaseAdmin, createAuthClient } from '../config/supabase';
import type { AuthenticatedRequest } from '../types';
import { ApiError } from '../errors/ApiError';
import { z } from 'zod';
import { ApiNinjasLocationResolver } from '../providers/apiNinjasLocationResolver';

const kundliProfileSchema = z.object({
  name: z.string().min(1).max(100),
  relation: z.string().min(1).max(50),
  gender: z.enum(['male', 'female', 'other']),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD'),
  tob: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Format must be HH:MM or HH:MM:SS'),
  birth_state: z.string().min(1).max(100),
  birth_district: z.string().min(1).max(100),
  birth_city: z.string().min(1).max(100),
  is_default: z.boolean().optional(),
});

export const listKundliProfiles = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { data, error } = await supabaseAdmin
      .from('kundli_profiles')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new ApiError(500, 'Failed to fetch kundli profiles');
    }

    res.json({
      status: 'success',
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

export const getKundliProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      throw new ApiError(400, 'Invalid profile ID');
    }

    const { data, error } = await supabaseAdmin
      .from('kundli_profiles')
      .select('*')
      .eq('id', id)
      .eq('owner_id', userId)
      .maybeSingle();

    if (error) {
      throw new ApiError(500, 'Failed to fetch kundli profile');
    }

    if (!data) {
      throw new ApiError(404, 'Kundli profile not found');
    }

    res.json({
      status: 'success',
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

export const createKundliProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const validatedData = kundliProfileSchema.parse(req.body);

    const locationResolver = new ApiNinjasLocationResolver();
    const location = await locationResolver.resolve({
      city: validatedData.birth_city,
      district: validatedData.birth_district,
      state: validatedData.birth_state,
      country: 'India',
    });

    const newProfile = {
      ...validatedData,
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone,
      owner_id: userId,
    };

    const { data, error } = await supabaseAdmin
      .from('kundli_profiles')
      .insert(newProfile)
      .select()
      .maybeSingle();

    if (error) {
      throw new ApiError(500, 'Failed to create kundli profile');
    }

    res.json({
      status: 'success',
      data: data,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ApiError(400, 'Validation error: ' + (error as any).errors[0].message));
    } else {
      next(error);
    }
  }
};

export const updateKundliProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      throw new ApiError(400, 'Invalid profile ID');
    }

    const validatedData = kundliProfileSchema.partial().parse(req.body);

    if (Object.keys(validatedData).length === 0) {
      throw new ApiError(400, 'No valid fields to update');
    }

    const payloadToUpdate: any = { ...validatedData };

    if (validatedData.birth_city || validatedData.birth_state) {
      // Need to fetch current profile to get full city/state for resolution if one is missing
      const { data: currentProfile } = await supabaseAdmin
        .from('kundli_profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (currentProfile) {
        const locationResolver = new ApiNinjasLocationResolver();
        const location = await locationResolver.resolve({
          city: validatedData.birth_city || currentProfile.birth_city,
          district: validatedData.birth_district || currentProfile.birth_district,
          state: validatedData.birth_state || currentProfile.birth_state,
          country: 'India',
        });
        payloadToUpdate.latitude = location.latitude;
        payloadToUpdate.longitude = location.longitude;
        payloadToUpdate.timezone = location.timezone;
      }
    }

    const { data, error } = await supabaseAdmin
      .from('kundli_profiles')
      .update(payloadToUpdate)
      .eq('id', id)
      .eq('owner_id', userId)
      .select()
      .maybeSingle();

    if (error) {
      throw new ApiError(500, 'Failed to update kundli profile');
    }

    if (!data) {
      throw new ApiError(404, 'Kundli profile not found');
    }

    res.json({
      status: 'success',
      data: data,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ApiError(400, 'Validation error: ' + (error as any).errors[0].message));
    } else {
      next(error);
    }
  }
};

export const deleteKundliProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      throw new ApiError(400, 'Invalid profile ID');
    }

    // Attempt to delete and return the deleted row to confirm it existed
    const { data, error } = await supabaseAdmin
      .from('kundli_profiles')
      .delete()
      .eq('id', id)
      .eq('owner_id', userId)
      .select()
      .maybeSingle();

    if (error) {
      throw new ApiError(500, 'Failed to delete kundli profile');
    }

    if (!data) {
      throw new ApiError(404, 'Kundli profile not found');
    }

    res.json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /kundli-profiles/sync-self
 *
 * Ensures the authenticated user has exactly one canonical self Kundli profile.
 * Delegates entirely to the ensure_self_kundli_profile() SECURITY DEFINER RPC
 * so that owner_id is derived from auth.uid() inside Postgres — never from client
 * request input.
 *
 * Authentication method:
 *   createAuthClient(req.token) creates a Supabase client scoped to the user's
 *   JWT. This makes auth.uid() resolve to the customer's UUID inside the RPC.
 *   supabaseAdmin is NOT used here because with the service role auth.uid() = NULL.
 *
 * Response contract (always 200 for product-level outcomes):
 *   { status: 'success', data: <profile | null>, reason: 'CREATED'|'EXISTING'|'INCOMPLETE_BIRTH_DETAILS' }
 *   401 — unauthenticated
 *   500 — unexpected DB failure
 */
export const ensureSelfKundliProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Use the user's own JWT so auth.uid() is populated inside the RPC.
    const userClient = createAuthClient(req.token!);

    const { data, error } = await userClient.rpc('ensure_self_kundli_profile');

    if (error) {
      if (error.message && error.message.includes('User profile not found')) {
        return res.json({
          status: 'success',
          data: null,
          reason: 'INCOMPLETE_BIRTH_DETAILS',
        });
      }
      // The RPC raises EXCEPTION for auth failures — surface those as 500.
      throw new ApiError(500, `Sync failed: ${error.message}`);
    }

    const rpcResult = data as { profile: Record<string, unknown> | null; reason: string };

    // If the RPC returned a profile but it is missing geocoordinates (i.e. it was
    // created by an earlier version of sync-self that did not geocode), resolve and
    // persist coordinates now.  Non-fatal: if geocoding fails we still return the
    // profile — the frontend geocode gate in NovaKundliScreen will surface the error.
    let enrichedProfile = rpcResult.profile;
    if (
      enrichedProfile &&
      (enrichedProfile.latitude == null ||
        enrichedProfile.longitude == null ||
        !enrichedProfile.timezone)
    ) {
      try {
        const profileId = enrichedProfile.id as string;
        const birth_city = enrichedProfile.birth_city as string;
        const birth_district = enrichedProfile.birth_district as string;
        const birth_state = enrichedProfile.birth_state as string;

        if (birth_city && birth_state) {
          const locationResolver = new ApiNinjasLocationResolver();
          const location = await locationResolver.resolve({
            city: birth_city,
            district: birth_district || birth_city,
            state: birth_state,
            country: 'India',
          });

          const { data: updatedRow, error: updateError } = await supabaseAdmin
            .from('kundli_profiles')
            .update({
              latitude: location.latitude,
              longitude: location.longitude,
              timezone: location.timezone,
            })
            .eq('id', profileId)
            .select()
            .maybeSingle();

          if (!updateError && updatedRow) {
            enrichedProfile = updatedRow;
          }
        }
      } catch (_geocodeErr) {
        // Geocoding is best-effort during sync-self.  Existing data is still
        // returned; the frontend will surface the error when the user opens
        // View Kundli or Nova AI.
      }
    }

    res.json({
      status: 'success',
      data: enrichedProfile ?? null,
      reason: rpcResult.reason,
    });
  } catch (error) {
    next(error);
  }
};
