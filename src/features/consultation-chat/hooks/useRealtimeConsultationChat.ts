import { useCallback, useEffect, useState, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { ApiChatRepository } from '../../../repositories/api/apiChatRepository';
import { Message } from '../../../types';

const chatRepository = new ApiChatRepository();

export function useRealtimeConsultationChat(sessionId: string, currentUserRole: 'user' | 'astrologer' = 'user') {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionStatus, setSessionStatus] = useState<string>('');
  const [kundliProfileId, setKundliProfileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const channelRef = useRef<any>(null);

  const refreshMessages = useCallback(async () => {
    if (!sessionId) return;
    try {
      setMessages(await chatRepository.getMessages(sessionId));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load consultation messages.');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const refreshStatus = useCallback(async () => {
    if (!sessionId) return;
    const { data, error: queryError } = await supabase
      .from('consultation_sessions')
      .select('status, kundli_profile_id')
      .eq('id', sessionId)
      .single();
    if (queryError) {
      setError(queryError.message);
      return;
    }
    setSessionStatus(data.status);
    setKundliProfileId(data.kundli_profile_id);
  }, [sessionId]);

  useEffect(() => {
    void Promise.all([refreshMessages(), refreshStatus()]);
    if (!sessionId) return;

    // Prevent initial load from being treated as a reconnect.
    // We use an object to allow mutation inside the closure.
    const subscriptionStatus = { current: 'INITIAL' };

    const channel = supabase
      .channel(`consultation-chat:${sessionId}`, {
        config: {
          broadcast: { self: false },
        },
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'consultation_messages', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          setMessages((current) => {
            const dbMsg = payload.new;

            const newMsg: Message = {
              id: dbMsg.id,
              clientMessageId: dbMsg.client_message_id,
              sessionId: dbMsg.session_id,
              sender: dbMsg.sender || (dbMsg.is_astrologer ? 'astrologer' : 'user'),
              text: dbMsg.message_text || dbMsg.text,
              type: dbMsg.message_type || 'text',
              attachmentUrl: dbMsg.attachment_url,
              attachmentName: dbMsg.attachment_name,
              status: dbMsg.status || 'sent',
              time: dbMsg.created_at || dbMsg.sent_at || new Date().toISOString(),
            };

            const isDuplicate = current.some((m) => {
              if (m.id === newMsg.id) return true;
              if (
                newMsg.clientMessageId &&
                newMsg.clientMessageId.trim() !== '' &&
                m.clientMessageId === newMsg.clientMessageId
              ) {
                return true;
              }
              return false;
            });

            if (isDuplicate) return current;
            return [...current, newMsg];
          });
          
          // If a new message comes in, assume they stopped typing
          setPartnerTyping(false);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'consultation_sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          setSessionStatus((prev) => {
            if (['ENDED', 'REJECTED', 'EXPIRED', 'CANCELLED'].includes(prev)) {
               return prev; // terminal statuses are read-only
            }
            if (payload.new.status) return payload.new.status;
            return prev;
          });
          if (payload.new.kundli_profile_id !== undefined) {
            setKundliProfileId(payload.new.kundli_profile_id);
          }
        }
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload?.sender !== currentUserRole) {
          setPartnerTyping(payload.payload?.isTyping || false);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (subscriptionStatus.current === 'DISCONNECTED') {
            void refreshMessages(); // Re-sync on reconnect exactly once
          }
          subscriptionStatus.current = 'SUBSCRIBED';
        } else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
          subscriptionStatus.current = 'DISCONNECTED';
        }
      });
      
    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [refreshMessages, refreshStatus, sessionId, currentUserRole]);

  const setTyping = useCallback((isTyping: boolean) => {
    if (!channelRef.current) return;
    void channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { isTyping, sender: currentUserRole }
    });
  }, [currentUserRole]);

  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    setIsSending(true);
    setError(null);
    try {
      const message = await chatRepository.sendMessage(sessionId, trimmed, generateId());
      setMessages(current => current.some(item => item.id === message.id) ? current : [...current, message]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to send this message.');
      throw caught;
    } finally {
      setIsSending(false);
    }
  }, [isSending, sessionId]);

  const sendImage = useCallback(async (file: File, caption?: string) => {
    if (isSending) return;
    setIsSending(true);
    setError(null);
    try {
      if (file.size > 5242880) {
        throw new Error('File size exceeds the 5MB limit.');
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        throw new Error('Unsupported image format. Please use JPEG, PNG, or WebP.');
      }

      // 1. Get signed upload URL
      const { signedUrl, token, path } = await chatRepository.getUploadUrl(sessionId, file.type, file.size);

      // 2. Upload directly to Supabase Storage using the signed URL
      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .uploadToSignedUrl(path, token, file, { contentType: file.type });

      if (uploadError) {
        throw new Error('Failed to upload image to storage.');
      }

      // 3. Finalize the message
      const message = await chatRepository.sendMessage(sessionId, caption || '', generateId(), 'image', path);
      setMessages(current => current.some(item => item.id === message.id) ? current : [...current, message]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to send this image.');
      throw caught;
    } finally {
      setIsSending(false);
    }
  }, [isSending, sessionId]);

  return { messages, sessionStatus, kundliProfileId, isLoading, isSending, error, send, sendImage, refreshMessages, partnerTyping, setTyping };
}
