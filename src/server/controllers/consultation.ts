import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types';
import { supabaseAdmin, createAuthClient } from '../config/supabase';
import { ApiError } from '../errors/ApiError';

type SessionRow = Record<string, unknown> & {
  id: string;
  user_id: string;
  astrologer_id: string | null;
  status: string;
};

type RpcResult = Record<string, unknown> & {
  session?: SessionRow | null;
  balance?: number | string;
};

const serializeSession = (row: SessionRow | null) => {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    astrologerId: row.astrologer_id,
    customerDisplayName: row.customer_display_name ?? undefined,
    status: row.status,
    ratePerMinute: Number(row.rate_per_minute),
    requestedAt: row.requested_at,
    createdAt: row.requested_at,
    startedAt: row.started_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
    lastBilledAt: row.last_billed_at ?? undefined,
    billedMinutes: Number(row.billed_minutes),
    totalCharged: Number(row.total_charged),
    elapsedSeconds: Number(row.elapsed_seconds),
    rechargeDeadlineAt: row.recharge_deadline_at ?? undefined,
  };
};

const requireAssignedAstrologerSession = async (sessionId: string, userId: string) => {
  const { data, error } = await supabaseAdmin
    .from('consultation_sessions')
    .select('*, astrologers!inner(user_id, is_published)')
    .eq('id', sessionId)
    .eq('astrologers.user_id', userId)
    .eq('astrologers.is_published', true)
    .single();

  if (error || !data) throw new ApiError(404, 'Assigned consultation not found');
  return data as unknown as SessionRow;
};

const requireOwnedSession = async (sessionId: string, userId: string) => {
  const { data, error } = await supabaseAdmin
    .from('consultation_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error || !data) throw new ApiError(404, 'Session not found');
  if (data.user_id !== userId) throw new ApiError(403, 'Unauthorized access to session');
  return data as SessionRow;
};

const runSessionRpc = async (name: string, args: Record<string, unknown>) => {
  const { data, error } = await supabaseAdmin.rpc(name, args);
  if (error) throw new ApiError(409, error.message);
  return data as RpcResult;
};

const serializeRpcResult = (result: RpcResult) => ({
  ...result,
  balance: result.balance === undefined ? undefined : Number(result.balance),
  session: serializeSession(result.session ?? null),
});

export const createSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let resolvedProfileId = req.body.kundliProfileId || null;

    if (!resolvedProfileId) {
      // 1. Try to find owned is_default = true profile
      // 2. Try to find owned relation = 'self' profile
      const { data: profiles } = await supabaseAdmin
        .from('kundli_profiles')
        .select('id, is_default, relation')
        .eq('owner_id', req.user!.id)
        .order('is_default', { ascending: false })
        .order('relation', { ascending: false })
        .limit(20);
        
      if (profiles && profiles.length > 0) {
        const defaultProfile = profiles.find(p => p.is_default);
        if (defaultProfile) {
          resolvedProfileId = defaultProfile.id;
        } else {
          const selfProfile = profiles.find(p => p.relation === 'self');
          if (selfProfile) {
            resolvedProfileId = selfProfile.id;
          }
        }
      }

      // 3. Fallback to ensure_self_kundli_profile RPC
      if (!resolvedProfileId) {
        const userClient = createAuthClient(req.token!);
        const { data, error } = await userClient.rpc('ensure_self_kundli_profile');
        if (!error && data) {
          const rpcResult = data as { profile: any; reason: string };
          if (rpcResult.profile) {
            resolvedProfileId = rpcResult.profile.id;
          }
        }
      }
    }

    const result = await runSessionRpc('create_consultation_session', {
      p_user_id: req.user!.id,
      p_astrologer_id: req.body.astrologerId,
      p_kundli_profile_id: resolvedProfileId,
    });

    const session = result.session as SessionRow | null;
    res.status(result.outcome === 'created' ? 201 : 200).json({
      status: 'success',
      data: {
        ...serializeRpcResult(result),
        ratePerMinute: Number(session?.rate_per_minute ?? result.rate_per_minute),
        minimumMinutes: Number(result.minimum_minutes),
        minimumRequired: Number(result.minimum_required),
        heartbeatIntervalSeconds: Number(result.heartbeat_interval_seconds),
        requestTimeoutSeconds: Number(result.request_timeout_seconds),
        rechargeGraceSeconds: Number(result.recharge_grace_seconds),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getActiveSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('consultation_sessions')
      .select('*')
      .eq('user_id', req.user!.id)
      .in('status', ['ACTIVE', 'LOW_BALANCE', 'RECHARGING', 'WAITING_FOR_ASTROLOGER'])
      .order('requested_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new ApiError(500, 'Database error checking active session');
    res.status(200).json({ status: 'success', data: serializeSession(data as SessionRow | null) });
  } catch (error) {
    next(error);
  }
};

export const listSessions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('consultation_sessions')
      .select('*')
      .eq('user_id', req.user!.id)
      .order('requested_at', { ascending: false })
      .limit(100);

    if (error) throw new ApiError(500, 'Database error loading consultation history');
    res.status(200).json({
      status: 'success',
      data: (data ?? []).map(row => serializeSession(row as SessionRow)),
    });
  } catch (error) {
    next(error);
  }
};

export const getSessionById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const session = await requireOwnedSession(req.params.id, req.user!.id);
    res.status(200).json({ status: 'success', data: serializeSession(session) });
  } catch (error) {
    next(error);
  }
};

