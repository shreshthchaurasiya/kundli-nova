import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthenticatedRequest, AuthUser } from '../types';
import { ApiError } from '../errors/ApiError';

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Unauthorized: Missing or invalid token format');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new ApiError(401, 'Unauthorized: Token missing');
    }

    // Verify token with Supabase Admin client
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      console.warn(`[Auth] Token verification failed: ${error?.message || 'User not found'}`);
      throw new ApiError(401, 'Unauthorized: Invalid or expired token');
    }

    // Attach user and token to request object
    req.user = user as AuthUser;
    req.token = token;
    
    next();
  } catch (error) {
    next(error);
  }
};
