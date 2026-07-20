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

    const channel = supabase
      .channel(`consultation-chat:${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'consultation_messages', filter: `session_id=eq.${sessionId}` },
        () => void refreshMessages(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'consultation_sessions', filter: `id=eq.${sessionId}` },
        () => void refreshStatus(),
      )
      .subscribe();

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
