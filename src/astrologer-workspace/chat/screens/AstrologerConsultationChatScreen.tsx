import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, LoaderCircle, Send, ShieldCheck, ScrollText, ImagePlus, X, Loader2 } from 'lucide-react';
import { Screen } from '../../../types';
import CelestialChatBackground from '../../../components/chat/CelestialChatBackground';
import { ConsultationMessageBubble, useRealtimeConsultationChat } from '../../../features/consultation-chat';
import { ApiConsultationRepository } from '../../../repositories/api/apiConsultationRepository';
import AstrologerKundliWorkspace from '../../workspace/AstrologerKundliWorkspace';
import { User } from 'lucide-react';

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
  const { messages, sessionStatus, kundliProfileId, isLoading, isSending, error, send, sendImage } = useRealtimeConsultationChat(sessionId);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [timer, setTimer] = useState(() => elapsedSince(startedAt));
  const [isEnding, setIsEnding] = useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const isEnded = readOnly || ['ENDED', 'REJECTED', 'EXPIRED', 'CANCELLED'].includes(sessionStatus);

  useEffect(() => {
    const interval = window.setInterval(() => setTimer(elapsedSince(startedAt)), 1000);
    return () => window.clearInterval(interval);
  }, [startedAt]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5242880) {
      alert('Image exceeds the maximum allowed size of 5MB.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Unsupported format. Please use JPEG, PNG, or WebP.');
      return;
    }

    setSelectedImage(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const clearImageSelection = () => {
    setSelectedImage(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedImage) {
      try {
        await sendImage(selectedImage, input);
        setInput('');
        clearImageSelection();
      } catch (err) {
        // error handled by hook
      }
      return;
    }

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
    <>
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
          <button 
            onClick={() => setIsWorkspaceOpen(true)}
            className="rounded-full p-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors"
          >
            <User size={18} />
          </button>
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

      <div className="relative z-10 flex flex-col border-t border-neutral-100 bg-white px-4 py-3 pb-[max(14px,env(safe-area-inset-bottom))]">
        {imagePreviewUrl && (
          <div className="mb-3 flex items-start gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-2 max-w-sm">
            <div className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden border border-neutral-200">
              <img src={imagePreviewUrl} alt="Preview" className="h-full w-full object-cover" />
              <button
                onClick={clearImageSelection}
                className="absolute -right-1 -top-1 bg-white rounded-full p-0.5 shadow-sm border border-neutral-200 text-neutral-500 hover:text-red-500 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex flex-1 flex-col justify-center h-16 text-xs text-neutral-500">
              <span className="font-semibold text-neutral-700 truncate max-w-[200px]">{selectedImage?.name}</span>
              <span>{(selectedImage?.size ? (selectedImage.size / 1024 / 1024).toFixed(2) : 0)} MB</span>
            </div>
          </div>
        )}
        <form onSubmit={submit} className="flex items-center gap-2">
          {isEnded ? (
            <div className="w-full rounded-2xl bg-neutral-50 px-4 py-3 text-center text-[11px] font-semibold text-neutral-500">This consultation is read-only.</div>
          ) : (
            <>
              <button
                type="button"
                aria-label="Attach image"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
              >
                <ImagePlus size={18} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />
              <input value={input} onChange={event => setInput(event.target.value)} maxLength={4000} placeholder={selectedImage ? "Add a caption..." : "Write a helpful response…"} className="h-12 min-w-0 flex-1 rounded-2xl border border-neutral-100 bg-neutral-50 px-4 text-[13px] font-medium outline-none focus:border-orange-200" />
              <button type="submit" disabled={isSending || (!input.trim() && !selectedImage)} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF8A00] text-white disabled:opacity-40">
                {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
    <AstrologerKundliWorkspace sessionId={sessionId} profileId={kundliProfileId} isOpen={isWorkspaceOpen} onClose={() => setIsWorkspaceOpen(false)} />
    </>
  );
}
