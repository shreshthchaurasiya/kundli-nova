import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { ApiError } from '../errors/ApiError';
import { env } from '../config/env';

export const devLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Only allow in development mode
    if (env.VITE_AUTH_MODE !== 'development') {
      throw new ApiError(403, 'Development login is disabled in production.');
    }

    const { phone } = req.body;
    if (!phone) {
      throw new ApiError(400, 'Phone number is required.');
    }

    // 1. Try to find the user in public.profiles first to see if they already exist
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .single();

    if (profile) {
      // 2. User exists, update password using Admin API
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
        password: 'dev-password-123',
        phone_confirm: true
      });

      if (updateError) {
        throw new ApiError(500, `Failed to update user: ${updateError.message}`);
      }
    } else {
      // 3. User does not exist, create using Admin API
      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        phone,
        password: 'dev-password-123',
        phone_confirm: true
      });

      if (createError) {
        // Fallback if user already exists in auth.users but not in profiles
        if (createError.message.includes('already exists') || createError.message.includes('unique')) {
          const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          if (listError) {
            throw new ApiError(500, `Failed to find existing user: ${listError.message}`);
          }
          const existingUser = users.find((u: any) => u.phone === phone);
          if (existingUser) {
            await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
              password: 'dev-password-123',
              phone_confirm: true
            });
          } else {
            throw new ApiError(500, `Failed to create user: ${createError.message}`);
          }
        } else {
          throw new ApiError(500, `Failed to create user: ${createError.message}`);
        }
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Dev user authenticated successfully.'
    });
  } catch (error) {
    next(error);
  }
};
