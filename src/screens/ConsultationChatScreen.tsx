import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Phone, 
  Video, 
  Paperclip, 
  Send, 
  Clock, 
  BadgeCheck, 
  Star, 
  ShieldCheck, 
  Check, 
  CheckCheck, 
  FileText, 
  Play, 
  Volume2, 
  Image as ImageIcon, 
  Sparkles, 
  ChevronRight,
  Info,
  RefreshCw,
  MessageSquare,
  Sparkle,
  Calendar,
  X,
  AlertCircle,
  AlertTriangle,
  Coins,
  Shield,
  Activity,
  User,
  MapPin,
  Heart,
  ChevronDown,
  ChevronUp,
  Image
} from 'lucide-react';
import { Screen, Astrologer, Message, ConsultationState, KundliData } from '../types';
import { ASTROLOGERS } from '../data';
import { 
  walletService, 
  consultationService, 
  kundliService, 
  chatService, 
  astrologerService, 
  retrieveImageFromIndexedDB
} from '../services/astrologyServices';
import { walletStorage } from '../services/storage/walletStorage';
import { consultationStorage } from '../services/storage/consultationStorage';
import { chatStorage } from '../services/storage/chatStorage';

// Custom lazy-loaded image component for IndexedDB images to prevent UI flicker
function IndexedDBImage({ url, className, alt }: { url: string; className?: string; alt?: string }) {
  const [src, setSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (url.startsWith('idb://')) {
      retrieveImageFromIndexedDB(url).then(data => {
        if (active) {
          setSrc(data);
          setLoading(false);
        }
      });
    } else {
      setSrc(url);
      setLoading(false);
    }
    return () => {
      active = false;
    };
  }, [url]);

  if (loading) {
    return <div className={`bg-neutral-100 animate-pulse ${className}`} />;
  }

  return <img src={src || 'https://images.unsplash.com/photo-1515942400420-2b98fed1f515?w=500'} alt={alt} className={className} />;
}

interface ConsultationChatScreenProps {
  astrologerId?: string;
  readOnlySessionId?: string;
  onNavigate: (screen: Screen, params?: any) => void;
}

