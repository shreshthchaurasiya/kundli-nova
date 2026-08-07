import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types';
import { supabaseAdmin } from '../config/supabase';
import { ApiError } from '../errors/ApiError';

export const getWallet = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { data, error } = await supabaseAdmin
      .from('wallets')
      .select('balance, updated_at')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new ApiError(500, 'Database error fetching wallet');
    }

    res.status(200).json({
      status: 'success',
      data: data || { balance: 0.00 },
    });
  } catch (error) {
    next(error);
  }
};

export const getTransactions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { data, error } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new ApiError(500, 'Database error fetching transactions');
    }

    res.status(200).json({
      status: 'success',
      data: data || [],
    });
  } catch (error) {
    next(error);
  }
};
