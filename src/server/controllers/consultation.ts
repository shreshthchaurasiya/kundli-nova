import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types';
import { supabaseAdmin } from '../config/supabase';
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
    const result = await runSessionRpc('create_consultation_session', {
      p_user_id: req.user!.id,
      p_astrologer_id: req.body.astrologerId,
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