export default function ConsultationChatScreen({ astrologerId = '1', readOnlySessionId, onNavigate }: ConsultationChatScreenProps) {
  const [astro, setAstro] = useState<Astrologer>(() => {
    return ASTROLOGERS.find(a => a.id === astrologerId) || ASTROLOGERS[0];
  });

  // --- Central Consultation State Machine ---
  const [currentState, setCurrentState] = useState<ConsultationState>('CHECKING_WALLET');
  
  // --- Core States ---
  const [walletBalance, setWalletBalance] = useState<number>(150);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [activeCall, setActiveCall] = useState<'voice' | 'video' | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [startTimeString, setStartTimeString] = useState('');
  
  // Active Consultation tracking
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [totalCharged, setTotalCharged] = useState(0);
  const [isSpeedUpMode, setIsSpeedUpMode] = useState(false); // 10s = 1min for testing
  
  // Low balance grace period state
  const [gracePeriodSeconds, setGracePeriodSeconds] = useState(30);

  // Kundli Viewer state
  const [isKundliOpen, setIsKundliOpen] = useState(false);
  const [kundliData, setKundliData] = useState<KundliData | null>(null);

  // Review states (For ENDED Screen)
  const [rating, setRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>('');

  // Waiting Screen State
  const [waitingTimeoutSeconds, setWaitingTimeoutSeconds] = useState(60);

  // File Upload Previews
  const [selectedImageFile, setSelectedImageFile] = useState<string>('');
  const [selectedImageName, setSelectedImageName] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadFailed, setUploadFailed] = useState(false);

  // References
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const graceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const waitingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isBillingCardCollapsed, setIsBillingCardCollapsed] = useState(false);

  const ratePerMin = astro?.pricePerMinute || 25;
  const minimumMinutes = 5;
  const minimumRequired = ratePerMin * minimumMinutes; // e.g. 125

  // -----------------------------------------------------------------
  // INITIALIZATION & ACTIVE SESSION RESTORATION
  // -----------------------------------------------------------------
  useEffect(() => {
    async function loadInitialData() {
      // 1. Fetch astrologer
      const currentAstro = await astrologerService.getAstrologer(astrologerId);
      if (currentAstro) setAstro(currentAstro);

      // 2. Load wallet balance
      const balance = await walletService.getBalance();
      setWalletBalance(balance);

      // 3. Load user profile & Kundli details
      const profile = await kundliService.getUserProfile('current-user');
      setUserProfile(profile);
      const kData = await kundliService.generateDemoKundli('current-user');
      setKundliData(kData);

      // 0. CHECK IF READ-ONLY SESSION IS REQUESTED
      if (readOnlySessionId) {
        const history = await consultationService.getSessionHistory();
        const pastSession = history.find(s => s.id === readOnlySessionId);
        if (pastSession) {
          const pastAstro = await astrologerService.getAstrologer(pastSession.astrologerId);
          if (pastAstro) setAstro(pastAstro);
          
          setActiveSessionId(pastSession.id);
          setElapsedSeconds(pastSession.elapsedSeconds || 0);
          setTotalCharged(pastSession.totalCharged || 0);
          
          // Load past messages
          const chatMsgs = await chatService.getMessages(pastSession.id);
          setMessages(chatMsgs);
          
          const formattedStart = new Date(pastSession.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setStartTimeString(formattedStart);
          
          // Set to ACTIVE so we render the chat loop but we are in read-only mode
          setCurrentState('ACTIVE');
          return;
        }
      }

      // 4. RESTORE ACTIVE SESSION
      const activeReq = consultationStorage.getActiveRequest();
      if (activeReq) {
        if (['ACTIVE', 'LOW_BALANCE', 'RECHARGING'].includes(activeReq.status)) {
          setActiveSessionId(activeReq.id);
          const currentRate = activeReq.ratePerMinute || activeReq.ratePerMin || 25;

          const secondsInMinute = isSpeedUpMode ? 10 : 60;
          let currentElapsedSeconds = activeReq.elapsedSeconds || 0;
          let currentBilledMinutes = activeReq.billedMinutes || 1;
          let currentTotalCharged = activeReq.totalCharged || currentRate;

          // Re-calculate how much elapsed real time has passed since startedAt
          if (activeReq.startedAt) {
            const totalElapsedMs = Date.now() - new Date(activeReq.startedAt).getTime();
            const calculatedElapsedSeconds = Math.floor(totalElapsedMs / 1000);
            if (calculatedElapsedSeconds > currentElapsedSeconds) {
              currentElapsedSeconds = calculatedElapsedSeconds;
            }

            const completedMinutes = Math.floor(currentElapsedSeconds / secondsInMinute);
            const expectedTotalMinutes = 1 + completedMinutes;

            if (expectedTotalMinutes > currentBilledMinutes) {
              const unbilledMinutes = expectedTotalMinutes - currentBilledMinutes;
              const billCost = unbilledMinutes * currentRate;

              const currentWalletBal = walletStorage.getBalance();
              if (currentWalletBal >= billCost) {
                walletStorage.debit(billCost, 'Consultation Session Charge (Catch-up)');
                currentBilledMinutes = expectedTotalMinutes;
                currentTotalCharged += billCost;
              } else {
                const affordableMinutes = Math.floor(currentWalletBal / currentRate);
                if (affordableMinutes > 0) {
                  const affordableCost = affordableMinutes * currentRate;
                  walletStorage.debit(affordableCost, 'Consultation Session Charge (Catch-up)');
                  currentBilledMinutes += affordableMinutes;
                  currentTotalCharged += affordableCost;
                }
                
                activeReq.status = 'ENDED';
                activeReq.endedAt = new Date().toISOString();
                activeReq.elapsedSeconds = currentElapsedSeconds;
                activeReq.totalCharged = currentTotalCharged;
                activeReq.billedMinutes = currentBilledMinutes;
                
                consultationStorage.saveSessionSession(activeReq);
                consultationStorage.removeActiveRequest();
                consultationStorage.removeActiveRequestTime();
                
                setCurrentState('ENDED');
                setElapsedSeconds(currentElapsedSeconds);
                setTotalCharged(currentTotalCharged);
                return;
              }
            }
          }

          setElapsedSeconds(currentElapsedSeconds);
          setTotalCharged(currentTotalCharged);

          activeReq.elapsedSeconds = currentElapsedSeconds;
          activeReq.billedMinutes = currentBilledMinutes;
          activeReq.totalCharged = currentTotalCharged;
          consultationStorage.setActiveRequest(activeReq);
          consultationStorage.setActiveRequestTime(Date.now());

          const chatMsgs = await chatService.getMessages(activeReq.id);
          setMessages(chatMsgs);

          const formattedStart = new Date(activeReq.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setStartTimeString(formattedStart);

          setCurrentState(activeReq.status);
          return;
        }
      }

      // If no restoration, launch fresh CHECKING_WALLET flow
      runWalletVerification(balance);
    }

    loadInitialData();
  }, [astrologerId]);

  // Sync state and timestamp to repository for gap-proof session restoration
  useEffect(() => {
    if (activeSessionId && (currentState === 'ACTIVE' || currentState === 'LOW_BALANCE' || currentState === 'RECHARGING') && !readOnlySessionId) {
      const activeRequestObj = consultationStorage.getActiveRequest();
      if (activeRequestObj) {
        activeRequestObj.status = currentState;
        activeRequestObj.elapsedSeconds = elapsedSeconds;
        activeRequestObj.totalCharged = totalCharged;
        consultationStorage.setActiveRequest(activeRequestObj);
        consultationStorage.setActiveRequestTime(Date.now());
      }
    }
  }, [currentState, elapsedSeconds, totalCharged, activeSessionId, readOnlySessionId]);

  // -----------------------------------------------------------------
  // 1. WALLET VERIFICATION FLOW
  // -----------------------------------------------------------------
  const runWalletVerification = async (currentBal: number) => {
    setCurrentState('CHECKING_WALLET');
    await new Promise(resolve => setTimeout(resolve, 1500)); // refined animation delay

    if (currentBal < minimumRequired) {
      setCurrentState('INSUFFICIENT_BALANCE');
    } else {
      runKundliPreparation();
    }
  };

  // Demo Recharge Trigger
  const handleDemoRecharge = async (amount: number) => {
    const updatedBal = await walletService.recharge(amount);
    setWalletBalance(updatedBal);
    
    // If we were inside the active chat grace period
    if (currentState === 'RECHARGING') {
      setCurrentState('ACTIVE');
      setGracePeriodSeconds(30); // reset
      
      // Inject system log of successful wallet recharge
      const logMsg: Message = {
        id: `recharge-success-${Date.now()}`,
        text: `⚡ In-chat Recharge Successful! ₹${amount} credited. Active session resumed.`,
        sender: 'system',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'system'
      };
      const updatedMsgs = [...messages, logMsg];
      setMessages(updatedMsgs);
      await chatService.saveMessages(activeSessionId, updatedMsgs);
    } else {
      // Continue regular flow
      runKundliPreparation();
    }
  };

  // -----------------------------------------------------------------
  // 2. KUNDLI PREPARATION FLOW
  // -----------------------------------------------------------------
  const [kundliStepIdx, setKundliStepIdx] = useState(0);
  const KUNDLI_PREP_STEPS = [
    "Validating birth details",
    "Calculating planetary positions",
    "Preparing birth charts (D1 & D9)",
    "Sharing Kundli securely with astrologer"
  ];

  const runKundliPreparation = async () => {
    setCurrentState('PREPARING_KUNDLI');
    setKundliStepIdx(0);
    
    // Step through indicators with distinct intervals
    for (let i = 0; i < KUNDLI_PREP_STEPS.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setKundliStepIdx(prev => prev + 1);
    }

    // Now transition to review waiting
    runAstrologerReviewWait();
  };

  // -----------------------------------------------------------------
  // 3. ASTROLOGER REVIEW WAITING FLOW
  // -----------------------------------------------------------------
  const runAstrologerReviewWait = async () => {
    setCurrentState('WAITING_FOR_ASTROLOGER');
    setWaitingTimeoutSeconds(60);

    // Initialize consultation request in local storage
    const req = await consultationService.createRequest(astrologerId, 'current-user');
    setActiveSessionId(req.id);

    // Start 60-second waiting timeout countdown
    if (waitingTimerRef.current) clearInterval(waitingTimerRef.current);
    waitingTimerRef.current = setInterval(() => {
      setWaitingTimeoutSeconds(prev => {
        if (prev <= 1) {
          clearInterval(waitingTimerRef.current!);
          setCurrentState('EXPIRED');
          consultationService.expireRequest(req.id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Wait Simulation actions
  const handleSimulateAccept = async () => {
    if (waitingTimerRef.current) clearInterval(waitingTimerRef.current);
    
    // Set starting session details
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setStartTimeString(nowStr);
    setElapsedSeconds(0);
    setTotalCharged(0);

    // Initialize chat messages
    const initialMsgs: Message[] = [
      {
        id: 'welcome-system',
        sender: 'system',
        time: nowStr,
        type: 'system'
      },
      {
        id: 'astro-greet-1',
        text: `Radhe Radhe! Pranam 🙏 Main ${astro?.name || 'Astro'} bol raha hoon. Janam Kundli ka vivechan safalta-purvak prarambh ho gaya hai.`,
        sender: 'astrologer',
        time: nowStr,
        type: 'text'
      },
      {
        id: 'astro-greet-2',
        text: `Aapke vivah, career, aur dhan yog ke vishleshan hetu dasha chakra taiyaar hai. Kripya apna sawal puchhein. Main sahyog karne ke liye sachet hoon.`,
        sender: 'astrologer',
        time: nowStr,
        type: 'text'
      }
    ];

    setMessages(initialMsgs);
    await chatService.saveMessages(activeSessionId, initialMsgs);
    
    // Mark ACTIVE
    await consultationService.startSession(activeSessionId);
    setCurrentState('ACTIVE');
  };

  const handleSimulateReject = async () => {
    if (waitingTimerRef.current) clearInterval(waitingTimerRef.current);
    await consultationService.rejectRequest(activeSessionId);
    setCurrentState('REJECTED');
  };

  const handleSimulateTimeout = async () => {
    if (waitingTimerRef.current) clearInterval(waitingTimerRef.current);
    await consultationService.expireRequest(activeSessionId);
    setCurrentState('EXPIRED');
  };

  // -----------------------------------------------------------------
  // 5. BILLING TIMER & RUNTIME ENG (ACTIVE / LOW_BALANCE / RECHARGING)
  // -----------------------------------------------------------------
  useEffect(() => {
    const isChatActive = currentState === 'ACTIVE' || currentState === 'LOW_BALANCE' || currentState === 'RECHARGING';
    if (!isChatActive || !activeSessionId || readOnlySessionId) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalTime = 1000; // Tick standard rate
    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, intervalTime);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentState, activeSessionId, readOnlySessionId]);

  // Handle per-minute deductions based on elapsed seconds
  useEffect(() => {
    const isChatActive = currentState === 'ACTIVE' || currentState === 'LOW_BALANCE' || currentState === 'RECHARGING';
    if (!isChatActive || !activeSessionId || elapsedSeconds === 0 || readOnlySessionId) {
      return;
    }

    const secondsInMinute = isSpeedUpMode ? 10 : 60;
    
    if (elapsedSeconds % secondsInMinute === 0) {
      const totalMinutesBilled = Math.floor(elapsedSeconds / secondsInMinute);
      const nextCharged = totalMinutesBilled * ratePerMin;

      walletService.debit(ratePerMin).then(updatedBal => {
        setWalletBalance(updatedBal);
        setTotalCharged(nextCharged);

        // Make the deduction message ID extremely unique to avoid duplicate keys in React mapping
        const deductMsgId = `deduct-log-${activeSessionId}-${elapsedSeconds}`;

        // Log deduction event in-chat as system bubble
        const deductionMsg: Message = {
          id: deductMsgId,
          text: `₹${ratePerMin} deducted for this minute. Current Wallet: ₹${updatedBal}.`,
          sender: 'system',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'system'
        };

        setMessages(prevMsgs => {
          // Double-check to prevent rendering duplicate key messages
          if (prevMsgs.some(m => m.id === deductMsgId)) {
            return prevMsgs;
          }
          const updated = [...prevMsgs, deductionMsg];
          chatService.saveMessages(activeSessionId, updated);
          return updated;
        });

        // Transition logic based on remaining resources
        if (updatedBal < ratePerMin) {
          setCurrentState('RECHARGING');
        } else if (updatedBal <= 50) {
          setCurrentState('LOW_BALANCE');
        } else {
          setCurrentState('ACTIVE');
        }
      });
    }
  }, [elapsedSeconds, currentState, activeSessionId, isSpeedUpMode, ratePerMin]);

  // Grace Period countdown when state is RECHARGING (< ₹25)
  useEffect(() => {
    if (currentState !== 'RECHARGING' || readOnlySessionId) {
      if (graceTimerRef.current) clearInterval(graceTimerRef.current);
      return;
    }

    setGracePeriodSeconds(30);

    graceTimerRef.current = setInterval(() => {
      setGracePeriodSeconds(prev => {
        if (prev <= 1) {
          clearInterval(graceTimerRef.current!);
          handleGracePeriodExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (graceTimerRef.current) clearInterval(graceTimerRef.current);
    };
  }, [currentState]);

  const handleGracePeriodExpired = async () => {
    // Grace period ended without recharge -> Force End Session gracefully
    await handleFinalizeSessionEnd();
  };

  const handleFinalizeSessionEnd = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (graceTimerRef.current) clearInterval(graceTimerRef.current);
    if (waitingTimerRef.current) clearInterval(waitingTimerRef.current);

    // Conclude session via service
    await consultationService.endSession(activeSessionId, elapsedSeconds, totalCharged);
    
    // Retain clean ended states
    setCurrentState('ENDED');
    consultationStorage.removeActiveRequest();
    consultationStorage.removeActiveRequestTime();
    setShowEndConfirm(false);
  };

  // -----------------------------------------------------------------
  // 7. CHAT MESSAGE SENDING & MOCK SCHOLAR REPLY
  // -----------------------------------------------------------------
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (currentState === 'RECHARGING') return; // block send in grace period

    const textToSend = inputText.trim();
    if (!textToSend && !selectedImageFile) return;

    setInputText('');

    let newMsg: Message;

    if (selectedImageFile) {
      // Send image message saved securely via IndexedDB
      newMsg = await chatService.sendImageMessage(
        activeSessionId, 
        'user', 
        selectedImageFile, 
        selectedImageName || 'attachment.jpg'
      );
      // Clean selected image previews
      setSelectedImageFile('');
      setSelectedImageName('');
    } else {
      // Send text message
      newMsg = await chatService.sendTextMessage(activeSessionId, 'user', textToSend);
    }

    setMessages(prev => [...prev, newMsg]);
    triggerScholarReply(textToSend || "Sent image attachment");
  };

  const triggerScholarReply = async (userText: string) => {
    setIsTyping(true);
    const simulatedDelay = Math.random() * 1000 + 1200;
    await new Promise(resolve => setTimeout(resolve, simulatedDelay));

    let reply = "Hum aapke janam chakra ka grah dasha chakra dekh rahe hain. Shani ki dristi saptam bhav par hone ke karan karyon mein thoda vilamb avashya hai, parantu sanyam banae rakhein, 2026 ke ant tak samay kafi shubh prathit ho raha hai.";
    const lower = userText.toLowerCase();

    if (lower.includes('job') || lower.includes('career') || lower.includes('paisa') || lower.includes('money') || lower.includes('naukri')) {
      reply = "Dasam bhav (career house) mein Budhaditya Yoga ka prabhav behad shubh hai. Agle teen mahinon mein padonnati (promotion) athwa naye shubh avsar prapt hone ki dridha sambhavna hai. Surya Dev ko jal arpit karein.";
    } else if (lower.includes('shadi') || lower.includes('marriage') || lower.includes('love') || lower.includes('relationship') || lower.includes('vivah')) {
      reply = "Saptam ghar mein Guru (Jupiter) ki kripa dristi hai. Vivah yog November 2026 se prarambh honge. Jeevansathi gyanwan aur parivaar ke prati samarpit hoga. Shubh parinam hetu Thursday ko chane ki daal daan karein.";
    } else if (lower.includes('gem') || lower.includes('stone') || lower.includes('panna') || lower.includes('remedy') || lower.includes('upay')) {
      reply = "Aapki rashi aur lagna ke anusaar, ek shubh Panna (Emerald) dharan karna labhdayak hoga. Budhwar ko niyamit roop se Vishnu Sahasranama ka paath karein athwa shri durga chalisa padein.";
    }

    const replyMsg = await chatService.sendTextMessage(activeSessionId, 'astrologer', reply);
    setMessages(prev => [...prev, replyMsg]);
    setIsTyping(false);
  };

  // Handle local file selection for uploading as images
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    setUploadFailed(false);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelectedImageFile(reader.result);
        setSelectedImageName(file.name);
        setIsUploadingImage(false);
      } else {
        setUploadFailed(true);
        setIsUploadingImage(false);
      }
    };
    reader.onerror = () => {
      setUploadFailed(true);
      setIsUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  // Reusable Dispatchers for Attachment Simulation (Rich Messages)
  const sendMockPdf = async () => {
    setIsAttachmentOpen(false);
    const newMsg: Message = {
      id: `user-pdf-${Date.now()}`,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'pdf',
      attachmentName: 'Birth_Report_Kundli_Nova.pdf',
      attachmentSize: '2.4 MB',
      status: 'sent'
    };

    const updated = [...messages, newMsg];
    setMessages(updated);
    await chatService.saveMessages(activeSessionId, updated);

    setIsTyping(true);
    setTimeout(async () => {
      const reply = await chatService.sendTextMessage(activeSessionId, 'astrologer', "Dhanyawaad, maine janam patrika PDF kholi hai. Navamsa chakra ka vishleshan karne par aapka Bhagyesh ucha ka baitha hai.");
      setMessages(prev => [...prev, reply]);
      setIsTyping(false);
    }, 1500);
  };

  const sendMockVoiceNote = async () => {
    setIsAttachmentOpen(false);
    const newMsg: Message = {
      id: `user-voice-${Date.now()}`,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'voice',
      duration: '0:18',
      status: 'sent'
    };

    const updated = [...messages, newMsg];
    setMessages(updated);
    await chatService.saveMessages(activeSessionId, updated);

    setIsTyping(true);
    setTimeout(async () => {
      const reply = await chatService.sendTextMessage(activeSessionId, 'astrologer', "Main aapki aawaz sun pa raha hoon. Pareshan na hon, aapka grah dasha chakra bilkul anukool ho raha hai.");
      setMessages(prev => [...prev, reply]);
      setIsTyping(false);
    }, 1500);
  };

  // Dynamic Scroll to Bottom on Messages List updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, selectedImageFile]);

  // Format Helper: Seconds to MM:SS
  const formatMMSS = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Format Helper: Seconds to natural words (e.g., 3m 42s)
  const formatDuration = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  // Review submission
  const handleReviewSubmit = () => {
    // Demo submission of review
    onNavigate('astrologers');
  };

  // -----------------------------------------------------------------
  // RENDER INDIVIDUAL MESSAGES
  // -----------------------------------------------------------------
  const renderMessageBubble = (msg: Message) => {
    if (msg.type === 'system') {
      return (
        <div key={msg.id} className="w-full flex justify-center my-3 px-2">
          {msg.id === 'welcome-system' ? (
            /* Simple, elegant welcome system notification */
            <div className="bg-neutral-50 border border-neutral-100 px-4 py-2.5 rounded-2xl flex items-center space-x-2 max-w-[95%] shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
              <span className="text-[8.5px] uppercase font-extrabold tracking-widest text-[#FF8A00] bg-[#FF8A00]/5 border border-[#FF8A00]/10 px-1.5 py-0.5 rounded-md">SYSTEM</span>
              <span className="text-[11px] text-neutral-700 font-bold leading-relaxed">Paid consultation started with {astro?.name}. Real-time billing active.</span>
            </div>
          ) : (
            /* Log systems for completion */
            <div className="bg-neutral-50 border border-neutral-100 px-4 py-2.5 rounded-2xl flex items-center space-x-2 max-w-[95%] shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
              <span className="text-[8.5px] uppercase font-extrabold tracking-widest text-neutral-400 bg-white border border-neutral-200 px-1.5 py-0.5 rounded-md">LOG</span>
              <span className="text-[11px] text-neutral-700 font-bold leading-relaxed">{msg.text}</span>
            </div>
          )}
        </div>
      );
    }

    const isUser = msg.sender === 'user';
    
    return (
      <div 
        key={msg.id} 
        className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
      >
        <div 
          className={`max-w-[85%] rounded-[20px] px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col ${
            isUser 
              ? 'bg-neutral-900 text-white rounded-tr-md' 
              : 'bg-white border border-neutral-100 text-neutral-800 rounded-tl-md'
          }`}
        >
          {/* Text Bubble */}
          {msg.type === 'text' && (
            <p className="text-[13.5px] font-medium leading-relaxed whitespace-pre-wrap">{msg.text}</p>
          )}

          {/* Reusable Image Message Component with IndexedDB loaders */}
          {msg.type === 'image' && msg.attachmentUrl && (
            <div className="space-y-2">
              <div className="rounded-[14px] overflow-hidden border border-neutral-100/10 max-w-[240px]">
                <IndexedDBImage 
                  url={msg.attachmentUrl} 
                  className="w-full h-auto max-h-[180px] object-cover" 
                  alt={msg.attachmentName || "Uploaded Image"}
                />
              </div>
              <div className="flex items-center space-x-1.5 text-xs opacity-80">
                <ImageIcon size={13} className={isUser ? 'text-neutral-400' : 'text-[#FF8A00]'} />
                <span className="font-semibold truncate max-w-[150px] text-[11px]">{msg.attachmentName}</span>
              </div>
            </div>
          )}

          {/* Reusable PDF Message Component */}
          {msg.type === 'pdf' && (
            <div className={`p-2.5 rounded-xl flex items-center space-x-3 max-w-[240px] ${isUser ? 'bg-neutral-800' : 'bg-neutral-50'}`}>
              <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                <FileText size={18} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-bold truncate">{msg.attachmentName}</p>
                <p className="text-[9.5px] text-neutral-400 font-semibold mt-0.5">{msg.attachmentSize}</p>
              </div>
            </div>
          )}

          {/* Reusable Voice Note Component */}
          {msg.type === 'voice' && (
            <div className="flex items-center space-x-2 py-0.5 max-w-[240px]">
              <button className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-neutral-800 text-white' : 'bg-[#FF8A00]/10 text-[#FF8A00]'}`}>
                <Play size={11} className="fill-current ml-0.5" />
              </button>
              
              {/* Minimal waveform layout */}
              <div className="flex items-end space-x-0.5 h-5 shrink-0">
                {[2, 4, 3, 5, 2, 4, 6, 4, 3, 5, 2, 4, 2, 5, 3, 4].map((h, i) => (
                  <span 
                    key={i} 
                    className={`w-0.5 rounded-full ${isUser ? 'bg-neutral-500' : 'bg-neutral-300'}`} 
                    style={{ height: `${h * 15}%` }} 
                  />
                ))}
              </div>
              <span className="text-[9.5px] font-bold text-neutral-400">{msg.duration || '0:18'}</span>
            </div>
          )}

          {/* Meta Information: Timestamp and Read receipts */}
          <div className="flex items-center space-x-1.5 self-end mt-1.5">
            <span className={`text-[9px] font-semibold tracking-wide ${isUser ? 'text-white/60' : 'text-neutral-400'}`}>
              {msg.time}
            </span>
            {isUser && (
              <span className="text-white/80 flex items-center">
                <CheckCheck size={11} className="text-[#FF8A00]" />
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // -----------------------------------------------------------------
  // MAIN STATE MACHINE RENDERING CHANNELS
  // -----------------------------------------------------------------

  // 1. CHECKING WALLET SCREEN
  if (currentState === 'CHECKING_WALLET') {
    return (
      <div className="flex flex-col h-full w-full bg-white font-sans items-center justify-center px-6 select-none text-center">
        <div className="space-y-6 max-w-sm">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-20 h-20 rounded-full border-2 border-[#FF8A00]/20 animate-ping" />
            <div className="w-16 h-16 rounded-full bg-neutral-50 border border-neutral-100 shadow-md flex items-center justify-center text-[#FF8A00]">
              <Shield size={26} className="animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-[900] text-neutral-900 tracking-tight">Security Check</h3>
            <p className="text-neutral-500 text-xs font-semibold leading-relaxed">
              Checking wallet balance and consultation eligibility with {astro?.name}...
            </p>
          </div>
          <div className="h-1.5 w-32 bg-neutral-100 rounded-full overflow-hidden mx-auto">
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
              className="h-full w-12 bg-[#FF8A00] rounded-full"
            />
          </div>
        </div>
      </div>
    );
  }

  // 2. INSUFFICIENT BALANCE WARNING BOTTOM-SHEET / RENDER VIEW
  if (currentState === 'INSUFFICIENT_BALANCE') {
    const additionalNeeded = minimumRequired - walletBalance;
    return (
      <div className="flex flex-col h-full w-full bg-neutral-50 font-sans select-none justify-between">
        <div className="px-6 py-4 sticky top-0 bg-white border-b border-neutral-100 flex items-center space-x-3">
          <button onClick={() => onNavigate('astrologers')} className="p-1 -ml-1 text-neutral-800">
            <ArrowLeft size={22} strokeWidth={2.5} />
          </button>
          <h1 className="text-base font-extrabold text-neutral-900">Wallet Check</h1>
        </div>

        <div className="px-6 py-8 space-y-6 flex-1 flex flex-col justify-center">
          <div className="bg-white border border-neutral-200/60 rounded-[24px] p-6 text-center space-y-4 shadow-sm max-w-md mx-auto w-full">
            <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-[900] text-neutral-900 tracking-tight">Insufficient Wallet Balance</h2>
              <p className="text-neutral-500 text-xs font-semibold leading-relaxed">
                Consultation rate with {astro?.name} is <span className="text-[#FF8A00] font-extrabold">₹{ratePerMin}/min</span>. A minimum duration of {minimumMinutes} minutes (<span className="font-bold">₹{minimumRequired}</span>) is required to initiate the secure link.
              </p>
            </div>

            <div className="border-t border-b border-neutral-100 py-4.5 grid grid-cols-3 gap-2">
              <div className="text-center">
                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block">Your Balance</span>
                <span className="text-[14px] font-black text-neutral-800 mt-1 block">₹{walletBalance.toFixed(0)}</span>
              </div>
              <div className="text-center">
                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block">Min Required</span>
                <span className="text-[14px] font-black text-[#FF8A00] mt-1 block">₹{minimumRequired}</span>
              </div>
              <div className="text-center">
                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block">Deficit</span>
                <span className="text-[14px] font-black text-red-600 mt-1 block">₹{additionalNeeded}</span>
              </div>
            </div>

            <div className="flex items-start space-x-2 bg-neutral-50 p-3 rounded-xl text-[10.5px] text-neutral-600 font-semibold leading-relaxed text-left border border-neutral-100">
              <Info size={14} className="shrink-0 mt-0.5 text-[#FF8A00]" />
              <span>Click Recharge below to add a demo balance of ₹150 instantly. This will automatically continue your consultation process.</span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border-t border-neutral-100 flex space-x-3">
          <button 
            onClick={() => onNavigate('astrologers')}
            className="flex-1 h-12 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold transition-all border-none"
          >
            Cancel Request
          </button>
          <button 
            onClick={() => handleDemoRecharge(150)}
            className="flex-1 h-12 rounded-xl bg-[#FF8A00] hover:bg-[#E07A00] text-white text-xs font-black flex items-center justify-center space-x-1.5 shadow-md shadow-[#FF8A00]/10 transition-all border-none"
          >
            <Coins size={14} />
            <span>Recharge ₹150 Now</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. KUNDLI PREPARATION SCREEN
  if (currentState === 'PREPARING_KUNDLI') {
    return (
      <div className="flex flex-col h-full w-full bg-white font-sans px-6 justify-center py-6 space-y-6 text-center select-none">
        <div className="space-y-2">
          <span className="text-[#FF8A00] text-[9.5px] font-extrabold tracking-widest uppercase bg-[#FF8A00]/5 px-3 py-1 rounded-full border border-[#FF8A00]/10 inline-block">
            Vedic Computations Active
          </span>
          <h2 className="text-xl font-[900] text-neutral-900 tracking-tight">Preparing Your Janam Kundli</h2>
          <p className="text-neutral-500 text-xs font-semibold">Configuring celestial charts using your birth coordinate database</p>
        </div>

        {/* Pulsing Sacred geometry mandala placeholder */}
        <div className="relative flex items-center justify-center py-2">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 12, ease: 'linear' }}
            className="w-24 h-24 border border-neutral-200/80 rounded-full flex items-center justify-center p-2 opacity-50"
          >
            <svg viewBox="0 0 100 100" className="w-full h-full text-neutral-500 stroke-current fill-none">
              <circle cx="50" cy="50" r="45" strokeWidth="0.5" />
              <polygon points="50,5 95,50 50,95 5,50" strokeWidth="0.5" />
              <line x1="50" y1="0" x2="50" y2="100" strokeWidth="0.5" />
            </svg>
          </motion.div>
          <div className="absolute w-10 h-10 bg-white rounded-full border border-neutral-100 flex items-center justify-center shadow-md">
            <Sparkles size={16} className="text-[#FF8A00] animate-spin" style={{ animationDuration: '6s' }} />
          </div>
        </div>

        {/* Real-time Progress tracker */}
        <div className="w-full max-w-sm mx-auto space-y-3.5 bg-neutral-50 border border-neutral-200/40 rounded-2xl p-5 text-left">
          <div className="border-b border-neutral-100 pb-2.5 space-y-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Birth Profile</span>
            <span className="text-[13px] font-extrabold text-neutral-800 block">
              {userProfile?.fullName || userProfile?.name || 'Rahul Kumar (Guest)'}
            </span>
          </div>

          <div className="space-y-2.5">
            {KUNDLI_PREP_STEPS.map((stepStr, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs font-bold text-neutral-600">
                <span className="text-neutral-700">
                  {stepStr}
                </span>
                {kundliStepIdx > idx ? (
                  <Check size={14} className="text-green-600 shrink-0" strokeWidth={3} />
                ) : kundliStepIdx === idx ? (
                  <RefreshCw size={14} className="text-[#FF8A00] animate-spin shrink-0" />
                ) : (
                  <Clock size={14} className="text-neutral-300 shrink-0" />
                )}
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-neutral-100 text-center">
            <p className="text-[10.5px] text-neutral-500 font-semibold">
              Your wallet will not be charged during Kundli preparation.
            </p>
          </div>
        </div>

        <div className="pt-2">
          <p className="text-[10.5px] text-neutral-400 font-semibold tracking-wider uppercase">SECURE KUNDLI GENERATION • NO CHARGES YET</p>
        </div>
      </div>
    );
  }

  // 4. ASTROLOGER REVIEW WAITING SCREEN
  if (currentState === 'WAITING_FOR_ASTROLOGER') {
    return (
      <div className="flex flex-col h-full w-full bg-white font-sans px-6 justify-center py-6 space-y-6 text-center select-none relative">
        
        {/* Header summary of profile */}
        <div className="space-y-3">
          <div className="relative inline-block mx-auto">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-md">
              <img src={astro?.image} alt={astro?.name} className="w-full h-full object-cover" />
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse" />
          </div>

          <div className="space-y-0.5">
            <h3 className="text-base font-black text-neutral-900 tracking-tight">{astro?.name}</h3>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{astro?.skills.join(' • ')}</p>
            <div className="flex items-center justify-center space-x-2 text-xs font-bold text-neutral-500 mt-1">
              <span>₹{ratePerMin}/min</span>
            </div>
          </div>
        </div>

        {/* Center state / Confirmation card and Waiting indicator */}
        <div className="space-y-4 max-w-sm mx-auto w-full">
          <div className="bg-[#FFF5ED] border border-[#FF8A00]/10 p-4 rounded-2xl flex items-center space-x-3 text-left">
            <div className="w-8 h-8 rounded-xl bg-white border border-[#FF8A00]/10 flex items-center justify-center text-[#FF8A00] shrink-0">
              <BadgeCheck size={16} className="fill-[#FF8A00]/5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-black text-neutral-800 uppercase tracking-wider">Kundli Sent Successfully</h4>
              <p className="text-neutral-500 text-[10.5px] font-medium leading-relaxed mt-0.5">
                {astro?.name} has received your planetary birth configurations and is actively reviewing them.
              </p>
            </div>
          </div>

          <div className="space-y-3 py-1">
            <p className="text-xs font-extrabold text-neutral-800">Astrologer is reviewing your Kundli...</p>
            
            <div className="flex items-center justify-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF8A00] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF8A00] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF8A00] animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>

            {/* Visual Countdown Progress Bar */}
            <div className="space-y-1.5 max-w-xs mx-auto">
              <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden w-full">
                <div 
                  className="h-full bg-[#FF8A00] transition-all duration-1000 rounded-full" 
                  style={{ width: `${(waitingTimeoutSeconds / 60) * 100}%` }}
                />
              </div>
              <div className="text-[11px] text-neutral-400 font-semibold">
                Request expires in {waitingTimeoutSeconds} seconds
              </div>
              <p className="text-[10.5px] text-neutral-500 font-medium">
                Your wallet will not be charged until the astrologer accepts.
              </p>
            </div>
          </div>
        </div>

        {/* Action button & Developer Simulator */}
        <div className="space-y-3 max-w-xs mx-auto w-full">
          {(import.meta as any).env?.DEV === true && (
            <div className="border border-neutral-100 rounded-xl p-3 bg-neutral-50">
              <p className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider mb-2">⚡ Developer Simulator sandbox</p>
              <div className="flex space-x-2">
                <button onClick={handleSimulateAccept} className="flex-1 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-extrabold text-[10px] border-none uppercase transition-colors">Accept</button>
                <button onClick={handleSimulateReject} className="flex-1 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-extrabold text-[10px] border-none uppercase transition-colors">Reject</button>
                <button onClick={handleSimulateTimeout} className="flex-1 py-1.5 rounded-lg bg-neutral-600 hover:bg-neutral-700 text-white font-extrabold text-[10px] border-none uppercase transition-colors">Timeout</button>
              </div>
            </div>
          )}

          <button 
            onClick={() => {
              setShowCancelConfirm(true);
            }}
            className="h-11 w-full border border-neutral-200 text-neutral-700 text-xs font-bold rounded-xl hover:bg-neutral-50 transition-colors"
          >
            Cancel Request
          </button>
        </div>

        {/* Cancellation Confirmation Modal */}
        <AnimatePresence>
          {showCancelConfirm && (
            <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-[24px] p-6 max-w-xs w-full space-y-4 border border-neutral-100 shadow-2xl text-center"
              >
                <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
                  <AlertTriangle size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-[900] text-neutral-900 tracking-tight">Cancel this consultation request?</h3>
                  <p className="text-neutral-500 text-xs font-semibold leading-relaxed">
                    You have not been charged.
                  </p>
                </div>
                <div className="pt-2 flex space-x-3">
                  <button 
                    onClick={() => setShowCancelConfirm(false)}
                    className="flex-1 h-11 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl text-xs transition-colors cursor-pointer border-none"
                  >
                    No, Wait
                  </button>
                  <button 
                    onClick={async () => {
                      if (waitingTimerRef.current) clearInterval(waitingTimerRef.current);
                      setCurrentState('INSUFFICIENT_BALANCE');
                      setShowCancelConfirm(false);
                    }}
                    className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer border-none"
                  >
                    Yes, Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    );
  }

  // REJECTED STATE SCREEN
  if (currentState === 'REJECTED') {
    return (
      <div className="flex flex-col h-full w-full bg-white font-sans items-center justify-center px-6 text-center select-none">
        <div className="space-y-6 max-w-sm">
          <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
            <X size={26} strokeWidth={3} />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-[900] text-neutral-900 tracking-tight">Request Declined</h3>
            <p className="text-neutral-500 text-xs font-semibold leading-relaxed">
              Unfortunately, {astro?.name} had to decline the invitation at this moment (might have stepped away or has in-person commitments). No charges were made from your wallet.
            </p>
          </div>
          <button 
            onClick={() => onNavigate('astrologers')}
            className="h-11 px-6 rounded-xl bg-neutral-900 text-white text-xs font-bold"
          >
            Select Another Scholar
          </button>
        </div>
      </div>
    );
  }

  // EXPIRED STATE SCREEN
  if (currentState === 'EXPIRED') {
    return (
      <div className="flex flex-col h-full w-full bg-white font-sans items-center justify-center px-6 text-center select-none">
        <div className="space-y-6 max-w-sm">
          <div className="w-14 h-14 rounded-full bg-neutral-50 text-neutral-600 flex items-center justify-center mx-auto border border-neutral-100 shadow-sm">
            <Clock size={24} />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-[900] text-neutral-900 tracking-tight">Request Expired</h3>
            <p className="text-neutral-500 text-xs font-semibold leading-relaxed">
              {astro?.name} did not accept the request within the response interval of 60 seconds. Please try again or explore other online scholars.
            </p>
          </div>
          <div className="flex space-x-3 justify-center">
            <button 
              onClick={() => onNavigate('astrologers')}
              className="h-11 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold transition-all border-none"
            >
              Go Back
            </button>
            <button 
              onClick={runAstrologerReviewWait}
              className="h-11 px-4 rounded-xl bg-neutral-900 text-white text-xs font-bold flex items-center space-x-1.5"
            >
              <RefreshCw size={12} />
              <span>Retry Connection</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ENDED STATE SUMMARY SCREEN
  if (currentState === 'ENDED') {
    return (
      <div className="flex flex-col h-full w-full bg-neutral-50 font-sans select-none justify-between overflow-y-auto no-scrollbar pb-10">
        <div className="px-6 py-4 sticky top-0 bg-white border-b border-neutral-100 flex items-center justify-between">
          <h1 className="text-base font-extrabold text-neutral-900">Session Completed</h1>
          <span className="text-[10px] font-bold text-[#16A34A] uppercase tracking-widest bg-[#16A34A]/10 px-2 py-0.5 rounded-full">Securely Closed</span>
        </div>

        <div className="px-6 py-8 space-y-6 max-w-md mx-auto w-full flex-1">
          {/* Summary Card */}
          <div className="bg-white border border-neutral-200/60 rounded-[24px] p-6 space-y-5 shadow-sm text-center">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#FF8A00] p-1 mx-auto bg-neutral-50">
              <img src={astro?.image} alt={astro?.name} className="w-full h-full object-cover rounded-full" />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-black text-neutral-900 tracking-tight">Consultation with {astro?.name}</h2>
              <p className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider">Session Summary Invoice</p>
            </div>

            <div className="grid grid-cols-2 gap-3.5 pt-1 text-left">
              <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-xl space-y-1">
                <span className="text-[9px] font-bold text-neutral-400 uppercase block">Consultation Duration</span>
                <span className="text-sm font-black text-neutral-800 font-mono block">{formatDuration(elapsedSeconds)}</span>
              </div>
              <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-xl space-y-1">
                <span className="text-[9px] font-bold text-neutral-400 uppercase block">Rate Per Minute</span>
                <span className="text-sm font-black text-neutral-800 font-mono block">₹{ratePerMin}/min</span>
              </div>
              <div className="p-3 bg-[#FFF5ED] border border-[#FF8A00]/10 rounded-xl space-y-1">
                <span className="text-[9px] font-bold text-[#FF8A00] uppercase block">Total Amount Billed</span>
                <span className="text-sm font-black text-[#FF8A00] font-mono block">₹{totalCharged.toFixed(0)}</span>
              </div>
              <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-xl space-y-1">
                <span className="text-[9px] font-bold text-neutral-400 uppercase block">Remaining Wallet</span>
                <span className="text-sm font-black text-neutral-800 font-mono block">₹{walletBalance.toFixed(0)}</span>
              </div>
            </div>

            {/* Leave Review Box */}
            <div className="border-t border-neutral-100 pt-5 space-y-4">
              <div>
                <p className="text-xs font-black text-neutral-800">Rate your experience</p>
                <div className="flex items-center justify-center space-x-1.5 mt-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button 
                      key={star} 
                      onClick={() => setRating(star)}
                      className="p-1 focus:outline-none bg-transparent border-none"
                    >
                      <Star 
                        size={22} 
                        className={rating >= star ? 'fill-[#FF8A00] text-[#FF8A00]' : 'text-neutral-200'} 
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-neutral-400 uppercase block">Write review details (Optional)</label>
                <textarea 
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share how the astrological guidance helped you..."
                  className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-xs font-semibold focus:outline-none placeholder:text-neutral-400 h-20 resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border-t border-neutral-100 max-w-md mx-auto w-full">
          <button 
            onClick={handleReviewSubmit}
            className="w-full h-12 bg-neutral-900 hover:bg-neutral-800 text-white font-black rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all"
          >
            <span>Submit Review & Back Home</span>
            <ChevronRight size={13} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    );
  }

  // estimated time calculation
  const remainingMinutes = Math.floor(walletBalance / ratePerMin);
  const totalAvailableSeconds = remainingMinutes * 60;

  return (
    <div className="relative flex flex-col h-full w-full bg-white font-sans antialiased select-none">
      
      {/* Voice/Video Call Overlay modal */}
      <AnimatePresence>
        {activeCall && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-neutral-950/90 z-50 flex flex-col items-center justify-between py-16 px-6 text-center"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <span className="text-[#FF8A00] text-xs font-[800] tracking-widest uppercase bg-white/10 px-3 py-1 rounded-full border border-white/5">
                Paid Premium Call
              </span>
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#FF8A00] p-1 shadow-lg shadow-[#FF8A00]/20">
                  <img src={astro?.image} alt={astro?.name} className="w-full h-full object-cover rounded-full" />
                </div>
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#16A34A] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                  Live
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">{astro?.name}</h3>
                <p className="text-neutral-400 text-xs font-semibold mt-1">Connecting premium {activeCall === 'voice' ? 'audio' : 'video'} wave...</p>
              </div>
            </div>

            <div className="w-full max-w-xs bg-white/5 border border-white/10 rounded-2xl p-4.5 text-center space-y-1.5">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Pricing Plan</span>
              <p className="text-white font-bold text-sm">
                ₹{ratePerMin}/min will be charged
              </p>
              <p className="text-neutral-500 text-[10.5px] font-medium leading-relaxed">Charges and session remain in sync with active chat room.</p>
            </div>

            <div className="flex flex-col items-center space-y-6 w-full">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 bg-[#FF8A00] rounded-full animate-ping"></span>
                <span className="text-xs font-bold text-neutral-300">Astrologer is joining...</span>
              </div>

              <button 
                onClick={() => setActiveCall(null)}
                className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg transition-colors cursor-pointer border-none"
              >
                <Phone size={24} className="rotate-[135deg]" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog overlay for ending session */}
      <AnimatePresence>
        {showEndConfirm && (
          <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[24px] p-6 max-w-sm w-full space-y-4 border border-neutral-100 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-full bg-[#FFF5ED] text-neutral-800 flex items-center justify-center mx-auto">
                <AlertCircle size={24} className="text-[#FF8A00]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-[900] text-neutral-900 tracking-tight">End Consultation?</h3>
                <p className="text-neutral-500 text-xs font-semibold leading-relaxed">
                  Are you sure you want to end this active premium consultation session? Your final invoice summary will be generated automatically.
                </p>
              </div>
              <div className="pt-2 flex space-x-3">
                <button 
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1 h-11 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl text-xs transition-colors cursor-pointer border-none"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleFinalizeSessionEnd}
                  className="flex-1 h-11 bg-neutral-900 hover:bg-neutral-850 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer border-none"
                >
                  End Session
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Low Balance Grace Period Recharge Dialog */}
      <AnimatePresence>
        {currentState === 'RECHARGING' && (
          <div className="absolute inset-0 bg-black/60 z-40 flex items-end justify-center p-0 backdrop-blur-[2px]">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white rounded-t-[30px] p-6 w-full space-y-5 border-t border-neutral-200/50 shadow-2xl text-center pb-12"
            >
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
                <AlertCircle size={24} className="animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-neutral-900 tracking-tight">Low Balance — Recharge Now</h3>
                <p className="text-neutral-500 text-xs font-semibold leading-relaxed">
                  Your wallet has dropped below the minimum ₹25 per-minute charge. Add balance instantly to prevent automated session termination.
                </p>
              </div>

              {/* Grace countdown */}
              <div className="bg-red-50 border border-red-100/50 rounded-2xl py-3 max-w-xs mx-auto">
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest block">Grace Period Counter</span>
                <span className="text-xl font-black text-red-600 font-mono mt-0.5 block">{gracePeriodSeconds} Seconds Left</span>
              </div>

              <div className="pt-2 flex space-x-3 max-w-xs mx-auto">
                <button 
                  onClick={handleFinalizeSessionEnd}
                  className="flex-1 h-12 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl text-xs transition-colors border-none cursor-pointer"
                >
                  End Session
                </button>
                <button 
                  onClick={() => handleDemoRecharge(150)}
                  className="flex-1 h-12 bg-[#FF8A00] hover:bg-[#E07A00] text-white font-black rounded-xl text-xs transition-colors flex items-center justify-center space-x-1 border-none cursor-pointer"
                >
                  <Coins size={14} />
                  <span>Add ₹150</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Kundli Viewer Drawer / Modal Overlay */}
      <AnimatePresence>
        {isKundliOpen && kundliData && (
          <div className="absolute inset-0 bg-black/50 z-45 flex justify-end">
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-white h-full flex flex-col justify-between shadow-2xl relative"
            >
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center space-x-2.5">
                  <Sparkles size={16} className="text-[#FF8A00]" />
                  <h3 className="text-base font-black text-neutral-900 tracking-tight">Active Janam Kundli</h3>
                </div>
                <button 
                  onClick={() => setIsKundliOpen(false)}
                  className="p-1 rounded-full hover:bg-neutral-50 text-neutral-500"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar">
                
                {/* 1. Brief overview info */}
                <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4.5 space-y-3">
                  <div className="flex items-center space-x-2 text-neutral-400 text-[10px] font-bold uppercase tracking-wider border-b border-neutral-200/50 pb-2.5">
                    <User size={13} className="text-[#FF8A00]" />
                    <span>Calculated Coordinates</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block">Lagna Sign</span>
                      <span className="font-extrabold text-neutral-800 mt-0.5 block">{kundliData.lagna}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block">Moon Sign</span>
                      <span className="font-extrabold text-neutral-800 mt-0.5 block">{kundliData.moonSign}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block">Sun Sign</span>
                      <span className="font-extrabold text-neutral-800 mt-0.5 block">{kundliData.sunSign}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block">Nakshatra</span>
                      <span className="font-extrabold text-neutral-800 mt-0.5 block">{kundliData.nakshatra}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs border-t border-neutral-200/40 pt-3">
                    <div>
                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block">Mahadasha</span>
                      <span className="font-extrabold text-[#FF8A00] mt-0.5 block">{kundliData.mahadasha}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block">Antardasha</span>
                      <span className="font-extrabold text-[#FF8A00] mt-0.5 block">{kundliData.antardasha}</span>
                    </div>
                  </div>
                </div>

                {/* 2. North Indian chart D1 */}
                <div className="space-y-3">
                  <span className="text-neutral-400 text-[10px] font-black uppercase tracking-wider block">Lagna Kundli (D1 Chart)</span>
                  <div className="w-full aspect-square max-w-[280px] mx-auto bg-white rounded-2xl border border-neutral-200 p-4 relative flex items-center justify-center">
                    <svg viewBox="0 0 200 200" className="w-full h-full text-neutral-300 stroke-current fill-none">
                      <g strokeWidth="0.8">
                        <rect x="5" y="5" width="190" height="190" />
                        <line x1="5" y1="5" x2="195" y2="195" />
                        <line x1="195" y1="5" x2="5" y2="195" />
                        <polygon points="100,5 195,100 100,195 5,100" />
                      </g>
                    </svg>

                    {/* Labels positioned mathematically inside houses */}
                    <div className="absolute top-[12px] left-1/2 -translate-x-1/2 text-[9px] font-black text-neutral-700">D1</div>
                    <div className="absolute top-[48px] left-[48px] text-[10px] font-extrabold text-neutral-800">Lagna</div>
                    <div className="absolute top-[48px] right-[48px] text-[10px] font-extrabold text-neutral-800">Rahu</div>
                    <div className="absolute bottom-[48px] left-[48px] text-[10px] font-extrabold text-neutral-800">Ketu</div>
                    <div className="absolute bottom-[48px] right-[48px] text-[10px] font-extrabold text-neutral-800">Jupiter</div>
                    <div className="absolute top-1/2 left-[15px] -translate-y-1/2 text-[10px] font-extrabold text-[#FF8A00]">Mars</div>
                    <div className="absolute top-1/2 right-[15px] -translate-y-1/2 text-[10px] font-extrabold text-neutral-800">Saturn</div>
                    <div className="absolute bottom-[15px] left-1/2 -translate-x-1/2 text-[10px] font-extrabold text-neutral-800">Sun, Budha</div>
                  </div>
                </div>

                {/* 3. Navamsa Chart D9 */}
                <div className="space-y-3">
                  <span className="text-neutral-400 text-[10px] font-black uppercase tracking-wider block">Navamsa Kundli (D9 Chart)</span>
                  <div className="w-full aspect-square max-w-[280px] mx-auto bg-white rounded-2xl border border-neutral-200 p-4 relative flex items-center justify-center">
                    <svg viewBox="0 0 200 200" className="w-full h-full text-neutral-300 stroke-current fill-none">
                      <g strokeWidth="0.8">
                        <rect x="5" y="5" width="190" height="190" />
                        <line x1="5" y1="5" x2="195" y2="195" />
                        <line x1="195" y1="5" x2="5" y2="195" />
                        <polygon points="100,5 195,100 100,195 5,100" />
                      </g>
                    </svg>

                    {/* Labels */}
                    <div className="absolute top-[12px] left-1/2 -translate-x-1/2 text-[9px] font-black text-neutral-700">D9</div>
                    <div className="absolute top-[48px] left-[48px] text-[10px] font-extrabold text-neutral-800">Moon</div>
                    <div className="absolute top-[48px] right-[48px] text-[10px] font-extrabold text-neutral-800">Sun</div>
                    <div className="absolute bottom-[48px] left-[48px] text-[10px] font-extrabold text-neutral-800">Saturn</div>
                    <div className="absolute bottom-[48px] right-[48px] text-[10px] font-extrabold text-neutral-800">Venus</div>
                    <div className="absolute top-1/2 left-[15px] -translate-y-1/2 text-[10px] font-extrabold text-neutral-800">Mars</div>
                    <div className="absolute top-1/2 right-[15px] -translate-y-1/2 text-[10px] font-extrabold text-neutral-800">Mercury</div>
                  </div>
                </div>

                {/* 4. Planetary Details Grid */}
                <div className="space-y-3 text-left">
                  <span className="text-neutral-400 text-[10px] font-black uppercase tracking-wider block">Planetary Alignments details</span>
                  <div className="border border-neutral-100 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-neutral-50 text-neutral-400 border-b border-neutral-100 text-[9px] font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-3 text-left">Planet</th>
                          <th className="py-2.5 px-3 text-left">Longitude</th>
                          <th className="py-2.5 px-3 text-center">House</th>
                          <th className="py-2.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 font-semibold text-neutral-700">
                        {kundliData.planetPositions.map((planet, idx) => (
                          <tr key={idx} className="hover:bg-neutral-50/50">
                            <td className="py-2.5 px-3 font-bold text-neutral-800">{planet.name}</td>
                            <td className="py-2.5 px-3 font-mono text-[10.5px] text-neutral-500">{planet.longitude}</td>
                            <td className="py-2.5 px-3 text-center">{planet.house}</td>
                            <td className="py-2.5 px-3 text-right text-[10px] text-neutral-500">{planet.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              <div className="p-4 bg-neutral-50 border-t border-neutral-100 sticky bottom-0">
                <button 
                  onClick={() => setIsKundliOpen(false)}
                  className="w-full h-11 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl text-xs"
                >
                  Close Viewer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* STICKY HEADER (Updated Design according to guidelines) */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md z-30 border-b border-neutral-100 flex items-center justify-between px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
        <div className="flex items-center space-x-3 min-w-0">
          <button 
            onClick={() => {
              if (readOnlySessionId) {
                onNavigate('chat-history');
              } else if (currentState !== 'ENDED') {
                setShowEndConfirm(true);
              } else {
                onNavigate('astrologers');
              }
            }}
            className="p-1.5 -ml-1 rounded-full hover:bg-neutral-50 active:bg-neutral-100 transition-colors text-neutral-800 cursor-pointer"
          >
            <ArrowLeft size={22} strokeWidth={2.5} />
          </button>

          {/* Astrologer Identity Info */}
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="relative shrink-0">
              <div className="w-[42px] h-[42px] rounded-full overflow-hidden bg-neutral-100 border border-neutral-200">
                <img src={astro?.image} alt={astro?.name} className="w-full h-full object-cover" />
              </div>
              {!readOnlySessionId && (
                <div className="absolute bottom-[1px] right-[1px] w-[9px] h-[9px] bg-[#16A34A] border-2 border-white rounded-full animate-pulse" />
              )}
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center space-x-1">
                <h2 className="text-[14px] font-[900] text-neutral-900 truncate tracking-tight">{astro?.name}</h2>
                <BadgeCheck size={14} className="text-[#FF8A00] fill-white shrink-0" />
              </div>
              
              <div className="flex items-center space-x-1 text-[10.5px] text-neutral-400 font-bold leading-none mt-0.5">
                <span className="flex items-center text-neutral-800 font-extrabold mr-1">
                  <Star size={9} className="fill-[#FF8A00] text-[#FF8A00] stroke-none mr-0.5" />
                  {astro?.rating}
                </span>
                <span>•</span>
                <span className="text-[#16A34A]">₹{ratePerMin}/min</span>
              </div>
            </div>
          </div>
        </div>

        {/* Media call tools */}
        {!readOnlySessionId && (
          <div className="flex items-center space-x-1.5">
            <button 
              onClick={() => setActiveCall('voice')}
              className="p-2 rounded-full border border-neutral-200 text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 transition-all cursor-pointer"
            >
              <Phone size={15} strokeWidth={2.5} />
            </button>
            
            <button 
              onClick={() => setActiveCall('video')}
              className="p-2 rounded-full border border-neutral-200 text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 transition-all cursor-pointer"
            >
              <Video size={16} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>

      {/* ACTIVE SESSION CALM BAR */}
      {!readOnlySessionId && (
        <div className="bg-neutral-900 text-white px-4 py-3 z-20 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] shrink-0 animate-pulse animate-duration-1000" />
            <span className="text-xs font-bold text-neutral-300 truncate min-w-0">
              Paid consultation active
            </span>
            <span className="text-neutral-500 font-bold text-xs shrink-0">•</span>
            <div className="flex items-center space-x-1 text-xs shrink-0 min-w-0">
              <Clock size={11} className="text-[#FF8A00]" />
              <span className="font-mono font-bold text-white pl-0.5">
                {formatMMSS(elapsedSeconds)}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button 
              onClick={() => setShowEndConfirm(true)}
              className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all font-extrabold text-[10px] px-3 py-1 rounded-lg uppercase tracking-wider cursor-pointer"
            >
              End Session
            </button>
          </div>
        </div>
      )}

      {/* Collapsible Developer Tools Panel (Only in development environment) */}
      {(import.meta as any).env?.DEV === true && (
        <details className="bg-neutral-50 border-b border-neutral-200/50 z-20">
          <summary className="px-4 py-1.5 flex items-center justify-between text-[10px] text-neutral-500 font-bold uppercase tracking-wider cursor-pointer hover:bg-neutral-100 select-none">
            <span>⚡ Developer Tools</span>
            <span className="text-neutral-400 font-mono text-[9px] lowercase">click to toggle</span>
          </summary>
          <div className="px-4 pb-2 pt-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[10px] text-neutral-500 font-semibold select-none border-t border-neutral-200/20">
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
              <span className="bg-neutral-200 text-neutral-600 font-extrabold px-1.5 py-0.5 rounded uppercase">Sandbox Mode</span>
              <button 
                onClick={() => setIsSpeedUpMode(!isSpeedUpMode)}
                className={`px-2 py-0.5 rounded font-extrabold transition-all border ${
                  isSpeedUpMode 
                    ? 'bg-[#FF8A00] border-[#FF8A00] text-white' 
                    : 'bg-white border-neutral-200 text-neutral-600'
                }`}
              >
                ⚡ Speed-Up (10s = 1m): {isSpeedUpMode ? 'ON' : 'OFF'}
              </button>
            </div>
            <span className="text-neutral-400 font-medium truncate min-w-0">Full Session ID: <span className="font-mono text-[9.5px] select-all">{activeSessionId || '#RESTORED'}</span></span>
          </div>
        </details>
      )}

      {/* Main Chat Scroll Frame */}
      <div className="flex-1 overflow-y-auto px-4 py-4 z-10 flex flex-col no-scrollbar bg-[#FAFAFA]/40">
        
        {/* Paid consultation details summary header block */}
        {readOnlySessionId ? (
          <div className="mb-4 bg-neutral-50 border border-neutral-200/60 rounded-2xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.01)] text-left">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-full overflow-hidden border border-neutral-200 shrink-0 bg-white">
                  <img src={astro?.image} alt={astro?.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-neutral-900">{astro?.name}</h3>
                  <p className="text-[10px] text-neutral-500 font-bold leading-tight mt-0.5">{astro?.skills.slice(0, 2).join(', ')}</p>
                  <p className="text-[9.5px] text-neutral-400 font-semibold mt-0.5">
                    Consultation Transcript
                  </p>
                </div>
              </div>
              <div className="bg-neutral-200/60 text-neutral-600 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider flex items-center space-x-1 shrink-0">
                <span className="w-1 h-1 rounded-full bg-neutral-500"></span>
                <span>Completed</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-neutral-200/40 text-xs">
              <div>
                <span className="text-[9.5px] font-extrabold text-neutral-400 uppercase tracking-widest block">Duration</span>
                <span className="font-bold text-neutral-800 block mt-0.5 font-mono">{formatDuration(elapsedSeconds)}</span>
              </div>
              <div>
                <span className="text-[9.5px] font-extrabold text-neutral-400 uppercase tracking-widest block">Amount Paid</span>
                <span className="font-bold text-neutral-800 block mt-0.5 font-mono">₹{totalCharged.toFixed(0)}</span>
              </div>
              <div>
                <span className="text-[9.5px] font-extrabold text-neutral-400 uppercase tracking-widest block">Kundli Status</span>
                <span className="font-bold text-green-600 block mt-0.5 flex items-center space-x-0.5">
                  <ShieldCheck size={11} className="inline mr-0.5 shrink-0 text-[#16A34A]" />
                  <span>Shared</span>
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-neutral-200/40">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Securely Archived
              </span>
              <button 
                onClick={() => setIsKundliOpen(true)}
                className="flex items-center space-x-1 text-xs font-black text-[#FF8A00] hover:text-[#E07A00] bg-transparent border-none cursor-pointer p-0"
              >
                <Sparkles size={11} />
                <span>View Shared Kundli</span>
                <ChevronRight size={11} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-3 bg-white border border-neutral-200/60 rounded-2xl p-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.01)] text-left">
            <div 
              onClick={() => setIsBillingCardCollapsed(!isBillingCardCollapsed)}
              className="flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <ShieldCheck size={16} className="text-[#FF8A00] shrink-0" />
                <span className="text-xs font-extrabold text-neutral-800 uppercase tracking-wider truncate min-w-0 flex-1">
                  Paid Consultation
                </span>
                <span className="text-[10px] font-bold text-neutral-400 font-mono shrink-0 truncate min-w-0">
                  Session #{ (activeSessionId || '7849').slice(-4).toUpperCase() }
                </span>
              </div>
              
              <div className="flex items-center space-x-2 shrink-0 ml-1.5">
                <div className="flex items-center space-x-1.5 bg-neutral-50 border border-neutral-200 text-neutral-600 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider truncate min-w-0">
                  <span className="w-1 h-1 rounded-full bg-green-500 shrink-0"></span>
                  <span>Kundli Shared</span>
                </div>
                <ChevronDown 
                  size={16} 
                  className={`text-neutral-400 transition-transform duration-200 shrink-0 ${isBillingCardCollapsed ? '' : 'rotate-180'}`} 
                />
              </div>
            </div>

            <AnimatePresence initial={false}>
              {!isBillingCardCollapsed && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-3 pt-3 mt-3 border-t border-neutral-100"
                >
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block truncate min-w-0">Live Elapsed</span>
                      <span className="font-extrabold text-neutral-800 block mt-0.5 font-mono truncate min-w-0">{formatDuration(elapsedSeconds)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block truncate min-w-0">Rate</span>
                      <span className="font-extrabold text-neutral-800 block mt-0.5 truncate min-w-0">₹25/min</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block truncate min-w-0">Wallet Balance</span>
                      <span className="font-extrabold text-neutral-800 block mt-0.5 font-mono truncate min-w-0">₹{walletBalance.toFixed(0)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block truncate min-w-0">Remaining Duration</span>
                      <span className="font-extrabold text-[#FF8A00] block mt-0.5 font-mono truncate min-w-0">~{remainingMinutes} minutes</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-neutral-100 flex-wrap gap-2">
                    <div className="flex items-center space-x-1 text-[10px] text-neutral-400 font-bold uppercase tracking-wider truncate min-w-0">
                      <Shield size={12} className="text-[#16A34A] shrink-0" />
                      <span className="truncate min-w-0">Secure & encrypted</span>
                    </div>

                    <button 
                      onClick={() => setIsKundliOpen(true)}
                      className="flex items-center space-x-1 text-xs font-black text-[#FF8A00] hover:text-[#E07A00] bg-transparent border-none cursor-pointer p-0 shrink-0"
                    >
                      <Sparkles size={12} />
                      <span>View Kundli</span>
                      <ChevronRight size={12} strokeWidth={2.5} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Messages Loop */}
        <div className="flex flex-col space-y-1">
          {messages.map(renderMessageBubble)}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex w-full justify-start mb-4">
              <div className="bg-white border border-neutral-100 rounded-[20px] rounded-tl-md px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex items-center space-x-1.5">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mr-1">Scholar is reviewing charts</span>
                <span className="w-1.5 h-1.5 bg-[#FF8A00] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-[#FF8A00] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-[#FF8A00] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} className="h-4" />
        </div>

      </div>

      {/* Low-Balance Warning Banner above Input composer */}
      {currentState === 'LOW_BALANCE' && !readOnlySessionId && (
        <div className="bg-amber-50 border-t border-amber-150 px-4 py-2 flex items-center justify-between text-xs text-amber-800 font-bold z-20">
          <div className="flex items-center space-x-1.5 min-w-0">
            <AlertTriangle size={14} className="text-amber-600 shrink-0 animate-bounce" />
            <span className="truncate">Low Balance warning — Recharge to continue consultation (₹{walletBalance.toFixed(0)} left)</span>
          </div>
          <button 
            onClick={() => handleDemoRecharge(150)}
            className="shrink-0 bg-amber-600 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-lg uppercase tracking-wider transition-colors border-none cursor-pointer hover:bg-amber-700"
          >
            Add ₹150
          </button>
        </div>
      )}

      {/* Message input field bar with real image loaders */}
      <div className="relative bg-white border-t border-neutral-100 px-4 py-3 pb-[max(16px,env(safe-area-inset-bottom))] z-20 shadow-[0_-4px_16px_rgba(0,0,0,0.01)]">
        
        {readOnlySessionId ? (
          <div className="bg-neutral-50 rounded-2xl border border-neutral-150/60 p-4 text-center my-1">
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">This Consultation Has Ended</p>
            <p className="text-[11.5px] font-semibold text-neutral-400 leading-relaxed mb-3">
              The session with {astro?.name} is completed. You can view the history of messages, generated charts, and details here.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-2">
              <button 
                onClick={() => onNavigate('chat-history')}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 h-10 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-extrabold text-[11px] rounded-xl transition-all cursor-pointer border-none"
              >
                <span>Back to History</span>
              </button>
              <button 
                onClick={() => onNavigate('astrologers')}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 h-10 px-5 bg-[#FF8A00] hover:bg-[#E07A00] text-white font-extrabold text-[11px] rounded-xl transition-all cursor-pointer border-none shadow-sm shadow-[#FF8A00]/10"
              >
                <span>Start New Consultation</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Selected Image Preview with cross button to remove */}
            {selectedImageFile && (
              <div className="mb-3 p-2 bg-neutral-50 rounded-xl border border-neutral-100 flex items-center justify-between max-w-sm">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-neutral-200">
                    <img src={selectedImageFile} alt="Selected preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate text-neutral-800">{selectedImageName}</p>
                    <p className="text-[10px] text-green-600 font-semibold">Image selected for sending</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setSelectedImageFile('');
                    setSelectedImageName('');
                  }}
                  className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500 border-none bg-transparent"
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {/* Attachment menu toggles */}
            <AnimatePresence>
              {isAttachmentOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-[calc(100%+8px)] left-4 bg-white border border-neutral-100 rounded-2xl shadow-xl p-3.5 w-56 flex flex-col space-y-2 z-40"
                >
                  {/* Actual file selector styled nicely */}
                  <label className="flex items-center space-x-3 p-2 rounded-xl hover:bg-neutral-50 text-left transition-colors cursor-pointer w-full">
                    <div className="w-8 h-8 rounded-lg bg-[#FF8A00]/5 text-[#FF8A00] flex items-center justify-center shrink-0">
                      <ImageIcon size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-neutral-800">Upload Birth Chart</p>
                      <p className="text-[10px] text-neutral-400 font-semibold">From your gallery</p>
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                      className="hidden" 
                    />
                  </label>

                  <button 
                    onClick={sendMockPdf}
                    className="flex items-center space-x-3 p-2 rounded-xl hover:bg-neutral-50 text-left transition-colors cursor-pointer border-none bg-transparent w-full"
                  >
                    <div className="w-8 h-8 rounded-lg bg-red-500/5 text-red-500 flex items-center justify-center shrink-0">
                      <FileText size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-neutral-800">Send Birth Patrika</p>
                      <p className="text-[10px] text-neutral-400 font-semibold font-sans">Detailed PDF report</p>
                    </div>
                  </button>

                  <button 
                    onClick={sendMockVoiceNote}
                    className="flex items-center space-x-3 p-2 rounded-xl hover:bg-neutral-50 text-left transition-colors cursor-pointer border-none bg-transparent w-full"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#16A34A]/5 text-[#16A34A] flex items-center justify-center shrink-0">
                      <Volume2 size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-neutral-800">Send Voice Note</p>
                      <p className="text-[10px] text-neutral-400 font-semibold">Audio recording</p>
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input bar */}
            <div className="flex items-center space-x-3">
              
              <button 
                onClick={() => setIsAttachmentOpen(!isAttachmentOpen)}
                className="w-[40px] h-[40px] flex items-center justify-center rounded-full border border-neutral-100 hover:bg-neutral-50 active:bg-neutral-100 transition-colors text-neutral-400 shrink-0 cursor-pointer"
              >
                <Paperclip size={18} strokeWidth={2.5} />
              </button>
              
              <form onSubmit={handleSendMessage} className="flex-1 flex items-center bg-neutral-50 border border-neutral-100 rounded-2xl pr-1.5 pl-4 py-1">
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={currentState === 'RECHARGING'}
                  placeholder={
                    currentState === 'RECHARGING' 
                      ? "Recharge required to send message." 
                      : "Ask regarding career, marriage, remedies..."
                  } 
                  className="flex-1 bg-transparent border-none focus:outline-none text-[13.5px] font-semibold text-neutral-800 placeholder:text-neutral-400 h-10 disabled:cursor-not-allowed"
                />
                
                <button 
                  type="submit"
                  disabled={(!inputText.trim() && !selectedImageFile) || currentState === 'RECHARGING'}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                    (inputText.trim() || selectedImageFile) && currentState !== 'RECHARGING'
                      ? 'bg-neutral-900 text-white shadow-md active:scale-95 cursor-pointer' 
                      : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                  }`}
                >
                  <Send size={14} strokeWidth={2.5} className="ml-0.5 text-[#FF8A00]" />
                </button>
              </form>

            </div>
          </>
        )}
      </div>
    </div>
  );
}