export const heartbeatSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await requireOwnedSession(req.params.id, req.user!.id);
    const result = await runSessionRpc('bill_consultation_session', { p_session_id: req.params.id });
    res.status(200).json({ status: 'success', data: serializeRpcResult(result) });
  } catch (error) {
    next(error);
  }
};

export const endSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await requireOwnedSession(req.params.id, req.user!.id);
    const result = await runSessionRpc('finish_consultation_session', {
      p_session_id: req.params.id,
      p_reason: 'user_ended',
    });
    res.status(200).json({ status: 'success', data: serializeRpcResult(result) });
  } catch (error) {
    next(error);
  }
};

export const endAssignedSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await requireAssignedAstrologerSession(req.params.id, req.user!.id);
    const result = await runSessionRpc('finish_consultation_session', {
      p_session_id: req.params.id,
      p_reason: 'astrologer_ended',
    });
    res.status(200).json({ status: 'success', data: serializeRpcResult(result) });
  } catch (error) {
    next(error);
  }
};

export const expireSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await requireOwnedSession(req.params.id, req.user!.id);
    const result = await runSessionRpc('expire_waiting_consultation', { p_session_id: req.params.id });
    res.status(200).json({ status: 'success', data: serializeRpcResult(result) });
  } catch (error) {
    next(error);
  }
};

export const acceptAssignedSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await requireAssignedAstrologerSession(req.params.id, req.user!.id);
    const result = await runSessionRpc('accept_astrologer_consultation', {
      p_session_id: req.params.id,
      p_astrologer_user_id: req.user!.id,
    });
    res.status(200).json({ status: 'success', data: serializeRpcResult(result) });
  } catch (error) {
    next(error);
  }
};

export const rejectAssignedSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await requireAssignedAstrologerSession(req.params.id, req.user!.id);
    const result = await runSessionRpc('reject_astrologer_consultation', {
      p_session_id: req.params.id,
      p_astrologer_user_id: req.user!.id,
    });
    res.status(200).json({ status: 'success', data: serializeRpcResult(result) });
  } catch (error) {
    next(error);
  }
};

export const cancelWaitingSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await requireOwnedSession(req.params.id, req.user!.id);
    const result = await runSessionRpc('cancel_customer_consultation', {
      p_session_id: req.params.id,
      p_customer_user_id: req.user!.id,
    });
    res.status(200).json({ status: 'success', data: serializeRpcResult(result) });
  } catch (error) {
    next(error);
  }
};

export const updateSessionKundliProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.params.id;
    const { kundliProfileId } = req.body;
    
    if (!kundliProfileId) throw new ApiError(400, 'kundliProfileId is required');

    // Verify session ownership and get current state
    const session = await requireOwnedSession(sessionId, req.user!.id);
    
    // Allowed states for updating the profile
    const allowedStates = ['WAITING_FOR_ASTROLOGER', 'ACTIVE', 'LOW_BALANCE', 'RECHARGING'];
    if (!allowedStates.includes(session.status)) {
      throw new ApiError(403, `Cannot switch profile in state ${session.status}`);
    }

    // Verify the requested profile is owned by this user
    const { data: profileCheck, error: profileErr } = await supabaseAdmin
      .from('kundli_profiles')
      .select('id')
      .eq('id', kundliProfileId)
      .eq('owner_id', req.user!.id)
      .single();

    if (profileErr || !profileCheck) {
      throw new ApiError(403, 'Profile not found or not owned by user');
    }

    // Update atomically, ensuring it still matches the status logic just in case
    const { data: updatedSession, error: updateErr } = await supabaseAdmin
      .from('consultation_sessions')
      .update({ kundli_profile_id: kundliProfileId })
      .eq('id', sessionId)
      .eq('user_id', req.user!.id)
      .in('status', allowedStates)
      .select()
      .single();

    if (updateErr || !updatedSession) {
      throw new ApiError(409, 'Failed to update session profile or state changed');
    }

    res.status(200).json({ status: 'success', data: serializeSession(updatedSession as unknown as SessionRow) });
  } catch (error) {
    next(error);
  }
};
