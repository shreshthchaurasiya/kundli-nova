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
  Shield,
Heart,
  ChevronDown,
  Plus,
  X,
  Trash2,
  Paperclip
} from 'lucide-react';
import { useProfile } from '../contexts/ProfileContext';
import { KundliProfile } from '../types/kundli';
import { Screen } from '../types';
import { useRepositories } from '../repositories/repositoryProvider';
import { UserProfile } from '../types/profile';
import { AstrologyApi } from '../services/api/astrologyApi';
import { generateKundliPdf, KundliPdfPayload } from '../services/kundliPdfService';
import KundliPreviewMessage from '../components/KundliPreviewMessage';
import { postAiRequest } from '../services/aiClient';
import CelestialChatBackground from '../components/chat/CelestialChatBackground';
import { chatStorage } from '../services/storage/chatStorage';
import { Message, AiChatThread } from '../types/chat';
import { NormalizedCompatibilityContext } from '../types/matchingAiContext';
import { supabase } from '../lib/supabase';

interface NovaAIChatScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
  routeParams?: {
    conversationId?: string;
    initialQuery?: string;
    serviceContext?: string;
    profileId?: string;
    profileBId?: string;
    initialIntent?: 'explain-compatibility' | string;
    compatibilityContext?: NormalizedCompatibilityContext;
    mode?: string;
    forceNew?: boolean;
  };
}

const getProfileBirthDetails = (p: any) => {
  if (!p) return { gender: 'unknown', dob: '', tob: '', city: 'Unknown', state: 'Unknown' };
  const bd = p.birthDetails || {};
  return {
    gender: bd.gender || p.gender || 'unknown',
    dob: bd.dob || p.dob || '',
    tob: bd.tob || p.tob || '',
    city: bd.city || p.birth_city || p.city || 'Unknown',
    state: bd.state || p.birth_state || p.state || 'Unknown'
  };
};

