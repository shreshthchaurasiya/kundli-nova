import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MessageCircle, ChevronRight, Search, MessageSquare, ArrowRight, ShieldCheck, Clock, Sparkles, Filter } from 'lucide-react';
import { Screen } from '../types';
import { ASTROLOGERS } from '../data';
import { consultationService, chatService, walletService } from '../services/astrologyServices';

interface ChatHistoryScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
}

interface ChatItem {
  id: string;
  astrologerId: string;
  astrologerName: string;
  astrologerImage: string;
  astrologerSkills: string[];
  lastMessageText: string;
  lastMessageTime: string;
  status: 'Active' | 'Completed' | 'Cancelled';
  totalCharged: number;
  elapsedSeconds: number;
  createdAt: string;
  isActive: boolean;
  unreadCount?: number;
  walletBalance?: number;
}

export default function ChatHistoryScreen({ onNavigate }: ChatHistoryScreenProps) {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Active' | 'Completed' | 'Cancelled'>('All');
  const [walletBalance, setWalletBalance] = useState<number>(150);

  // Helper to format duration
  const formatSeconds = (totalSeconds: number) => {
    if (!totalSeconds) return '0m 0s';
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Helper to get group name based on createdAt date
  const getGroupHeader = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    
    // Reset hours to compare calendar days
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    if (targetDate.getTime() === today.getTime()) {
      return 'Today';
    } else if (targetDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      return 'Earlier';
    }
  };

  // Seed development data if empty
  const seedDevData = async () => {
    if ((import.meta as any).env.DEV) {
      const alreadySeeded = localStorage.getItem('kundli_nova_session_history_seeded_v1');
      if (!alreadySeeded) {
        const now = new Date();
        
        const seed1Date = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago (Today)
        const seed2Date = new Date(now.getTime() - 28 * 60 * 60 * 1000); // 28 hours ago (Yesterday)
        const seed3Date = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000); // 4 days ago (Earlier)

        const seedSessions = [
          {
            id: 'session-seed-1',
            astrologerId: '2', // Tarot Priya
            userId: 'dev-user',
            status: 'ENDED',
            createdAt: seed1Date.toISOString(),
            acceptedAt: seed1Date.toISOString(),
            endedAt: new Date(seed1Date.getTime() + 8 * 60 * 1000).toISOString(),
            elapsedSeconds: 480,
            billingMode: 'wallet',
            ratePerMin: 15,
            totalCharged: 120
          },
          {
            id: 'session-seed-2',
            astrologerId: '3', // Pandit Sharma
            userId: 'dev-user',
            status: 'ENDED',
            createdAt: seed2Date.toISOString(),
            acceptedAt: seed2Date.toISOString(),
            endedAt: new Date(seed2Date.getTime() + 12 * 60 * 1000).toISOString(),
            elapsedSeconds: 720,
            billingMode: 'wallet',
            ratePerMin: 50,
            totalCharged: 600
          },
          {
            id: 'session-seed-3',
            astrologerId: '1', // Astro Rahul
            userId: 'dev-user',
            status: 'ENDED',
            createdAt: seed3Date.toISOString(),
            acceptedAt: seed3Date.toISOString(),
            endedAt: new Date(seed3Date.getTime()).toISOString(),
            elapsedSeconds: 0,
            billingMode: 'wallet',
            ratePerMin: 25,
            totalCharged: 0
          }
        ];

        // Save to session history
        const existingHistoryStr = localStorage.getItem('kundli_nova_session_history');
        let existingHistory = [];
        if (existingHistoryStr) {
          try {
            existingHistory = JSON.parse(existingHistoryStr);
          } catch (e) {}
        }
        
        // Filter out seed IDs just in case to be idempotent
        const filteredExisting = existingHistory.filter((s: any) => !s.id.startsWith('session-seed-'));
        localStorage.setItem('kundli_nova_session_history', JSON.stringify([...filteredExisting, ...seedSessions]));

        // Save messages for Seed 1
        const msgs1 = [
          {
            id: 'msg-seed1-1',
            text: 'Hello Priya, can you help me check my relationship compatibility?',
            sender: 'user',
            time: seed1Date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'text',
            status: 'sent'
          },
          {
            id: 'msg-seed1-2',
            text: 'Hello! Sure, let me draw a Tarot card for you. It shows the Lovers card! Excellent energy.',
            sender: 'astrologer',
            time: new Date(seed1Date.getTime() + 2 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'text',
            status: 'sent'
          },
          {
            id: 'msg-seed1-3',
            text: 'That is amazing to hear.',
            sender: 'user',
            time: new Date(seed1Date.getTime() + 4 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'text',
            status: 'sent'
          },
          {
            id: 'msg-seed1-4',
            text: 'Perfect! Keep wearing the white quartz for inner stability.',
            sender: 'astrologer',
            time: new Date(seed1Date.getTime() + 7 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'text',
            status: 'sent'
          }
        ];
        localStorage.setItem('kundli_nova_chat_messages_session-seed-1', JSON.stringify(msgs1));

        // Save messages for Seed 2
        const msgs2 = [
          {
            id: 'msg-seed2-1',
            text: 'Pranam Pandit ji, my career growth has stalled since January.',
            sender: 'user',
            time: seed2Date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'text',
            status: 'sent'
          },
          {
            id: 'msg-seed2-2',
            text: 'Pranam. Saptam Shani is transiting, causing delays. Do not worry.',
            sender: 'astrologer',
            time: new Date(seed2Date.getTime() + 3 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'text',
            status: 'sent'
          },
          {
            id: 'msg-seed2-3',
            text: 'What remedy is advised?',
            sender: 'user',
            time: new Date(seed2Date.getTime() + 6 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'text',
            status: 'sent'
          },
          {
            id: 'msg-seed2-4',
            text: 'You should perform the Vishnu Puja on coming Thursday.',
            sender: 'astrologer',
            time: new Date(seed2Date.getTime() + 10 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'text',
            status: 'sent'
          }
        ];
        localStorage.setItem('kundli_nova_chat_messages_session-seed-2', JSON.stringify(msgs2));

        // Save messages for Seed 3 (Cancelled)
        localStorage.setItem('kundli_nova_chat_messages_session-seed-3', JSON.stringify([]));

        localStorage.setItem('kundli_nova_session_history_seeded_v1', 'true');
      }
    }
  };

  const loadChatHistory = async () => {
    try {
      await seedDevData();
      const currentBal = await walletService.getBalance();
      setWalletBalance(currentBal);

      const fetchedHistory = await consultationService.getSessionHistory();
      const items: ChatItem[] = [];

      // 1. Process Active Request (if any)
      const activeRequestStr = localStorage.getItem('kundli_nova_active_request');
      if (activeRequestStr) {
        try {
          const activeReq = JSON.parse(activeRequestStr);
          const astro = ASTROLOGERS.find(a => a.id === activeReq.astrologerId) || ASTROLOGERS[0];
          
          if (['ACTIVE', 'LOW_BALANCE', 'RECHARGING', 'PREPARING_KUNDLI', 'WAITING_FOR_ASTROLOGER'].includes(activeReq.status)) {
            const msgs = await chatService.getMessages(activeReq.id);
            // Filter out system messages so user doesn't see "₹25 deducted..." in preview
            const chatMsgs = msgs.filter(m => m.sender !== 'system');
            const lastMsg = chatMsgs[chatMsgs.length - 1];
            
            let previewText = 'Waiting for connection...';
            if (activeReq.status === 'PREPARING_KUNDLI') {
              previewText = 'Vedic Computations Active...';
            } else if (activeReq.status === 'WAITING_FOR_ASTROLOGER') {
              previewText = 'Astrologer reviewing your Kundli...';
            } else if (lastMsg) {
              previewText = lastMsg.type === 'image' ? '📷 Photo attachment' : (lastMsg.text || 'New message');
            }

            const lastTime = lastMsg 
              ? lastMsg.time 
              : new Date(activeReq.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            items.push({
              id: activeReq.id,
              astrologerId: activeReq.astrologerId,
              astrologerName: astro.name,
              astrologerImage: astro.image,
              astrologerSkills: astro.skills,
              lastMessageText: previewText,
              lastMessageTime: lastTime,
              status: 'Active',
              totalCharged: activeReq.totalCharged || 0,
              elapsedSeconds: activeReq.elapsedSeconds || 0,
              createdAt: activeReq.createdAt,
              isActive: true,
              unreadCount: msgs.filter(m => m.sender === 'astrologer' && m.status !== 'read').length || 1,
              walletBalance: currentBal
            });
          }
        } catch (err) {
          console.error("Failed to parse active request in chat tab:", err);
        }
      }

      // 2. Process Completed History
      const historyWithMsgs = await Promise.all(fetchedHistory.map(async (session) => {
        const astro = ASTROLOGERS.find(a => a.id === session.astrologerId) || ASTROLOGERS[0];
        const msgs = await chatService.getMessages(session.id);
        
        // Filter out system messages so user doesn't see "₹25 deducted..." in preview
        const chatMsgs = msgs.filter(m => m.sender !== 'system');
        const lastMsg = chatMsgs[chatMsgs.length - 1];

        // Is cancelled if duration is 0 and amount charged is 0
        const isCancelled = session.elapsedSeconds === 0 && session.totalCharged === 0;

        let previewText = isCancelled ? 'Consultation cancelled before connecting' : 'Session Completed';
        if (lastMsg) {
          previewText = lastMsg.type === 'image' ? '📷 Photo attachment' : (lastMsg.text || 'Photo attachment');
        }

        const lastTime = lastMsg 
          ? lastMsg.time 
          : new Date(session.endedAt || session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return {
          id: session.id,
          astrologerId: session.astrologerId,
          astrologerName: astro.name,
          astrologerImage: astro.image,
          astrologerSkills: astro.skills,
          lastMessageText: previewText,
          lastMessageTime: lastTime,
          status: (isCancelled ? 'Cancelled' : 'Completed') as 'Completed' | 'Cancelled',
          totalCharged: session.totalCharged,
          elapsedSeconds: session.elapsedSeconds,
          createdAt: session.createdAt,
          isActive: false,
          unreadCount: 0
        };
      }));

      // Merge items, active first, then history sorted latest first
      const allChats = [...items, ...historyWithMsgs];
      setChats(allChats);
    } catch (error) {
      console.error("Error loading chats in chat screen:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChatHistory();
    // Poll chat history to catch live updates automatically
    const interval = setInterval(loadChatHistory, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCardClick = (chat: ChatItem) => {
    if (chat.isActive) {
      // Resume the active consultation chat
      onNavigate('consultation-chat', { astrologerId: chat.astrologerId });
    } else {
      // Open completed conversation in read-only mode
      onNavigate('consultation-chat', { 
        astrologerId: chat.astrologerId, 
        readOnlySessionId: chat.id 
      });
    }
  };

  // Filter lists based on Search bar and Filter chips
  const filteredChats = chats.filter(chat => {
    const matchesSearch = chat.astrologerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.astrologerSkills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (chat.lastMessageText && chat.lastMessageText.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedFilter === 'All') return true;
    if (selectedFilter === 'Active') return chat.isActive;
    if (selectedFilter === 'Completed') return !chat.isActive && chat.status === 'Completed';
    if (selectedFilter === 'Cancelled') return !chat.isActive && chat.status === 'Cancelled';
    return true;
  });

  // Separate active from completed
  const activeChats = filteredChats.filter(chat => chat.isActive);
  const completedChats = filteredChats.filter(chat => !chat.isActive);

  // Group completed chats by date: Today, Yesterday, Earlier
  const groupAndSortChats = (chatsList: ChatItem[]) => {
    const groups: { [key in 'Today' | 'Yesterday' | 'Earlier']: ChatItem[] } = {
      'Today': [],
      'Yesterday': [],
      'Earlier': []
    };

    // Sort newest first
    const sorted = [...chatsList].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    sorted.forEach(chat => {
      const group = getGroupHeader(chat.createdAt);
      groups[group].push(chat);
    });

    return groups;
  };

  const groupedChats = groupAndSortChats(completedChats);

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] font-sans">
      {/* Header */}
      <div className="px-5 py-4 bg-white sticky top-0 z-30 shadow-[0_1px_4px_rgba(0,0,0,0.02)] border-b border-neutral-100 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageCircle className="text-[#FF8A00]" size={22} />
          <h1 className="text-sm font-[900] text-neutral-900 tracking-tight uppercase">My Consultations</h1>
        </div>
        <span className="text-[9px] font-black text-neutral-400 bg-neutral-100 border border-neutral-200/60 px-2 py-0.5 rounded-full uppercase tracking-wider">
          History
        </span>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32 px-4 py-4 space-y-4">
        {loading && chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-neutral-200 border-t-[#FF8A00] animate-spin" />
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Loading history...</p>
          </div>
        ) : filteredChats.length === 0 ? (
          /* Empty State after filtering */
          <div className="flex flex-col items-center justify-center pt-24 pb-12 px-6 text-center select-none">
            <div className="w-16 h-16 rounded-full bg-[#FFF5ED] text-[#FF8A00] flex items-center justify-center mb-5 border border-[#FF8A00]/10">
              <MessageSquare size={26} className="stroke-[1.8]" />
            </div>
            
            <div className="space-y-1.5 max-w-xs">
              <h3 className="text-base font-black text-neutral-900 tracking-tight">No consultations yet</h3>
              <p className="text-neutral-400 text-xs font-semibold leading-relaxed">
                Your completed and active consultations will appear here.
              </p>
            </div>

            <button 
              onClick={() => onNavigate('astrologers')}
              className="mt-8 h-11 px-6 bg-[#FF8A00] hover:bg-[#E07A00] text-white font-extrabold text-xs rounded-xl shadow-[0_4px_16px_rgba(255,138,0,0.15)] flex items-center justify-center space-x-2 border-none transition-all cursor-pointer"
            >
              <span>Browse Astrologers</span>
              <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Elegant Search and Filter Section */}
            <div className="space-y-3 bg-white p-3 border border-neutral-200/50 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
              {/* Search bar */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Astrologer or Expertise..."
                  className="w-full h-10 pl-10 pr-4 bg-[#FAFAFA] border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-[#FF8A00]/40 transition-colors"
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
              </div>

              {/* Compact Filter Chips */}
              <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pt-1">
                {(['All', 'Active', 'Completed', 'Cancelled'] as const).map((filter) => {
                  const isSelected = selectedFilter === filter;
                  return (
                    <button
                      key={filter}
                      onClick={() => setSelectedFilter(filter)}
                      className={`px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all border shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-[#FF8A00] border-[#FF8A00] text-white'
                          : 'bg-white border-neutral-200 text-neutral-500 hover:text-neutral-800 hover:border-neutral-300'
                      }`}
                    >
                      {filter}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Consultation Distinct Card */}
            {activeChats.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center space-x-1.5 px-1 pt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <h2 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Active Consultation</h2>
                </div>
                
                <div className="space-y-2.5">
                  {activeChats.map((chat) => (
                    <motion.div
                      key={chat.id}
                      onClick={() => handleCardClick(chat)}
                      whileTap={{ scale: 0.985 }}
                      className="bg-white border-2 border-[#FF8A00]/40 hover:border-[#FF8A00]/60 p-4 rounded-2xl flex items-center space-x-4 shadow-[0_2px_12px_rgba(255,138,0,0.05)] cursor-pointer relative overflow-hidden transition-all duration-200"
                    >
                      {/* Left color bar */}
                      <div className="absolute top-0 bottom-0 left-0 w-1 bg-[#FF8A00]" />

                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-neutral-100 bg-neutral-50">
                          <img src={chat.astrologerImage} alt={chat.astrologerName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse" />
                      </div>

                      {/* Center Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-black text-neutral-900 truncate tracking-tight">{chat.astrologerName}</h3>
                        <p className="text-[9.5px] text-neutral-400 font-bold uppercase tracking-wider truncate mt-0.5">
                          {chat.astrologerSkills.slice(0, 2).join(' • ')}
                        </p>
                        
                        {/* Live indicators */}
                        <div className="flex items-center space-x-2 mt-2 flex-wrap gap-y-1">
                          <span className="text-[8px] font-black text-green-600 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center space-x-1">
                            <span className="w-1 h-1 rounded-full bg-green-500 animate-ping" />
                            <span>Live</span>
                          </span>
                          <span className="text-[10px] text-neutral-400 font-bold font-mono">{formatSeconds(chat.elapsedSeconds)}</span>
                          <span className="text-neutral-200 text-xs">•</span>
                          <span className="text-[10px] text-neutral-500 font-bold">Wallet: ₹{walletBalance.toFixed(0)}</span>
                        </div>
                      </div>

                      {/* Right Action */}
                      <div className="shrink-0">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCardClick(chat);
                          }}
                          className="h-9 px-3 bg-[#FF8A00] hover:bg-[#E07A00] text-white font-extrabold text-[11px] rounded-xl border-none flex items-center justify-center space-x-1 uppercase transition-colors shadow-sm shadow-[#FF8A00]/10"
                        >
                          <span>Continue Chat</span>
                          <ChevronRight size={11} strokeWidth={2.5} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed & Cancelled grouped lists */}
            {Object.entries(groupedChats).map(([groupName, groupItems]) => {
              if (groupItems.length === 0) return null;
              return (
                <div key={groupName} className="space-y-2">
                  <h2 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest px-1 pt-1">
                    {groupName}
                  </h2>
                  <div className="space-y-2.5">
                    {groupItems.map((chat) => (
                      <motion.div
                        key={chat.id}
                        onClick={() => handleCardClick(chat)}
                        whileTap={{ scale: 0.99 }}
                        className="bg-white border border-neutral-150 rounded-2xl p-3.5 flex items-start space-x-3 shadow-[0_1px_3px_rgba(0,0,0,0.01)] hover:shadow-sm hover:border-neutral-200 transition-all duration-200 cursor-pointer"
                      >
                        {/* Left: Avatar */}
                        <div className="relative shrink-0">
                          <div className="w-11 h-11 rounded-full overflow-hidden border border-neutral-100 bg-neutral-50">
                            <img src={chat.astrologerImage} alt={chat.astrologerName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        </div>

                        {/* Center: Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <h3 className="text-xs font-black text-neutral-900 truncate tracking-tight">{chat.astrologerName}</h3>
                            <span className="text-[10px] text-neutral-400 font-bold truncate">• {chat.astrologerSkills.slice(0, 1).join('')}</span>
                          </div>

                          {/* Message preview - clamp 1 line */}
                          <p className="text-neutral-500 text-xs font-semibold mt-1 truncate max-w-full">
                            {chat.lastMessageText}
                          </p>

                          {/* Metadata Row */}
                          <div className="flex items-center space-x-2 mt-1.5 flex-wrap gap-y-0.5">
                            <span className="text-[10.5px] text-neutral-400 font-bold font-mono">{formatSeconds(chat.elapsedSeconds)}</span>
                            <span className="text-neutral-200 text-xs">•</span>
                            <span className="text-[10.5px] text-neutral-700 font-extrabold font-mono">₹{chat.totalCharged} charged</span>
                          </div>
                        </div>

                        {/* Right: Actions / Status */}
                        <div className="shrink-0 flex flex-col items-end justify-between self-stretch min-h-[44px] w-24">
                          {/* Time */}
                          <span className="text-[9.5px] text-neutral-400 font-bold font-mono">{chat.lastMessageTime}</span>

                          {/* Status badge and Action */}
                          <div className="flex flex-col items-end space-y-1 mt-1">
                            {chat.status === 'Completed' ? (
                              <span className="text-[8px] font-black text-green-600 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded uppercase tracking-wider">COMPLETED</span>
                            ) : (
                              <span className="text-[8px] font-black text-red-500 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded uppercase tracking-wider">CANCELLED</span>
                            )}
                            <div className="text-[10px] text-[#FF8A00] font-bold hover:underline flex items-center space-x-0.5 mt-0.5">
                              <span>View Chat</span>
                              <ChevronRight size={11} strokeWidth={2.5} />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
