import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import type { AuthenticatedRequest } from '../types';
import { ApiError } from '../errors/ApiError';
import { v4 as uuidv4 } from 'uuid';

export const listKundliProfiles = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { data, error } = await supabaseAdmin
      .from('kundli_reports')
      .select('*')
      .eq('user_id', userId)
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

    const { data, error } = await supabaseAdmin
      .from('kundli_reports')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new ApiError(404, 'Kundli profile not found');
      }
      throw new ApiError(500, 'Failed to fetch kundli profile');
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
    // Assuming req.body matches schema
    const newProfile = {
      ...req.body,
      id: uuidv4(),
      user_id: userId,
    };

    const { data, error } = await supabaseAdmin
      .from('kundli_reports')
      .insert(newProfile)
      .select()
      .single();

    if (error) {
      throw new ApiError(500, 'Failed to create kundli profile');
    }

    res.json({
      status: 'success',
      data: data,
    });
  } catch (error) {
    next(error);
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
    const updates = req.body;
    
    delete updates.id;
    delete updates.user_id;

    const { data, error } = await supabaseAdmin
      .from('kundli_reports')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new ApiError(404, 'Kundli profile not found');
      }
      throw new ApiError(500, 'Failed to update kundli profile');
    }

    res.json({
      status: 'success',
      data: data,
    });
  } catch (error) {
    next(error);
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

    const { error } = await supabaseAdmin
      .from('kundli_reports')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new ApiError(500, 'Failed to delete kundli profile');
    }

    res.json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