export default function NovaAIChatScreen({ onNavigate, routeParams }: NovaAIChatScreenProps) {
  const repositories = useRepositories();
  const { defaultKundliProfile } = useProfile();
  
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<KundliProfile[]>([]);
  const [isProfileSwitcherOpen, setIsProfileSwitcherOpen] = useState(false);
  
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentConvId, setCurrentConvId] = useState<string>('');
  const [currentTopic, setCurrentTopic] = useState<string>('General Guidance');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoAnalysisTriggeredRef = useRef(false);

  // Image attachment state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5242880) {
        alert('File size exceeds the 5MB limit.');
        return;
      }
      setSelectedImage(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
    if (e.target) e.target.value = '';
  };

  const clearImageSelection = () => {
    setSelectedImage(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
  };

  // PDF modal state for progress
  const [pdfModalState, setPdfModalState] = useState<'idle' | 'generating' | 'ready'>('idle');
  const [pdfUrls, setPdfUrls] = useState<{ blobUrl: string; base64: string } | null>(null);

  const [loadingError, setLoadingError] = useState<string | null>(null);

  const handleDownloadPdf = async () => {
    const profile = profileData as any;
    if (!profile?.id) return;
    
    setPdfModalState('generating');
    try {
      const [chart, dasha] = await Promise.all([
        AstrologyApi.getKundli(profile.id),
        AstrologyApi.getDasha(profile.id).catch(() => null)
      ]);
      const dosha = null;
      const yoga = null;
      const detailedReport = null;

      const bd = getProfileBirthDetails(profile);
      const activeKundli: KundliPdfPayload = {
        birthDetails: {
          name: profile.name || 'Kundli Report',
          ...bd
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

  // Fetch profiles for switcher
  useEffect(() => {
    repositories.kundliProfile.getAllProfiles()
      .then(setProfiles)
      .catch(console.error);
  }, [repositories.kundliProfile]);

  // Set active profile ID once on mount
  useEffect(() => {
    if (!activeProfileId) {
      const initialId = routeParams?.profileId || defaultKundliProfile?.id;
      if (initialId) setActiveProfileId(initialId);
    }
  }, [routeParams?.profileId, defaultKundliProfile?.id, activeProfileId]);

  const isChatInitialized = useRef(false);

  // 1. Fetch Profile Data when activeProfileId changes
  useEffect(() => {
    if (!activeProfileId) return;
    repositories.kundliProfile.getProfileById(activeProfileId)
      .then(profile => {
        if (profile && profile.name) {
          setProfileData(profile as any);
        } else if (!isChatInitialized.current) {
          setLoadingError('The selected profile is unavailable, incomplete, or unauthorized.');
        }
      })
      .catch(() => {
        if (!isChatInitialized.current) setLoadingError('Failed to load profile.');
      });
  }, [activeProfileId, repositories.kundliProfile]);

  // 2. Initialize chat (only once per mount)
  useEffect(() => {
    if (!activeProfileId) return;
    if (isChatInitialized.current) return;

    const loadAndInit = async () => {
      isChatInitialized.current = true;
      const { conversationId, initialQuery, serviceContext, profileBId, initialIntent, forceNew } = routeParams || {};

      const profile = await repositories.kundliProfile.getProfileById(activeProfileId).catch(() => null);
      if (!profile || !profile.name) return;

      const profileName = profile.name.trim();

      // Determine topic early to fix TDZ bug
      const topic = serviceContext || (initialQuery ? 'Custom Query' : initialIntent === 'explain-compatibility' ? 'Kundli Matching Analysis' : 'General Guidance');

      // 2. Determine if loading existing conversation or creating new
      const historyList = chatStorage.getAiHistory();

      const getFormattedTime = () => {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      };

      if (conversationId) {
        // Load existing conversation, ensuring it belongs to the active profile.
        // Match by conversationId first; if profile differs, still load but tagged to profile.
        const existing = historyList.find(c => c.id === conversationId);
        if (existing) {
          setMessages(existing.messages || []);
          setCurrentConvId(existing.id);
          setCurrentTopic(existing.topic);
          // Do NOT trigger auto-analysis when loading an existing conversation.
          autoAnalysisTriggeredRef.current = true;
          return;
        }
      } else if (!forceNew) {
        // Find if this profile already has an active Nova session for this topic
        const existingForProfile = historyList.find(c => c.profileId === profile.id && c.kind === 'nova' && c.topic === topic);
        if (existingForProfile) {
          setMessages(existingForProfile.messages || []);
          setCurrentConvId(existingForProfile.id);
          setCurrentTopic(existingForProfile.topic);
          // Do NOT trigger auto-analysis when resuming an existing session.
          autoAnalysisTriggeredRef.current = true;
          return;
        }
      }

      // Otherwise, create a new conversation
      const newId = `nova-session-${Date.now()}`;
      setCurrentConvId(newId);
      setCurrentTopic(topic);

    const initializeNewChat = async () => {
      let initialMsgs: Message[] = [];

      // Handle matching-analysis auto-analysis
      if (initialIntent === 'explain-compatibility' && profileBId && !autoAnalysisTriggeredRef.current) {
        autoAnalysisTriggeredRef.current = true;
        const autoQuery = 'Explain this calculated Kundli matching result.';
        const userMsg: Message = {
          id: `user-auto-${Date.now()}`,
          text: autoQuery,
          sender: 'user',
          time: getFormattedTime(),
          type: 'text'
        };
        initialMsgs = [userMsg];
        setMessages(initialMsgs);

        setIsTyping(true);
        try {
          const responseTexts = await requestNovaResponse(initialMsgs, profile.id, profileBId, routeParams?.compatibilityContext);
          const aiMessages = responseTexts.map((text, index): Message => ({
            id: `nova-matching-${Date.now()}-${index}`,
            text,
            sender: 'nova',
            time: getFormattedTime(),
            type: 'text'
          }));
          const finalMsgs = [...initialMsgs, ...aiMessages];
          setMessages(finalMsgs);
          saveToHistory(newId, topic, finalMsgs);
        } catch (error) {
          const errorMessage: Message = {
            id: `nova-error-${Date.now()}`,
            text: error instanceof Error ? error.message : 'Nova AI se connection nahi ho paaya.',
            sender: 'system',
            time: getFormattedTime(),
            type: 'system'
          };
          setMessages([...initialMsgs, errorMessage]);
        } finally {
          setIsTyping(false);
        }
        return;
      }

      if (initialQuery) {
        // User came with a search question
        const userMsg: Message = {
          id: `user-first-${Date.now()}`,
          text: initialQuery,
          sender: 'user',
          time: getFormattedTime(),
          type: 'text'
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
            type: 'text'
          }));
          const finalMsgs = [...initialMsgs, ...aiMessages];
          setMessages(finalMsgs);
          saveToHistory(newId, topic, finalMsgs);
        } catch (error) {
          const errorMessage: Message = {
            id: `nova-error-${Date.now()}`,
            text: error instanceof Error ? error.message : 'Nova AI se connection nahi ho paaya.',
            sender: 'system',
            time: getFormattedTime(),
            type: 'system'
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
            AstrologyApi.getDasha(profile.id).catch(() => null)
          ]);

          // Step 1: Reading birth details…
          await new Promise(resolve => setTimeout(resolve, 300));
          setMessages(prev => prev.map(m => m.id === loadingMsgId ? { ...m, kundliLoadingStep: 2 } : m));

          // Wait for API calls to complete to simulate step 2
          const [chart, dasha] = await fetchPromise;
          const dosha = null;
          const yoga = null;
          const detailedReport = null;

          // Step 2 -> 3 Transition: Preparing your Kundli chart…
          setMessages(prev => prev.map(m => m.id === loadingMsgId ? { ...m, kundliLoadingStep: 3 } : m));
          await new Promise(resolve => setTimeout(resolve, 300));

          const bd = getProfileBirthDetails(profile);
          const freshKundli: KundliPdfPayload = {
            birthDetails: {
              name: profile.name,
              ...bd
            },
            chart,
            dasha,
            dosha,
            yoga,
            detailedReport,
            generatedAt: new Date().toLocaleDateString()
          };

          // UI transition delay
          await new Promise(resolve => setTimeout(resolve, 200));

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
                text: "Kshama karein, aapki kundli banate samay kuch dikkat aayi. Kripya thodi der baad prayas karein.",
                sender: 'system',
                time: getFormattedTime(),
                type: 'system'
              }];
           });
        }

        setIsTyping(false);
      }
    };

    initializeNewChat();
    };

    setLoadingError(null);
    loadAndInit();
  }, [activeProfileId, routeParams?.conversationId, routeParams?.initialQuery, routeParams?.serviceContext, routeParams?.initialIntent, repositories.kundliProfile]);

  // Scroll to bottom whenever messages list updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const saveToHistory = (id: string, topic: string, currentMsgs: Message[]) => {
    let historyList = chatStorage.getAiHistory();

    const shortTimestamp = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const lastMsg = currentMsgs[currentMsgs.length - 1];
    const lastMsgText = lastMsg ? (lastMsg.text || 'Janam Kundli Report') : '';

    const existingIndex = historyList.findIndex(c => c.id === id);
    if (existingIndex > -1) {
      historyList[existingIndex] = {
        ...historyList[existingIndex],
        lastMessage: lastMsgText,
        timestamp: shortTimestamp,
        messages: currentMsgs,
        profileId: profileData?.id
      };
    } else {
      const newConv: AiChatThread = {
        id,
        kind: 'nova',
        topic,
        lastMessage: lastMsgText,
        timestamp: shortTimestamp,
        messages: currentMsgs,
        profileId: profileData?.id
      };
      historyList = [newConv, ...historyList];
    }

    chatStorage.saveAiHistory(historyList);
  };

  const getFormattedTime = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const requestNovaResponse = async (conversation: Message[], profileId: string, profileBId?: string, compatibilityContext?: NormalizedCompatibilityContext) => {
    const result = await postAiRequest<{ texts: string[], suggestions?: string[] }>('/api/chat', {
      messages: conversation
        .filter(message => message.text || message.attachmentUrl)
        .map(message => ({ sender: message.sender, text: message.text || '', attachmentUrl: message.attachmentUrl })),
      profileId: profileId,
      profileBId: profileBId || routeParams?.profileBId,
      sessionId: currentConvId,
      compatibilityContext: compatibilityContext || routeParams?.compatibilityContext,
    });
    if (!Array.isArray(result.texts) || result.texts.length === 0) {
      throw new Error('Nova AI ne empty response diya. Kripya dobara try karein.');
    }
    setAiSuggestions(result.suggestions || []);
    return result.texts;
  };

  const handleSelectChip = async (chipText: string) => {
    if (isTyping) return;
    setAiSuggestions([]);

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      text: chipText,
      sender: 'user',
      time: getFormattedTime(),
      type: 'text'
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
        type: 'text'
      }));
      const finalMsgs = [...newMsgsList, ...aiMessages];
      setMessages(finalMsgs);
      saveToHistory(currentConvId, currentTopic, finalMsgs);
    } catch (error) {
      const errorMessage: Message = {
        id: `ai-error-${Date.now()}`,
        text: error instanceof Error ? error.message : 'Nova AI se connection nahi ho paaya.',
        sender: 'system',
        time: getFormattedTime(),
        type: 'system'
      };
      // For system errors, append them but don't persist them to backend history so users can naturally retry
      const finalMsgs = [...newMsgsList, errorMessage];
      setMessages(finalMsgs);
      // We explicitly DO NOT call saveToHistory for error messages so that the retry context remains clean
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedImage) || isTyping || isUploading) return;
    setAiSuggestions([]);

    let attachmentUrl: string | undefined = undefined;

    if (selectedImage) {
      setIsUploading(true);
      try {
        const compressImage = (file: File): Promise<string> => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
              const img = new Image();
              img.src = event.target?.result as string;
              img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1024;
                const MAX_HEIGHT = 1024;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                  if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                  }
                } else {
                  if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                  }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
              };
              img.onerror = (e) => reject(e);
            };
            reader.onerror = (e) => reject(e);
          });
        };
        attachmentUrl = await compressImage(selectedImage);
      } catch (err) {
        console.error('Image compression failed', err);
        alert('Image processing failed. Please try a different image.');
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const userText = inputText.trim();
    setInputText('');
    clearImageSelection();

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      text: userText,
      sender: 'user',
      time: getFormattedTime(),
      type: attachmentUrl ? 'image' : 'text',
      attachmentUrl
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
        type: 'text'
      }));
      const finalMsgs = [...newMsgsList, ...aiMessages];
      setMessages(finalMsgs);
      saveToHistory(currentConvId, currentTopic, finalMsgs);
    } catch (error) {
      const errorMessage: Message = {
        id: `ai-error-${Date.now()}`,
        text: error instanceof Error ? error.message : 'Nova AI se connection nahi ho paaya.',
        sender: 'system',
        time: getFormattedTime(),
        type: 'system'
      };
      // For system errors, append them but don't persist them to backend history so users can naturally retry
      const finalMsgs = [...newMsgsList, errorMessage];
      setMessages(finalMsgs);
      // We explicitly DO NOT call saveToHistory for error messages so that the retry context remains clean
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
            onClick={() => {
              if (routeParams?.mode === 'matching') {
                onNavigate('nova-kundli', { mode: 'matching', returnTo: 'home' });
              } else {
                onNavigate('nova-ai');
              }
            }}
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
              <div 
                className="flex items-center space-x-1 mt-[1.5px] cursor-pointer"
                onClick={() => setIsProfileSwitcherOpen(true)}
              >
                <div className="text-[11.5px] text-[#6B7280] font-semibold leading-[1.3] truncate max-w-[120px]">
                  {profileData?.name ? `Kundli: ${profileData.name}` : 'Personal AI Astrologer'}
                </div>
                <ChevronDown size={11} className="text-[#6B7280]" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Header Controls (Compact) */}
        <div className="flex items-center space-x-[8px] text-neutral-400">
          <button 
            onClick={() => onNavigate('chat-history')}
            className="p-2 rounded-full hover:bg-neutral-50 active:bg-neutral-100 transition-colors focus:outline-none"
          >
            <History size={19} strokeWidth={2.2} />
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

            {routeParams?.initialIntent === 'explain-compatibility' && routeParams?.compatibilityContext && (
              <div className="mb-6 bg-white border border-[#FF8A00]/20 rounded-[20px] p-4 shadow-[0_4px_20px_rgba(255,138,0,0.05)]">
                <div className="flex items-center justify-between mb-3 border-b border-[#F1EFE9] pb-3">
                  <div className="flex items-center space-x-2 text-[#FF8A00]">
                    <Heart size={16} className="fill-[#FF8A00]/20" />
                    <span className="text-[13px] font-[800] uppercase tracking-wide">Kundli Matching</span>
                  </div>
                  <div className="text-[15px] font-[850] text-[#111827]">
                    {routeParams.compatibilityContext.totalScore.toFixed(1)} <span className="text-neutral-400 text-[12px]">/ {routeParams.compatibilityContext.maximumScore}</span>
                  </div>
                </div>
                <div className="flex items-center justify-center space-x-4">
                  <div className="flex-1 text-center font-bold text-[#111827] truncate">
                    {profileData?.name || 'Profile A'}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-300">
                    <Heart size={14} className="fill-neutral-200" />
                  </div>
                  <div className="flex-1 text-center font-bold text-[#111827] truncate">
                    Partner
                  </div>
                </div>
              </div>
            )}

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
                      onViewComplete={() => onNavigate('nova-kundli', { mode: 'kundli', profileId: msg.profileId, kundliData: msg.kundliData, returnTo: 'nova-ai-chat' })}
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
                        : msg.sender === 'system'
                          ? 'bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] rounded-tl-[4px]'
                          : 'bg-[#FFFFFF] border border-[#F1EFE9] text-[#111827] rounded-tl-[4px]'
                    }`}
                  >
                    {msg.attachmentUrl && (
                      <div className="mb-2 rounded-xl overflow-hidden border border-[#F3F4F6]/20 bg-black/5">
                        <img src={msg.attachmentUrl} alt="Attachment" className="max-w-full h-auto object-cover max-h-[300px]" />
                      </div>
                    )}
                    {msg.text && (
                      <div className="text-[13.5px] sm:text-[14px] leading-[1.6] whitespace-pre-wrap font-medium">
                        {msg.text}
                      </div>
                    )}
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


      {aiSuggestions.length > 0 ? (
        <div className="bg-[#FFFFFF]/85 backdrop-blur-md border-t border-[#F3F4F6]/50 px-[20px] py-[10px] z-20 flex space-x-[8px] overflow-x-auto no-scrollbar scroll-smooth">
          {aiSuggestions.map((suggestion, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectChip(suggestion)}
              disabled={isTyping}
              className="bg-[#FFFFFF] text-neutral-700 border border-[#EBE8E0] px-3.5 py-1.5 rounded-full text-[12px] font-[750] shadow-[0_2px_4px_rgba(0,0,0,0.02)] whitespace-nowrap flex items-center space-x-1.5 transition-all hover:border-[#FF8A00]/40 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{suggestion}</span>
            </button>
          ))}
        </div>
      ) : showChips && (
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
      <div className="relative bg-[#FFFFFF] px-[16px] py-[12px] pb-[max(20px,env(safe-area-inset-bottom))] border-t border-[#F3F4F6] z-20 flex flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.01)] shrink-0">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImageSelect} 
          accept="image/jpeg, image/png, image/webp" 
          className="hidden" 
        />
        
        {imagePreviewUrl && (
          <div className="mb-3 flex items-start gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-2">
            <div className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden border border-neutral-200">
              <img src={imagePreviewUrl} alt="Preview" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={clearImageSelection}
                className="absolute -right-1 -top-1 bg-white rounded-full p-0.5 shadow-sm border border-neutral-200 text-neutral-500 hover:text-red-500 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex flex-1 flex-col justify-center h-16 text-xs text-neutral-500">
              <span className="font-semibold text-neutral-700 truncate max-w-[200px]">{selectedImage?.name}</span>
              <span>{(selectedImage?.size ? (selectedImage.size / 1024 / 1024).toFixed(2) : '0')} MB</span>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-[12px] w-full">
          <form onSubmit={handleSendMessage} className="flex-1 flex items-center bg-[#F9FAFB] border border-[#F3F4F6] rounded-[24px] pr-[6px] pl-[12px]">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isTyping || isUploading}
              className="text-neutral-400 mr-2 p-1.5 hover:text-[#FF8A00] hover:bg-[#FF8A00]/10 rounded-full transition-colors disabled:opacity-50"
            >
              <Paperclip size={18} strokeWidth={2} />
            </button>
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask Nova AI..." 
              className="flex-1 bg-transparent border-none focus:outline-none text-[13.5px] sm:text-[14px] font-medium text-[#111827] placeholder:text-[#9CA3AF] h-[48px]"
            />
            
            <button 
              type="submit"
              disabled={(!inputText.trim() && !selectedImage) || isTyping || isUploading}
              className={`w-[36px] h-[36px] rounded-full flex items-center justify-center shrink-0 transition-all ${
                (inputText.trim() || selectedImage) && !isTyping && !isUploading
                  ? 'bg-[#FF8A00] text-[#FFFFFF] shadow-[0_2px_8px_rgba(255,138,0,0.3)] active:scale-[0.96]' 
                  : 'bg-[#F3F4F6] text-[#9CA3AF]'
              }`}
            >
              <Send size={15} strokeWidth={2.5} className="ml-[2.5px]" />
            </button>
          </form>
        </div>
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

      {/* Profile Switcher Sheet */}
      <AnimatePresence>
        {isProfileSwitcherOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#000000]/20 backdrop-blur-sm z-[200]"
              onClick={() => setIsProfileSwitcherOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[28px] pt-6 pb-8 px-5 z-[210] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-[850] text-neutral-900 tracking-tight">Select Profile</h3>
                  <p className="text-xs font-semibold text-neutral-500 mt-0.5">Switch Kundli context for AI Chat</p>
                </div>
                <button
                  onClick={() => setIsProfileSwitcherOpen(false)}
                  className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 transition-colors focus:outline-none"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-4">
                {profiles.map((p) => {
                  const isSelected = activeProfileId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        if (activeProfileId !== p.id) {
                          // Reset chat state completely for the new profile
                          isChatInitialized.current = false;
                          autoAnalysisTriggeredRef.current = false;
                          setMessages([]);
                          setAiSuggestions([]);
                          setCurrentConvId('');
                          setCurrentTopic('General Guidance');
                          // Then switch profile — the useEffect will reinitialize
                          setActiveProfileId(p.id);
                        }
                        setIsProfileSwitcherOpen(false);
                      }}
                      className={`w-full flex items-center p-4 rounded-2xl border transition-all ${
                        isSelected 
                          ? 'border-[#FF8A00] bg-[#FFF9E6] shadow-[0_2px_12px_rgba(255,138,0,0.1)]' 
                          : 'border-neutral-200 bg-white hover:border-[#FF8A00]/40'
                      } focus:outline-none text-left`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-[850] text-lg mr-4 shrink-0 ${
                        isSelected ? 'bg-[#FF8A00] text-white' : 'bg-neutral-100 text-neutral-500'
                      }`}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className={`text-base font-[800] truncate tracking-tight ${isSelected ? 'text-[#FF8A00]' : 'text-neutral-900'}`}>
                            {p.name}
                          </h4>
                          {p.relation === 'self' && (
                            <span className="px-2 py-0.5 rounded-md bg-[#10B981]/10 text-[#10B981] text-[10px] font-bold uppercase tracking-wider">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-neutral-500 mt-1 truncate">
                          {(() => {
                            const bd = getProfileBirthDetails(p);
                            const formattedDob = bd.dob 
                              ? new Date(bd.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                              : 'Unknown DOB';
                            return `${formattedDob} • ${bd.city || 'Unknown City'}`;
                          })()}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="shrink-0 ml-3">
                          <CheckCircle2 size={20} className="text-[#FF8A00] fill-[#FF8A00]/20" strokeWidth={2.5} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 mt-2 border-t border-neutral-100">
                <button
                  onClick={() => {
                    setIsProfileSwitcherOpen(false);
                    onNavigate('kundli-profile-form', { mode: 'create', fromScreen: 'nova-ai-chat' });
                  }}
                  className="w-full flex items-center justify-center p-4 rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 hover:bg-neutral-100 transition-colors focus:outline-none text-neutral-600"
                >
                  <Plus size={20} strokeWidth={2.5} className="mr-2" />
                  <span className="font-[800] text-sm">Add New Profile</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      </AnimatePresence>
    </div>
  );
}
