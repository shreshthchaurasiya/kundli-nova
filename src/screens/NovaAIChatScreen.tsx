import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Send, 
  Clock, 
  History, 
  MoreVertical, 
  Sparkles,
  Sparkle,
  CheckCircle2,
  ExternalLink,
  Share2,
  Shield
} from 'lucide-react';
import { Screen } from '../types';
import { useRepositories } from '../repositories/repositoryProvider';
import { UserProfile } from '../types/profile';
import { AstrologyApi } from '../services/api/astrologyApi';
import { generateKundliPdf, KundliPdfPayload } from '../services/kundliPdfService';
import KundliPreviewMessage from '../components/KundliPreviewMessage';
import { postAiRequest } from '../services/aiClient';
import CelestialChatBackground from '../components/chat/CelestialChatBackground';
import { chatStorage } from '../services/storage/chatStorage';

interface NovaAIChatScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
  routeParams?: {
    conversationId?: string;
    initialQuery?: string;
    serviceContext?: string;
    profileId?: string;
  };
}

interface Message {
  id: string;
  text?: string;
  sender: 'nova' | 'user';
  time: string;
  type?: 'text' | 'kundli-loading' | 'kundli-card';
  kundliLoadingStep?: number; // 1, 2, 3
  kundliData?: KundliPdfPayload;
}

interface SavedConversation {
  id: string;
  kind?: 'nova';
  topic: string;
  lastMessage: string;
  timestamp: string;
  messages: Message[];
}

