import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types';
import { supabaseAdmin } from '../config/supabase';
import { ApiError } from '../errors/ApiError';

// Simple in-memory store for idempotency keys (Use Redis in production)
const processedRecharges = new Set<string>();

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

export const rechargeWallet = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id; // Resolved securely from JWT
    const { amount, title, description, referenceType, referenceId, idempotencyKey } = req.body;

    // Idempotency check
    if (processedRecharges.has(idempotencyKey)) {
      throw new ApiError(409, 'Duplicate recharge request detected');
    }

    // Call securely isolated RPC using service role
    const { data, error } = await supabaseAdmin.rpc('recharge_wallet', {
      p_user_id: userId,
      p_amount: amount,
      p_title: title,
      p_description: description || null,
      p_ref_type: referenceType,
      p_ref_id: referenceId || null,
    });

    if (error) {
      throw new ApiError(500, `Recharge failed: ${error.message}`);
    }

    // Mark key as processed
    processedRecharges.add(idempotencyKey);
    // Cleanup key after 24h to prevent memory leak (simplified for Phase 2 proxy)
    setTimeout(() => processedRecharges.delete(idempotencyKey), 1000 * 60 * 60 * 24);

    res.status(200).json({
      status: 'success',
      message: 'Wallet recharged successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};
