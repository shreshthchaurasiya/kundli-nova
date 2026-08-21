import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import type { AuthenticatedRequest } from '../types';
import { ApiError } from '../errors/ApiError';
import { v4 as uuidv4 } from 'uuid';

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

export const getUploadUrl = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { id: sessionId } = req.params;
    const { mimeType, sizeBytes } = req.body;

    const { session } = await requireParticipant(sessionId, userId);
    if (!['ACTIVE', 'LOW_BALANCE', 'RECHARGING'].includes(session.status)) {
      throw new ApiError(409, 'Uploads are only allowed during an active consultation');
    }

    if (sizeBytes > 5242880) {
      throw new ApiError(400, 'File size exceeds the 5MB limit');
    }

    let ext = '';
    if (mimeType === 'image/jpeg') ext = 'jpg';
    else if (mimeType === 'image/png') ext = 'png';
    else if (mimeType === 'image/webp') ext = 'webp';
    else throw new ApiError(400, 'Unsupported MIME type');

    const fileName = `${uuidv4()}.${ext}`;
    const path = `consultations/${sessionId}/${fileName}`;

    // Create a signed upload URL via Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('chat-attachments')
      .createSignedUploadUrl(path, { upsert: false });

    if (error || !data) {
      throw new ApiError(500, 'Failed to generate upload URL');
    }

    res.json({
      status: 'success',
      data: {
        signedUrl: data.signedUrl,
        token: data.token,
        path
      }
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
    const { text, client_message_id, message_type, attachment_url } = req.body;

    const { session, sender } = await requireParticipant(sessionId, userId);
    if (!['ACTIVE', 'LOW_BALANCE', 'RECHARGING'].includes(session.status)) {
      throw new ApiError(409, 'Messages can only be sent during an active consultation');
    }

    let resolvedMetadata = {};
    const isImage = message_type === 'image';

    if (isImage) {
      if (!attachment_url || typeof attachment_url !== 'string' || !attachment_url.startsWith(`consultations/${sessionId}/`)) {
        throw new ApiError(400, 'Invalid attachment path');
      }

      // Check if attachment is already bound to another message
      const { data: existingBinding } = await supabaseAdmin
        .from('consultation_messages')
        .select('id, client_message_id')
        .eq('attachment_url', attachment_url)
        .neq('client_message_id', client_message_id)
        .limit(1);
      
      if (existingBinding && existingBinding.length > 0) {
        throw new ApiError(400, 'Attachment path is already bound to another message');
      }

      // Verify the object exists in Storage and get its metadata
      // list() because stat/info might not be exposed as a simple direct API in older js clients
      // wait, we can just list the folder and find the object, but there is no get() or stat()
      // Actually we can download it to check? No, too slow. 
      // Supabase storage JS client doesn't have an easy stat() for objects but we can use list()
      const folderName = `consultations/${sessionId}`;
      const fileName = attachment_url.split('/').pop()!;
      const { data: files, error: listError } = await supabaseAdmin.storage
        .from('chat-attachments')
        .list(folderName, { search: fileName, limit: 1 });

      if (listError || !files || files.length === 0) {
        throw new ApiError(404, 'Attachment object not found in storage');
      }
      
      const fileMeta = files[0];
      if (fileMeta.name !== fileName) {
        throw new ApiError(404, 'Attachment object not found in storage');
      }

      const mime = fileMeta.metadata?.mimetype;
      const size = fileMeta.metadata?.size;
      
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
        throw new ApiError(400, 'Actual storage object MIME type is unsupported');
      }
      if (size > 5242880) {
        throw new ApiError(400, 'Actual storage object size exceeds 5MB');
      }

      resolvedMetadata = { mimeType: mime, sizeBytes: size };
    }

    const messagePayload = {
      session_id: sessionId,
      sender,
      sender_user_id: userId,
      client_message_id,
      message_text: text || null,
      message_type: message_type || 'text',
      attachment_url: isImage ? attachment_url : null,
      metadata: resolvedMetadata
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
    } else if (error && isImage) {
      // Orphan cleanup logic: failed to insert message and wasn't a duplicate client_message_id
      // Ensure no message references this attachment before deletion
      const { data: refCheck } = await supabaseAdmin
        .from('consultation_messages')
        .select('id')
        .eq('attachment_url', attachment_url)
        .limit(1);
        
      if (!refCheck || refCheck.length === 0) {
        supabaseAdmin.storage
          .from('chat-attachments')
          .remove([attachment_url])
          .then(({ error: delErr }) => {
            if (delErr) console.error('Failed to cleanup orphan attachment:', attachment_url, delErr);
          });
      }
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
