import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import type { AuthenticatedRequest } from '../types';
import { ApiError } from '../errors/ApiError';

export const getMessages = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { id: sessionId } = req.params;

    // Verify user owns the session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('consultation_sessions')
      .select('user_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || session?.user_id !== userId) {
      throw new ApiError(403, 'Forbidden');
    }

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
      data: messages,
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

    // Verify user owns the session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('consultation_sessions')
      .select('user_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || session?.user_id !== userId) {
      throw new ApiError(403, 'Forbidden');
    }

    // Insert message (RLS handles exact verification but we pre-verified above for safety too)
    const { data: message, error } = await supabaseAdmin
      .from('consultation_messages')
      .insert({
        session_id: sessionId,
        sender: 'user',
        message_text: text,
      })
      .select()
      .single();

    if (error) {
      throw new ApiError(500, 'Failed to send message');
    }

    res.json({
      status: 'success',
      data: message,
    });
  } catch (error) {
    next(error);
  }
};
