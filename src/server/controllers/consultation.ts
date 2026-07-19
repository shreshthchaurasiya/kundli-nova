import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types';
import { supabaseAdmin } from '../config/supabase';
import { ApiError } from '../errors/ApiError';

export const createSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { astrologerId, ratePerMinute } = req.body;

    const { data, error } = await supabaseAdmin
      .from('consultation_sessions')
      .insert({
        user_id: userId,
        astrologer_id: astrologerId,
        rate_per_minute: ratePerMinute,
        status: 'CHECKING_WALLET', // Or whatever initial state makes sense
      })
      .select()
      .single();

    if (error) {
      throw new ApiError(500, `Failed to create session: ${error.message}`);
    }

    res.status(201).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getActiveSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabaseAdmin
      .from('consultation_sessions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['ACTIVE', 'LOW_BALANCE', 'WAITING_FOR_ASTROLOGER', 'CHECKING_WALLET'])
      .order('requested_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new ApiError(500, 'Database error checking active session');
    }

    res.status(200).json({
      status: 'success',
      data: data || null,
    });
  } catch (error) {
    next(error);
  }
};

export const getSessionById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id;

    const { data, error } = await supabaseAdmin
      .from('consultation_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error || !data) {
      throw new ApiError(404, 'Session not found');
    }

    // Verify ownership securely
    if (data.user_id !== userId) {
      throw new ApiError(403, 'Unauthorized access to session');
    }

    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const heartbeatSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id;

    // 1. First Verify Ownership
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('consultation_sessions')
      .select('user_id, status')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      throw new ApiError(404, 'Session not found');
    }

    if (session.user_id !== userId) {
      throw new ApiError(403, 'Unauthorized access to session');
    }

    // 2. Call transactional RPC to calculate elapsed time, update billing fields, and charge wallet
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('bill_consultation_session', {
      p_session_id: sessionId,
    });

    if (rpcError) {
      throw new ApiError(500, `Billing RPC failed: ${rpcError.message}`);
    }

    res.status(200).json({
      status: 'success',
      data: rpcResult,
    });
  } catch (error) {
    next(error);
  }
};

export const endSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id;

    // First ensure ownership
    const { data: checkData, error: checkError } = await supabaseAdmin
      .from('consultation_sessions')
      .select('user_id')
      .eq('id', sessionId)
      .single();

    if (checkError || !checkData || checkData.user_id !== userId) {
      throw new ApiError(403, 'Unauthorized');
    }

    // Call final heartbeat to clear out any remaining due balance
    await supabaseAdmin.rpc('bill_consultation_session', {
      p_session_id: sessionId,
    });

    // Mark as ended
    const { data, error } = await supabaseAdmin
      .from('consultation_sessions')
      .update({ status: 'ENDED', ended_at: new Date().toISOString() })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      throw new ApiError(500, `Failed to end session: ${error.message}`);
    }

    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};