export default function NovaAIChatScreen({ onNavigate, routeParams }: NovaAIChatScreenProps) {
  const repositories = useRepositories();
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentConvId, setCurrentConvId] = useState<string>('');
  const [currentTopic, setCurrentTopic] = useState<string>('General Guidance');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // PDF modal state for progress
  const [pdfModalState, setPdfModalState] = useState<'idle' | 'generating' | 'ready'>('idle');
  const [pdfUrls, setPdfUrls] = useState<{ blobUrl: string; base64: string } | null>(null);

  const [loadingError, setLoadingError] = useState<string | null>(null);

  const handleDownloadPdf = async () => {
    const profile = profileData as any;
    if (!profile?.id) return;
    
    setPdfModalState('generating');
    try {
      const [chart, dasha, dosha, yoga, detailedReport] = await Promise.all([
        AstrologyApi.getKundli(profile.id),
        AstrologyApi.getDasha(profile.id).catch(() => null),
        AstrologyApi.getDoshaAnalysis(profile.id).catch(() => null),
        AstrologyApi.getYogaAnalysis(profile.id).catch(() => null),
        AstrologyApi.getDetailedKundliReport(profile.id).catch(() => null)
      ]);

      const activeKundli: KundliPdfPayload = {
        birthDetails: {
          name: profile.name || 'Kundli Report',
          gender: profile.birthDetails?.gender || 'unknown',
          dob: profile.birthDetails?.dob || '',
          tob: profile.birthDetails?.tob || '',
          city: profile.birthDetails?.city || 'Unknown',
          state: profile.birthDetails?.state || 'Unknown'
        },
        chart,
        dasha,
        dosha,
        yoga,
        detailedReport,
        generatedAt: new Date().toLocaleDateString()
      };

      const result = await generateKundliPdf(activeKundli);
      setPdfUrls({
        blobUrl: result.pdfBlobUrl,
        base64: result.pdfBase64
      });
      setPdfModalState('ready');
      // Trigger download
      result.download();
    } catch (e) {
      console.error(e);
      setPdfModalState('idle');
    }
  };

  // Load profile data and initialize chat
  useEffect(() => {
    const loadAndInit = async () => {
      const { conversationId, initialQuery, serviceContext, profileId } = routeParams || {};

      if (!profileId) {
        setLoadingError('No Kundli profile selected. Please select a profile first.');
        return;
      }

      const profile = await repositories.kundliProfile.getProfileById(profileId).catch(() => null);
      if (!profile || !profile.name) {
        setLoadingError('The selected profile is unavailable, incomplete, or unauthorized.');
        return;
      }

      setProfileData(profile as any);
      const profileName = profile.name.trim();

      // 2. Determine if loading existing conversation or creating new
    const historyList = chatStorage.getAiHistory() as SavedConversation[];

    const getFormattedTime = () => {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (conversationId) {
      // Load existing conversation
      const existing = historyList.find(c => c.id === conversationId);
      if (existing) {
        setMessages(existing.messages || []);
        setCurrentConvId(existing.id);
        setCurrentTopic(existing.topic);
        return;
      }
    }

    // Otherwise, create a new conversation
    const newId = `nova-session-${Date.now()}`;
    const topic = serviceContext || (initialQuery ? 'Custom Query' : 'General Guidance');
    setCurrentConvId(newId);
    setCurrentTopic(topic);

    const initializeNewChat = async () => {
      let initialMsgs: Message[] = [];

      if (initialQuery) {
        // User came with a search question
        const userMsg: Message = {
          id: `user-first-${Date.now()}`,
          text: initialQuery,
          sender: 'user',
          time: getFormattedTime()
        };
        initialMsgs = [userMsg];
        setMessages(initialMsgs);
        
        // Request a real Gemini response through the authenticated server API.
        setIsTyping(true);
        try {
          const responseTexts = await requestNovaResponse(initialMsgs, profile.id);
          const aiMessages = responseTexts.map((text, index): Message => ({
            id: `nova-resp-${Date.now()}-${index}`,
            text,
            sender: 'nova',
            time: getFormattedTime(),
          }));
          const finalMsgs = [...initialMsgs, ...aiMessages];
          setMessages(finalMsgs);
          saveToHistory(newId, topic, finalMsgs);
        } catch (error) {
          const errorMessage: Message = {
            id: `nova-error-${Date.now()}`,
            text: error instanceof Error ? error.message : 'Nova AI se connection nahi ho paaya.',
            sender: 'nova',
            time: getFormattedTime(),
          };
          setMessages([...initialMsgs, errorMessage]);
        } finally {
          setIsTyping(false);
        }
      } else {
        setIsTyping(true);
        await new Promise(resolve => setTimeout(resolve, 800));

        // Fresh loading flow with real backend:
        const greetMsg: Message = {
          id: `greet-${Date.now()}`,
          text: `Radhe Radhe, ${profileName} Ji. Main aapki janam kundli taiyar kar raha hoon.`,
          sender: 'nova',
          time: getFormattedTime(),
          type: 'text'
        };

        setMessages([greetMsg]);
        
        // Wait and then show the loading message card
        setIsTyping(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsTyping(false);

        const loadingMsgId = `loading-${Date.now()}`;
        const loadingMsg: Message = {
          id: loadingMsgId,
          sender: 'nova',
          time: getFormattedTime(),
          type: 'kundli-loading',
          kundliLoadingStep: 1
        };

        setMessages(prev => [...prev, loadingMsg]);

        try {
          if (!profile?.id) throw new Error("No profile selected");

          // Start fetching from real backend API
          const fetchPromise = Promise.all([
            AstrologyApi.getKundli(profile.id),
            AstrologyApi.getDasha(profile.id).catch(() => null),
            AstrologyApi.getDoshaAnalysis(profile.id).catch(() => null),
            AstrologyApi.getYogaAnalysis(profile.id).catch(() => null),
            AstrologyApi.getDetailedKundliReport(profile.id).catch(() => null)
          ]);

          // Step 1: Reading birth details…
          await new Promise(resolve => setTimeout(resolve, 800));
          setMessages(prev => prev.map(m => m.id === loadingMsgId ? { ...m, kundliLoadingStep: 2 } : m));

          // Step 2: Calculating planetary positions…
          await new Promise(resolve => setTimeout(resolve, 800));
          setMessages(prev => prev.map(m => m.id === loadingMsgId ? { ...m, kundliLoadingStep: 3 } : m));

          // Wait for API calls to complete
          const [chart, dasha, dosha, yoga, detailedReport] = await fetchPromise;

          const freshKundli: KundliPdfPayload = {
            birthDetails: {
              name: profile.name,
              gender: profile.birthDetails?.gender || 'unknown',
              dob: profile.birthDetails?.dob || '',
              tob: profile.birthDetails?.tob || '',
              city: profile.birthDetails?.city || 'Unknown',
              state: profile.birthDetails?.state || 'Unknown'
            },
            chart,
            dasha,
            dosha,
            yoga,
            detailedReport,
            generatedAt: new Date().toLocaleDateString()
          };

          // Step 3: Preparing your Kundli chart…
          await new Promise(resolve => setTimeout(resolve, 800));

          // Replace loading message with rich card attachment
          setMessages(prev => {
            const listWithoutLoading = prev.filter(m => m.id !== loadingMsgId);
            const cardMsg: Message = {
              id: `kundli-card-${Date.now()}`,
              sender: 'nova',
              time: getFormattedTime(),
              type: 'kundli-card',
              kundliData: freshKundli
            };
            const updated = [...listWithoutLoading, cardMsg];
            saveToHistory(newId, topic, updated);
            return updated;
          });
        } catch (error) {
           console.error("Kundli generation failed", error);
           setMessages(prev => {
              const listWithoutLoading = prev.filter(m => m.id !== loadingMsgId);
              return [...listWithoutLoading, {
                id: `error-${Date.now()}`,
                text: "Kshama karein, aapki kundli banate samay kuch dikkat aayi.",
                sender: 'nova',
                time: getFormattedTime(),
                type: 'text'
              }];
           });
        }

        setIsTyping(false);
      }
    };

    initializeNewChat();
    };

    setMessages([]);
    setProfileData(null);
    setLoadingError(null);
    loadAndInit();
  }, [routeParams, repositories.kundliProfile]);

  // Scroll to bottom whenever messages list updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const saveToHistory = (id: string, topic: string, currentMsgs: Message[]) => {
    let historyList = chatStorage.getAiHistory() as SavedConversation[];

    const shortTimestamp = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const lastMsg = currentMsgs[currentMsgs.length - 1];
    const lastMsgText = lastMsg ? (lastMsg.text || 'Janam Kundli Report') : '';

    const existingIndex = historyList.findIndex(c => c.id === id);
    if (existingIndex > -1) {
      historyList[existingIndex] = {
        ...historyList[existingIndex],
        lastMessage: lastMsgText,
        timestamp: shortTimestamp,
        messages: currentMsgs
      };
    } else {
      const newConv: SavedConversation = {
        id,
        kind: 'nova',
        topic,
        lastMessage: lastMsgText,
        timestamp: shortTimestamp,
        messages: currentMsgs
      };
      historyList = [newConv, ...historyList];
    }

    chatStorage.saveAiHistory(historyList as import('../types/chat').AiChatThread[]);
  };

  const getFormattedTime = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const requestNovaResponse = async (conversation: Message[], profileId: string) => {
    const result = await postAiRequest<{ texts: string[] }>('/api/chat', {
      messages: conversation
        .filter(message => message.type === 'text' || !message.type)
        .filter(message => Boolean(message.text))
        .map(message => ({ sender: message.sender, text: message.text })),
      profileId: profileId,
      sessionId: currentConvId,
    });
    if (!Array.isArray(result.texts) || result.texts.length === 0) {
      throw new Error('Nova AI ne empty response diya. Kripya dobara try karein.');
    }
    return result.texts;
  };

  const handleSelectChip = async (chipText: string) => {
    if (isTyping) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      text: chipText,
      sender: 'user',
      time: getFormattedTime()
    };

    const newMsgsList = [...messages, userMsg];
    setMessages(newMsgsList);
    saveToHistory(currentConvId, currentTopic, newMsgsList);

    // Request a real Gemini response.
    setIsTyping(true);
    try {
      const responseTexts = await requestNovaResponse(newMsgsList, profileData?.id || '');
      const aiMessages = responseTexts.map((text, index): Message => ({
        id: `ai-${Date.now()}-${index}`,
        text,
        sender: 'nova',
        time: getFormattedTime(),
      }));
      const finalMsgs = [...newMsgsList, ...aiMessages];
      setMessages(finalMsgs);
      saveToHistory(currentConvId, currentTopic, finalMsgs);
    } catch (error) {
      const errorMessage: Message = {
        id: `ai-error-${Date.now()}`,
        text: error instanceof Error ? error.message : 'Nova AI se connection nahi ho paaya.',
        sender: 'nova',
        time: getFormattedTime(),
      };
      const finalMsgs = [...newMsgsList, errorMessage];
      setMessages(finalMsgs);
      saveToHistory(currentConvId, currentTopic, finalMsgs);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isTyping) return;

    const userText = inputText.trim();
    setInputText('');

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      text: userText,
      sender: 'user',
      time: getFormattedTime()
    };

    const newMsgsList = [...messages, userMsg];
    setMessages(newMsgsList);
    saveToHistory(currentConvId, currentTopic, newMsgsList);

    // Request a real Gemini response.
    setIsTyping(true);
    try {
      const responseTexts = await requestNovaResponse(newMsgsList, profileData?.id || '');
      const aiMessages = responseTexts.map((text, index): Message => ({
        id: `ai-${Date.now()}-${index}`,
        text,
        sender: 'nova',
        time: getFormattedTime(),
      }));
      const finalMsgs = [...newMsgsList, ...aiMessages];
      setMessages(finalMsgs);
      saveToHistory(currentConvId, currentTopic, finalMsgs);
    } catch (error) {
      const errorMessage: Message = {
        id: `ai-error-${Date.now()}`,
        text: error instanceof Error ? error.message : 'Nova AI se connection nahi ho paaya.',
        sender: 'nova',
        time: getFormattedTime(),
      };
      const finalMsgs = [...newMsgsList, errorMessage];
      setMessages(finalMsgs);
      saveToHistory(currentConvId, currentTopic, finalMsgs);
    } finally {
      setIsTyping(false);
    }
  };

  // Check if we should show suggestion chips
  const showChips = (() => {
    if (messages.length === 0) return false;
    const lastKundliCardIdx = [...messages].reverse().findIndex(m => m.type === 'kundli-card');
    if (lastKundliCardIdx === -1) return false;
    
    const normalIdx = messages.length - 1 - lastKundliCardIdx;
    const hasUserMsgAfter = messages.slice(normalIdx + 1).some(m => m.sender === 'user');
    return !hasUserMsgAfter;
  })();

  return (
    <div className="relative flex flex-col h-full w-full bg-[#FCFBF8] font-sans antialiased selection:bg-[#FF8A00]/20">
      
      <CelestialChatBackground />

      {/* Top Header */}
      <div className="bg-[#FFFFFF]/85 backdrop-blur-md px-[16px] sm:px-[20px] pt-[max(16px,env(safe-area-inset-top))] sm:pt-[24px] pb-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] z-20 flex items-center justify-between border-b border-[#F3F4F6] relative">
        <div className="flex items-center">
          <button 
            onClick={() => onNavigate('nova-ai')}
            className="p-[8px] -ml-[8px] mr-[6px] rounded-full hover:bg-gray-50 active:bg-gray-100 transition-colors text-[#111827]"
          >
            <ArrowLeft size={22} strokeWidth={2.5} />
          </button>

          <div className="flex items-center space-x-[12px]">
            <div className="relative">
              {/* Premium Crystal Orb Icon representing the AI Astrologer */}
              <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-tr from-[#FF8A00] to-[#FFA733] text-white flex items-center justify-center shadow-[0_3px_12px_rgba(255,138,0,0.2)]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[20px] h-[20px]">
                  <circle cx="12" cy="12" r="5.2" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.8" />
                  <ellipse cx="12" cy="12" rx="9" ry="2.8" stroke="currentColor" strokeWidth="1.5" transform="rotate(-30 12 12)" />
                  <circle cx="12" cy="4.5" r="0.8" fill="currentColor" />
                  <circle cx="12" cy="19.5" r="0.8" fill="currentColor" />
                </svg>
              </div>
              <div className="absolute bottom-[0px] right-[0px] w-[9px] h-[9px] bg-[#10B981] border-2 border-[#FFFFFF] rounded-full" />
            </div>
            
            <div className="flex flex-col">
              <div className="flex items-center space-x-1">
                <h2 className="text-[15.5px] font-[850] text-[#111827] leading-[1.2] tracking-tight">Nova AI</h2>
                <Sparkles size={11.5} className="text-[#FF8A00] fill-[#FF8A00]" />
              </div>
              <div className="text-[11.5px] text-[#6B7280] font-semibold leading-[1.3] mt-[1.5px]">Personal AI Astrologer</div>
            </div>
          </div>
        </div>

        {/* Right Header Controls (Compact) */}
        <div className="flex items-center space-x-[12px] text-neutral-400">
          <button 
            onClick={() => onNavigate('chat-history')}
            className="p-2 rounded-full hover:bg-neutral-50 active:bg-neutral-100 transition-colors focus:outline-none"
          >
            <History size={19} strokeWidth={2.2} />
          </button>
          <button className="p-2 rounded-full hover:bg-neutral-50 active:bg-neutral-100 transition-colors focus:outline-none opacity-80">
            <MoreVertical size={19} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* Chat Messages Scrolling Area */}
      <div className="flex-1 overflow-y-auto px-[20px] pt-4 pb-[24px] z-10 flex flex-col no-scrollbar">
        {loadingError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-2">
              <Shield size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Profile Required</h3>
            <p className="text-sm text-gray-500">{loadingError}</p>
            <button 
              onClick={() => onNavigate('nova-ai')}
              className="mt-6 px-6 py-2.5 bg-[#FF8A00] text-white rounded-xl text-sm font-bold hover:bg-[#E97700] transition-colors"
            >
              Select Profile
            </button>
          </div>
        ) : (
          <>
            {/* Today Header Marker */}
            <div className="flex items-center w-full justify-center space-x-[12px] mb-6 pt-1">
              <div className="w-[18px] h-[1px] bg-neutral-200/60" />
              <span className="text-[10.5px] font-[700] text-neutral-400 uppercase tracking-widest">Personal consultation</span>
              <div className="w-[18px] h-[1px] bg-neutral-200/60" />
            </div>

        <div className="flex flex-col space-y-[16px] flex-1">
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => {
              if (msg.type === 'kundli-loading') {
                return (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex w-full justify-start"
                  >
                    <div className="w-full max-w-[290px] bg-[#FFFFFF] border border-[#F1EFE9] p-[16px] rounded-[20px] rounded-tl-[4px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-[14px]">
                      <div className="flex items-center space-x-[8px] border-b border-[#F5F2EB] pb-[8px]">
                        <div className="w-[10px] h-[10px] bg-[#FF8A00] rounded-full animate-ping" />
                        <span className="text-[11.5px] font-[800] text-[#111827] uppercase tracking-wider">Astro-Engine Loading</span>
                      </div>
                      
                      <div className="space-y-[10px]">
                        <div className="flex items-center space-x-[10px] text-[12.5px] font-bold leading-none">
                          <div className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] ${msg.kundliLoadingStep && msg.kundliLoadingStep >= 1 ? 'bg-[#FF8A00] text-white font-[800]' : 'bg-neutral-100 text-neutral-400'}`}>
                            {msg.kundliLoadingStep && msg.kundliLoadingStep > 1 ? '✓' : '1'}
                          </div>
                          <span className={msg.kundliLoadingStep && msg.kundliLoadingStep >= 1 ? 'text-[#FF8A00]' : 'text-neutral-400 font-semibold'}>
                            Reading birth details…
                          </span>
                        </div>

                        <div className="flex items-center space-x-[10px] text-[12.5px] font-bold leading-none">
                          <div className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] ${msg.kundliLoadingStep && msg.kundliLoadingStep >= 2 ? 'bg-[#FF8A00] text-white font-[800]' : 'bg-neutral-100 text-neutral-400'}`}>
                            {msg.kundliLoadingStep && msg.kundliLoadingStep > 2 ? '✓' : '2'}
                          </div>
                          <span className={msg.kundliLoadingStep && msg.kundliLoadingStep >= 2 ? 'text-[#FF8A00]' : 'text-neutral-400 font-semibold'}>
                            Calculating planetary positions…
                          </span>
                        </div>

                        <div className="flex items-center space-x-[10px] text-[12.5px] font-bold leading-none">
                          <div className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] ${msg.kundliLoadingStep && msg.kundliLoadingStep >= 3 ? 'bg-[#FF8A00] text-white font-[800]' : 'bg-neutral-100 text-neutral-400'}`}>
                            3
                          </div>
                          <span className={msg.kundliLoadingStep && msg.kundliLoadingStep >= 3 ? 'text-[#FF8A00]' : 'text-neutral-400 font-semibold'}>
                            Preparing your Kundli chart…
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              }

              if (msg.type === 'kundli-card' && msg.kundliData) {
                return (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex w-full justify-start"
                  >
                    <KundliPreviewMessage 
                      data={msg.kundliData} 
                      onViewComplete={() => onNavigate('nova-kundli', { kundliData: msg.kundliData })}
                      onDownloadPdf={handleDownloadPdf}
                    />
                  </motion.div>
                );
              }

              return (
                <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: index === 0 ? 0.1 : 0 }}
                  className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[85%] sm:max-w-[75%] rounded-[20px] px-[16px] py-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.015)] flex flex-col ${
                      msg.sender === 'user' 
                        ? 'bg-[#FF8A00] text-[#FFFFFF] rounded-tr-[4px]' 
                        : 'bg-[#FFFFFF] border border-[#F1EFE9] text-[#111827] rounded-tl-[4px]'
                    }`}
                  >
                    <div className="text-[13.5px] sm:text-[14px] leading-[1.6] whitespace-pre-wrap font-medium">
                      {msg.text}
                    </div>
                    <span className={`text-[9.5px] font-bold mt-[6px] self-end tracking-wide ${
                      msg.sender === 'user' ? 'text-[#FFFFFF]/75' : 'text-[#9CA3AF]'
                    }`}>
                      {msg.time}
                    </span>
                  </div>
                </motion.div>
              );
            })}
            
            {isTyping && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                className="flex w-full justify-start"
              >
                <div className="bg-[#FFFFFF] border border-[#F1EFE9] rounded-[20px] rounded-tl-[4px] px-[16px] py-[14px] shadow-[0_1px_4px_rgba(0,0,0,0.015)] flex items-center space-x-[4px]">
                  <motion.div className="w-[6px] h-[6px] bg-[#D1D5DB] rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0 }} />
                  <motion.div className="w-[6px] h-[6px] bg-[#D1D5DB] rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.2 }} />
                  <motion.div className="w-[6px] h-[6px] bg-[#D1D5DB] rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} className="h-[2px]" />
        </div>
        </>
        )}
      </div>


      {showChips && (
        <div className="bg-[#FFFFFF]/85 backdrop-blur-md border-t border-[#F3F4F6]/50 px-[20px] py-[10px] z-20 flex space-x-[8px] overflow-x-auto no-scrollbar scroll-smooth">
          {[
            { label: '❤️ Love', text: '❤️ Tell me about my Love & Relationships compatibility according to my Kundli.' },
            { label: '💼 Career', text: '💼 How is my Career & Professional growth looking according to my Kundli?' },
            { label: '💰 Finance', text: '💰 Can you analyze my Wealth, Finances, and Investments based on my Kundli?' },
            { label: '👨‍👩‍👧 Family', text: '👨‍👩‍👧 Tell me about my Family happiness and household peace according to my Kundli.' },
            { label: '🪐 Current Dasha', text: '🪐 What is my active Vimshottari Mahadasha, and what is its impact?' }
          ].map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => handleSelectChip(chip.text)}
              disabled={isTyping}
              className="bg-[#FFFFFF] text-neutral-700 border border-[#EBE8E0] px-3.5 py-1.5 rounded-full text-[12px] font-[750] shadow-[0_2px_4px_rgba(0,0,0,0.02)] whitespace-nowrap flex items-center space-x-1.5 transition-all hover:border-[#FF8A00]/40 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{chip.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Message Input Bar (Fixed bottom layout) */}
      <div className="bg-[#FFFFFF] px-[20px] py-[12px] pb-[max(20px,env(safe-area-inset-bottom))] border-t border-[#F3F4F6] z-20 flex items-center space-x-[12px] shadow-[0_-4px_20px_rgba(0,0,0,0.01)] shrink-0">
        <form onSubmit={handleSendMessage} className="flex-1 flex items-center bg-[#F9FAFB] border border-[#F3F4F6] rounded-[24px] pr-[6px] pl-[16px]">
          <div className="text-neutral-400 mr-2.5 shrink-0">
            <Sparkle size={16} strokeWidth={2.2} className="text-[#FF8A00]/80" />
          </div>
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask Nova AI..." 
            className="flex-1 bg-transparent border-none focus:outline-none text-[13.5px] sm:text-[14px] font-medium text-[#111827] placeholder:text-[#9CA3AF] h-[48px]"
          />
          
          <button 
            type="submit"
            disabled={!inputText.trim() || isTyping}
            className={`w-[36px] h-[36px] rounded-full flex items-center justify-center shrink-0 transition-all ${
              inputText.trim() && !isTyping
                ? 'bg-[#FF8A00] text-[#FFFFFF] shadow-[0_2px_8px_rgba(255,138,0,0.3)] active:scale-[0.96]' 
                : 'bg-[#F3F4F6] text-[#9CA3AF]'
            }`}
          >
            <Send size={15} strokeWidth={2.5} className="ml-[2.5px]" />
          </button>
        </form>
      </div>

      {/* PDF Generation Overlay Sheet */}
      <AnimatePresence>
        {pdfModalState !== 'idle' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#000000]/40 backdrop-blur-sm z-[200] flex items-end sm:items-center sm:justify-center"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-full sm:max-w-[380px] bg-white rounded-t-[28px] sm:rounded-[24px] px-[24px] pt-[28px] pb-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] sm:mx-4 border border-[#F1EFE9]"
            >
              {pdfModalState === 'generating' ? (
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-[20px]">
                    <div className="w-[56px] h-[56px] rounded-full border-[3px] border-[#FF8A00]/10 border-t-[#FF8A00] animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto text-[#FF8A00] animate-pulse" size={18} />
                  </div>
                  <h3 className="text-[16px] font-[850] text-[#111827] mb-[6px] tracking-tight">Generating PDF Report</h3>
                  <p className="text-[12.5px] font-semibold text-neutral-400">Structuring Kundli calculations, Lagna chart & Vedic analysis...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <div className="w-[56px] h-[56px] rounded-full bg-[#10B981]/10 flex items-center justify-center text-[#10B981] mb-[20px]">
                    <CheckCircle2 size={28} />
                  </div>
                  <h3 className="text-[16px] font-[850] text-[#111827] mb-[6px] tracking-tight">PDF Report Ready</h3>
                  <p className="text-[12.5px] font-semibold text-[#10B981] mb-[24px]">Your comprehensive Kundli PDF has been downloaded successfully!</p>
                  
                  <div className="w-full flex space-x-[12px]">
                    <button 
                      onClick={() => setPdfModalState('idle')}
                      className="flex-1 py-[12.5px] rounded-full border border-neutral-200 text-[13.5px] font-[800] text-neutral-600 active:scale-[0.98] transition-all"
                    >
                      Close
                    </button>
                    {pdfUrls?.blobUrl && (
                      <a 
                        href={pdfUrls.blobUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-[12.5px] bg-[#FF8A00] rounded-full text-[13.5px] font-[800] text-white flex items-center justify-center space-x-[6px] shadow-[0_3px_12px_rgba(255,138,0,0.2)] active:scale-[0.98] transition-all"
                      >
                        <span>Open PDF</span>
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
