import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, MessageCircle, Search, Sparkles, UserRound } from 'lucide-react';
import { Screen } from '../types';
import { ApiConsultationRepository } from '../repositories/api/apiConsultationRepository';
import { chatStorage } from '../services/storage/chatStorage';
import { chatService } from '../services/astrologyServices';
import { useAstrologerPartner } from '../features/astrologer';


interface ChatHistoryScreenProps {
  onNavigate: (screen: Screen, params?: unknown) => void;
}

type ChatKind = 'paid' | 'free' | 'nova';

interface HistoryItem {
  id: string;
  kind: ChatKind;
  title: string;
  preview: string;
  timestamp: string;
  astrologerId?: string;
  image?: string;
  active?: boolean;
}

const consultationRepository = new ApiConsultationRepository();
const OPEN_STATUSES = new Set(['CHECKING_WALLET', 'PREPARING_KUNDLI', 'WAITING_FOR_ASTROLOGER', 'ACTIVE', 'LOW_BALANCE', 'RECHARGING']);

const timestampValue = (value: string) => {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const displayTime = (value: string) => {
  const parsed = timestampValue(value);
  if (!parsed) return value;
  const date = new Date(parsed);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

export default function ChatHistoryScreen({ onNavigate }: ChatHistoryScreenProps) {
  const { directory: astrologers } = useAstrologerPartner();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | ChatKind>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadHistory = async () => {
      try {
        setError('');
        const [sessions, savedThreads] = await Promise.all([
          consultationRepository.listSessions(),
          Promise.resolve(chatStorage.getAiHistory()),
        ]);

        const paidItems: HistoryItem[] = await Promise.all((sessions || []).map(async session => {
          const astrologer = astrologers.find(item => item.id === session.astrologerId);
          const rawMessages = await chatService.getMessages(session.id);
          const messages = Array.isArray(rawMessages) ? rawMessages.filter(message => message?.sender !== 'system') : [];
          const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
          return {
            id: session.id,
            kind: 'paid',
            title: astrologer?.name || 'Astrologer',
            preview: lastMessage?.text || (OPEN_STATUSES.has(session.status) ? 'Consultation in progress' : 'Consultation completed'),
            timestamp: session.endedAt || session.startedAt || session.requestedAt,
            astrologerId: session.astrologerId,
            image: astrologer?.image,
            active: OPEN_STATUSES.has(session.status),
          };
        }));

        const savedItems: HistoryItem[] = (savedThreads || [])
          .filter(thread => thread && Array.isArray(thread.messages) && thread.messages.length > 0)
          .map(thread => ({
            id: thread.id,
            kind: thread.kind === 'free' ? 'free' : 'nova',
            title: thread.kind === 'free' ? 'Free Astrology Chat' : thread.topic || 'Nova AI',
            preview: thread.lastMessage || 'Open conversation',
            timestamp: thread.timestamp,
          }));

        if (active) {
          setItems([...paidItems, ...savedItems].sort((a, b) => timestampValue(b.timestamp) - timestampValue(a.timestamp)));
        }
      } catch (loadError: any) {
        console.error('Unable to load chat history', loadError);
        if (active) setError(`Chat history could not be loaded. Please retry. (${loadError.message || String(loadError)})`);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadHistory();
    return () => { active = false; };
  }, [astrologers]);

  const visibleItems = useMemo(() => items.filter(item => {
    const matchesFilter = filter === 'all' || item.kind === filter;
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery = !normalizedQuery
      || item.title.toLowerCase().includes(normalizedQuery)
      || item.preview.toLowerCase().includes(normalizedQuery);
    return matchesFilter && matchesQuery;
  }), [filter, items, query]);

  const openChat = (item: HistoryItem) => {
    if (item.kind === 'nova') {
      onNavigate('nova-ai-chat', { conversationId: item.id });
      return;
    }
    if (item.kind === 'free') {
      onNavigate('chat', { conversationId: item.id, readOnly: true });
      return;
    }
    onNavigate('consultation-chat', item.active
      ? { astrologerId: item.astrologerId }
      : { astrologerId: item.astrologerId, readOnlySessionId: item.id });
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-white font-sans">

      <header className="relative z-20 bg-white/85 px-5 pb-4 pt-[max(18px,env(safe-area-inset-top))] backdrop-blur-md">
        <div className="flex items-center gap-2">
          <MessageCircle size={21} className="text-[#FF8A00]" />
          <h1 className="text-base font-black tracking-tight text-neutral-900">Chats</h1>
        </div>

        <div className="relative mt-4">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search chats"
            className="h-11 w-full rounded-2xl border-0 bg-white/90 pl-10 pr-4 text-sm text-neutral-800 shadow-[0_3px_16px_rgba(17,24,39,0.06)] outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-[#FF8A00]/20"
          />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
          {([
            ['all', 'All'],
            ['paid', 'Astrologers'],
            ['free', 'Free Chat'],
            ['nova', 'Nova AI'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-colors ${
                filter === value ? 'bg-[#FF8A00] text-white' : 'bg-white/75 text-neutral-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="relative z-10 flex-1 overflow-y-auto px-3 pb-28 pt-2 no-scrollbar">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-[#FF8A00]/20 border-t-[#FF8A00]" />
          </div>
        ) : error ? (
          <div className="mx-2 mt-8 rounded-2xl bg-white/85 p-5 text-center text-sm font-semibold text-neutral-600 shadow-sm">{error}</div>
        ) : visibleItems.length === 0 ? (
          <div className="flex flex-col items-center px-8 pt-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/85 text-[#FF8A00] shadow-sm">
              <MessageCircle size={24} />
            </div>
            <h2 className="mt-4 text-sm font-black text-neutral-900">No chats yet</h2>
            <p className="mt-1 text-xs leading-relaxed text-neutral-500">Your Nova AI, free and astrologer conversations will appear here.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {visibleItems.map(item => (
              <motion.button
                key={`${item.kind}-${item.id}`}
                type="button"
                whileTap={{ scale: 0.985 }}
                onClick={() => openChat(item)}
                className="flex w-full items-center gap-3 rounded-2xl bg-white/82 px-3 py-3 text-left shadow-[0_3px_14px_rgba(17,24,39,0.045)] backdrop-blur-sm"
              >
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#FFF4E8] text-[#FF8A00]">
                  {item.image ? (
                    <img src={item.image} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : item.kind === 'nova' ? (
                    <Sparkles size={21} />
                  ) : (
                    <UserRound size={21} />
                  )}
                  {item.active && <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="truncate text-[13px] font-black text-neutral-900">{item.title}</h2>
                    <span className="shrink-0 text-[10px] font-semibold text-neutral-400">{displayTime(item.timestamp)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-xs font-medium text-neutral-500">{item.preview}</p>
                    <ChevronRight size={15} className="shrink-0 text-neutral-300" />
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
