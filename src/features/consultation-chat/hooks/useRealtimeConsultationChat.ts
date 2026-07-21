import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { ApiChatRepository } from '../../../repositories/api/apiChatRepository';
import { Message } from '../../../types';

const chatRepository = new ApiChatRepository();

export function useRealtimeConsultationChat(sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionStatus, setSessionStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      .select('status')
      .eq('id', sessionId)
      .single();
    if (queryError) {
      setError(queryError.message);
      return;
    }
    setSessionStatus(data.status);
  }, [sessionId]);

  useEffect(() => {
    void Promise.all([refreshMessages(), refreshStatus()]);
    if (!sessionId) return;

    // Prevent initial load from being treated as a reconnect.
    // We use an object to allow mutation inside the closure.
    const subscriptionStatus = { current: 'INITIAL' };

    const channel = supabase
      .channel(`consultation-chat:${sessionId}`)
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
        }
      )
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

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshMessages, refreshStatus, sessionId]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    setIsSending(true);
    setError(null);
    try {
      const message = await chatRepository.sendMessage(sessionId, trimmed, crypto.randomUUID());
      setMessages(current => current.some(item => item.id === message.id) ? current : [...current, message]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to send this message.');
      throw caught;
    } finally {
      setIsSending(false);
    }
  }, [isSending, sessionId]);

  return { messages, sessionStatus, isLoading, isSending, error, send, refreshMessages };
}
