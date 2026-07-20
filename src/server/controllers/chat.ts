import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import type { AuthenticatedRequest } from '../types';
import { ApiError } from '../errors/ApiError';

type ParticipantSession = {
  user_id: string;
  astrologer_id: string | null;
  status: string;
  astrologers: { user_id: string; is_published: boolean } | null;
};

const requireParticipant = async (sessionId: string, userId: string): Promise<{
  session: ParticipantSession;
  sender: 'user' | 'astrologer';
}> => {
  const { data, error } = await supabaseAdmin
    .from('consultation_sessions')
    .select('user_id, astrologer_id, status, astrologers(user_id, is_published)')
    .eq('id', sessionId)
    .single();

  if (error || !data) throw new ApiError(404, 'Consultation session not found');
  const session = data as unknown as ParticipantSession;
  if (session.user_id === userId) return { session, sender: 'user' };
  if (session.astrologers?.user_id === userId && session.astrologers.is_published) {
    return { session, sender: 'astrologer' };
  }
  throw new ApiError(403, 'You are not a participant in this consultation');
};

const serializeMessage = (row: Record<string, unknown>) => ({
  id: row.id,
  clientMessageId: row.client_message_id,
  sessionId: row.session_id,
  sender: row.sender,
  text: row.message_text ?? undefined,
  type: row.message_type,
  attachmentUrl: row.attachment_url ?? undefined,
  attachmentName: row.attachment_name ?? undefined,
  status: row.status,
  time: row.created_at,
});

export const getMessages = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { id: sessionId } = req.params;

    await requireParticipant(sessionId, userId);

    const { data: messages, error } = await supabaseAdmin
      .from('consultation_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new ApiError(500, 'Failed to fetch messages');
    }

    res.json({
      status: 'success',
      data: (messages ?? []).map(row => serializeMessage(row as Record<string, unknown>)),
    });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { id: sessionId } = req.params;
    const { text, client_message_id } = req.body;

    const { session, sender } = await requireParticipant(sessionId, userId);
    if (!['ACTIVE', 'LOW_BALANCE', 'RECHARGING'].includes(session.status)) {
      throw new ApiError(409, 'Messages can only be sent during an active consultation');
    }

    // Insert message (RLS handles exact verification but we pre-verified above for safety too)
    const messagePayload = {
      session_id: sessionId,
      sender,
      sender_user_id: userId,
      client_message_id,
      message_text: text,
    };
    let { data: message, error } = await supabaseAdmin
      .from('consultation_messages')
      .insert(messagePayload)
      .select()
      .single();

    if (error?.code === '23505') {
      const existing = await supabaseAdmin
        .from('consultation_messages')
        .select('*')
        .eq('session_id', sessionId)
        .eq('client_message_id', client_message_id)
        .single();
      message = existing.data;
      error = existing.error;
    }

    if (error) {
      throw new ApiError(500, 'Failed to send message');
    }

    res.json({
      status: 'success',
      data: serializeMessage(message as Record<string, unknown>),
    });
  } catch (error) {
    next(error);
  }
};
