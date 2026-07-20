import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, LoaderCircle, Send, ShieldCheck } from 'lucide-react';
import { Screen } from '../../../../types';
import CelestialChatBackground from '../../../../components/chat/CelestialChatBackground';
import { ConsultationMessageBubble, useRealtimeConsultationChat } from '../../../consultation-chat';
import { ApiConsultationRepository } from '../../../../repositories/api/apiConsultationRepository';

const consultationRepository = new ApiConsultationRepository();

interface AstrologerConsultationChatScreenProps {
  sessionId: string;
  customerName?: string;
  startedAt?: string;
  readOnly?: boolean;
  onNavigate: (screen: Screen, params?: unknown) => void;
}

function elapsedSince(value?: string): string {
  if (!value) return '00:00';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function AstrologerConsultationChatScreen({
  sessionId,
  customerName,
  startedAt,
  readOnly = false,
  onNavigate,
}: AstrologerConsultationChatScreenProps) {
  const { messages, sessionStatus, isLoading, isSending, error, send } = useRealtimeConsultationChat(sessionId);
  const [input, setInput] = useState('');
  const [timer, setTimer] = useState(() => elapsedSince(startedAt));
  const [isEnding, setIsEnding] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const isEnded = readOnly || ['ENDED', 'REJECTED', 'EXPIRED', 'CANCELLED'].includes(sessionStatus);

  useEffect(() => {
    const interval = window.setInterval(() => setTimer(elapsedSince(startedAt)), 1000);
    return () => window.clearInterval(interval);
  }, [startedAt]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    await send(text);
    setInput('');
  };

  const endConsultation = async () => {
    if (isEnding) return;
    setIsEnding(true);
    try {
      await consultationRepository.endAssignedSession(sessionId);
    } finally {
      setIsEnding(false);
    }
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#FCFBF8]">
      <CelestialChatBackground />
      <header className="relative z-10 flex items-center gap-3 border-b border-neutral-100 bg-white/95 px-4 py-3 backdrop-blur">
        <button type="button" onClick={() => onNavigate('astrologer-dashboard')} className="rounded-full p-2 text-neutral-700 active:bg-neutral-100"><ArrowLeft size={21} /></button>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-sm font-black text-[#FF8A00]">
          {(customerName?.trim().charAt(0) || 'C').toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-black text-neutral-900">{customerName || 'Kundli Nova customer'}</h1>
          <p className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-emerald-600"><ShieldCheck size={11} /> Secure consultation</p>
        </div>
        {!isEnded && <span className="rounded-full bg-neutral-100 px-3 py-1.5 font-mono text-[11px] font-bold text-neutral-700">{timer}</span>}
      </header>

      {!isEnded && (
        <div className="relative z-10 flex items-center justify-between bg-neutral-950 px-4 py-2.5 text-white">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-300">Paid consultation active</span>
          <button type="button" disabled={isEnding} onClick={() => void endConsultation()} className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-[10px] font-extrabold uppercase text-red-300 disabled:opacity-50">
            {isEnding ? 'Ending…' : 'End session'}
          </button>
        </div>
      )}

      <main className="relative z-10 flex-1 overflow-y-auto px-4 py-5 no-scrollbar">
        {isLoading ? (
          <div className="flex h-full items-center justify-center"><LoaderCircle className="animate-spin text-[#FF8A00]" /></div>
        ) : messages.length === 0 ? (
          <div className="mx-auto mt-12 max-w-[280px] rounded-2xl border border-neutral-100 bg-white/85 px-5 py-6 text-center shadow-sm backdrop-blur">
            <p className="text-sm font-extrabold text-neutral-800">Consultation connected</p>
            <p className="mt-1 text-[11px] font-medium leading-relaxed text-neutral-500">Send the first message when you are ready. Kundli Nova does not generate astrologer replies automatically.</p>
          </div>
        ) : messages.map(message => <div key={message.id}><ConsultationMessageBubble message={message} ownSender="astrologer" /></div>)}
        <div ref={endRef} />
      </main>

      {error && <div className="relative z-10 border-t border-red-100 bg-red-50 px-4 py-2 text-center text-[10px] font-semibold text-red-700">{error}</div>}

      <form onSubmit={submit} className="relative z-10 flex items-center gap-2 border-t border-neutral-100 bg-white px-4 py-3 pb-[max(14px,env(safe-area-inset-bottom))]">
        {isEnded ? (
          <div className="w-full rounded-2xl bg-neutral-50 px-4 py-3 text-center text-[11px] font-semibold text-neutral-500">This consultation is read-only.</div>
        ) : (
          <>
            <input value={input} onChange={event => setInput(event.target.value)} maxLength={4000} placeholder="Write a helpful response…" className="h-12 min-w-0 flex-1 rounded-2xl border border-neutral-100 bg-neutral-50 px-4 text-[13px] font-medium outline-none focus:border-orange-200" />
            <button type="submit" disabled={isSending || !input.trim()} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FF8A00] text-white disabled:opacity-40"><Send size={17} /></button>
          </>
        )}
      </form>
    </div>
  );
}
