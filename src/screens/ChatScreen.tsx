import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Phone, Video, Paperclip, Send, Clock, ShieldCheck, MoreVertical, Lock } from 'lucide-react';
import { Screen } from '../types';
import { useProfile } from '../contexts/ProfileContext';

interface ChatScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
  routeParams?: {
    initialQuery?: string;
    serviceContext?: string;
  };
}

interface Message {
  id: string;
  text: string;
  sender: 'astrologer' | 'user';
  time: string;
}

export default function ChatScreen({ onNavigate, routeParams }: ChatScreenProps) {
  const { profile } = useProfile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes in seconds
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isTyping, setIsTyping] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);

  // Load profile data and set initial message sequence
  useEffect(() => {
    let isMounted = true;

    const runGreetingSequence = async () => {
      // profile is accessed from useProfile
      let pData = null;
      let name = 'User';
      
      if (profile) {
        pData = profile;
        setProfileData(profile);
        name = profile.name || 'User';
      }

      let formattedDate = 'Not provided';
      if (pData?.dob) {
        const d = new Date(pData.dob);
        formattedDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      }
      
      let formattedTime = 'Not provided';
      if (pData?.tob) {
        const [hours, minutes] = pData.tob.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        formattedTime = `${h12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
      }

      let location = 'Not provided';
      if (pData?.city || pData?.state) {
        location = [pData?.city, pData?.state].filter(Boolean).join(', ');
      }

      // If initialQuery is present, add it directly as user message and trigger response
      if (routeParams?.initialQuery) {
        const initialGreetingText = `Radhe Radhe ${name} Ji 🙏`;
        setMessages([
          {
            id: 'greet-0',
            text: initialGreetingText,
            sender: 'astrologer',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          },
          {
            id: 'user-0',
            text: routeParams.initialQuery,
            sender: 'user',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);

        setIsTyping(true);
        try {
          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, 1500));
          if (!isMounted) return;

          setMessages(prev => [...prev, {
            id: `response-${Date.now()}`,
            text: "Radhe Radhe! Main dekh pa raha hoon ki aapka prashna mahatvapurna hai. Kripya apni pareshani vistar se batayein taaki main apki Kundli ke anusar sahi margdarshan kar saku.",
            sender: 'astrologer',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        } catch (e) {
          console.error(e);
        }
        setIsTyping(false);
        return;
      }

      // If serviceContext is present, customize greeting to focus on that topic
      if (routeParams?.serviceContext) {
        const greetingSequence = [
          `Radhe Radhe ${name} Ji 🙏`,
          `Main dekh pa raha hoon ki aap apni Janam Kundli ke anusar "${routeParams.serviceContext}" ke baare mein jaanna chahte hain.`,
          `Kripya mujhe apna prashna batayein taaki main aapko vistrit roop se guide kar sakoon.`
        ];

        for (let i = 0; i < greetingSequence.length; i++) {
          if (!isMounted) return;
          setIsTyping(true);
          await new Promise(resolve => setTimeout(resolve, Math.random() * 800 + 800));
          if (!isMounted) return;
          
          setMessages(prev => [...prev, {
            id: `greet-${i}`,
            text: greetingSequence[i],
            sender: 'astrologer',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        }
        setIsTyping(false);
        return;
      }

      // Default greeting sequence
      const greetingSequence = [
        `Radhe Radhe ${name} Ji 🙏`,
        `Main aapki Janam Kundli load kar raha hoon...`,
        `✅ Kundli mil gayi.`,
        `Janam Tithi\n${formattedDate}`,
        `Janam Samay\n${formattedTime}`,
        `Janam Sthan\n${location}`,
        `Main dekh pa raha hoon ki iss samay aapke jeevan mein kuch challenges chal rahe hain.`,
        `Sabse pehle mujhe batayiye...`,
        `Aap Career, Love Life, Paisa ya Family mein se kis baare mein baat karna chahenge?`
      ];

      for (let i = 0; i < greetingSequence.length; i++) {
        if (!isMounted) return;
        setIsTyping(true);
        // Human-like pause for reading/typing (1-2s)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 1000));
        if (!isMounted) return;
        
        setMessages(prev => [...prev, {
          id: `greet-${i}`,
          text: greetingSequence[i],
          sender: 'astrologer',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
      
      if (isMounted) setIsTyping(false);
    };

    runGreetingSequence();

    return () => {
      isMounted = false;
    };
  }, [routeParams]);

  // Timer logic
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Idle timeout feature
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    if (messages.length > 0 && messages[messages.length - 1].sender === 'astrologer' && !isTyping && timeLeft > 0) {
      idleTimerRef.current = setTimeout(() => {
        handleIdleEngagement();
      }, 10000); // 10 seconds idle timeout
    }

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [messages, isTyping, timeLeft]);

  const handleIdleEngagement = async () => {
    if (timeLeft <= 0) return;
    
    // Prevent overlapping requests
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    
    setIsTyping(true);
    
    const hiddenContextMessage: Message = {
      id: Date.now().toString(),
      text: "SYSTEM: The user has not replied for a while. Send a short, interesting psychological observation based on their profile to re-engage them. Do not mention that you are doing this. Just say something like 'Main tab tak aapki Kundli dekh raha tha...' and make a small intriguing point. Ask a yes/no question at the end.",
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const tempMessages = [...messages, hiddenContextMessage];
    
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: "Main tab tak aapki Kundli dekh raha tha... Aapki rashi me ek shubh yog ban raha hai. Kya aap iske bare me vistar se janna chahenge?",
        sender: 'astrologer',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      setIsTyping(false);
    } catch (error) {
      console.error("Chat idle error:", error);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: "Astrologer is experiencing a network issue. Please try again later.",
          sender: 'astrologer',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        setIsTyping(false);
      }, 1500);
    }
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || timeLeft <= 0 || isTyping) return;

    const userText = inputText.trim();
    setInputText('');

    const newUserMessage: Message = {
      id: Date.now().toString(),
      text: userText,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newUserMessage]);
    setIsTyping(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    
    let aiText = "Mujhe aapki pareshani samajh aa rahi hai. Kripya thoda aur vistar se batayein.";
    const q = userText.toLowerCase();
    
    if (q.includes('career') || q.includes('job') || q.includes('work')) {
      aiText = "Aapki kundli me 10th house strong hai. Career me jald hi nayi opportunity aane wali hai.";
    } else if (q.includes('love') || q.includes('marriage') || q.includes('shaadi')) {
      aiText = "7th house par Guru ki drishti hai. Relationships me sudhaar aayega, thoda patience rakhein.";
    } else if (q.includes('money') || q.includes('finance') || q.includes('paisa')) {
      aiText = "Financial growth thodi slow hai, par aane wale 3 mahino me dhan laabh ke yog ban rahe hain.";
    } else if (q.includes('family') || q.includes('health')) {
      aiText = "Parivar me shanti ka aagman hoga. Health ke liye thoda dhyan rakhein, subah jaldi uthne ka prayas karein.";
    }

    setMessages(prev => [...prev, {
      id: Date.now().toString() + "-ai",
      text: aiText,
      sender: 'astrologer',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    
    setIsTyping(false);
  };

  return (
    <div className="relative flex flex-col h-full w-full bg-[#FAFAFA] font-sans antialiased selection:bg-[#FF8A00]/20">
      
      {/* Background Image Pattern */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-[0.04] flex items-center justify-center bg-[#FAFAFA]">
        <img 
          src="https://i.ibb.co/4ZrDyD6C/image.png" 
          alt="Celestial Background" 
          className="w-full h-full object-cover sm:object-contain opacity-50 blur-[1px]"
        />
      </div>

      {/* Header */}
      <div className="bg-[#FFFFFF] px-[16px] sm:px-[20px] pt-[max(16px,env(safe-area-inset-top))] sm:pt-[24px] pb-[16px] shadow-[0_2px_10px_rgba(0,0,0,0.04)] z-20 flex items-center justify-between border-b border-[#F3F4F6] relative">
        <div className="flex items-center">
          <button 
            onClick={() => onNavigate('home')}
            className="p-[8px] -ml-[8px] mr-[4px] rounded-full hover:bg-gray-50 active:bg-gray-100 transition-colors text-[#111827]"
          >
            <ArrowLeft size={24} strokeWidth={2.5} />
          </button>

          <div className="flex items-center space-x-[12px]">
            <div className="relative">
              <div className="w-[44px] h-[44px] rounded-full overflow-hidden bg-[#F9FAFB] border border-[#F3F4F6]">
                <img 
                  src="https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?auto=format&fit=crop&w=150&q=80" 
                  alt="Acharya Dev Sharma"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute bottom-[2px] right-[2px] w-[10px] h-[10px] bg-[#10B981] border-2 border-[#FFFFFF] rounded-full" />
            </div>
            
            <div className="flex flex-col">
              <h2 className="text-[16px] font-bold text-[#111827] leading-[1.2] tracking-[-0.01em]">Acharya Dev Sharma</h2>
              <div className="text-[13px] text-[#6B7280] font-medium leading-[1.4] mt-[2px]">Vedic Astrologer</div>
              <div className="flex items-center mt-[2px]">
                <span className="text-[#FBBF24] text-[13px] mr-[4px]">★</span>
                <span className="text-[13px] font-bold text-[#111827]">4.8</span>
                <span className="text-[13px] text-[#9CA3AF] ml-[4px]">(256)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-[16px]">
          <div className="flex flex-col items-center">
            <div className="relative">
              <button className="w-[40px] h-[40px] rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#4B5563] bg-white opacity-60" disabled>
                <Phone size={18} strokeWidth={2} />
              </button>
              <div className="absolute -bottom-[4px] -right-[4px] bg-[#FFFFFF] rounded-full p-[2px]">
                <div className="bg-[#FF8A00] rounded-full p-[2px] flex items-center justify-center">
                  <Lock size={8} className="text-white" strokeWidth={3} />
                </div>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-[#6B7280] mt-[6px]">Call</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="relative">
              <button className="w-[40px] h-[40px] rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#4B5563] bg-white opacity-60" disabled>
                <Video size={20} strokeWidth={2} />
              </button>
              <div className="absolute -bottom-[4px] -right-[4px] bg-[#FFFFFF] rounded-full p-[2px]">
                <div className="bg-[#FF8A00] rounded-full p-[2px] flex items-center justify-center">
                  <Lock size={8} className="text-white" strokeWidth={3} />
                </div>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-[#6B7280] mt-[6px]">Video Call</span>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-[20px] pb-[24px] z-10 flex flex-col">
        
        {/* Timer and Actions Area */}
        <div className="w-full flex flex-col pt-[16px] pb-[8px]">
          <div className="flex items-center space-x-[12px] w-full mb-[16px]">
            {/* Timer Banner */}
            <div className="flex-1 bg-[#FFF5ED] rounded-[16px] px-[16px] py-[12px] flex items-center justify-between border border-[#FF8A00]/10 shadow-[0_2px_10px_rgba(255,138,0,0.02)]">
              <div className="flex items-center space-x-[12px]">
                <div className="w-[40px] h-[40px] bg-white rounded-full flex items-center justify-center shadow-sm">
                  <Clock size={20} className="text-[#FF8A00]" strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[12px] font-semibold text-[#6B7280] mb-[2px]">Free Chat Time Left</span>
                  <span className="text-[24px] font-bold text-[#FF8A00] leading-none tracking-tight">{formatTime(timeLeft)}</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[14px] font-bold text-[#111827]">10:00</span>
                <span className="text-[12px] font-medium text-[#6B7280]">Total</span>
              </div>
            </div>
            
            {/* End Chat Button */}
            <button className="h-[66px] px-[20px] bg-[#FFFFFF] border border-[#FF8A00] rounded-[16px] text-[#FF8A00] font-semibold text-[15px] shadow-[0_2px_10px_rgba(255,138,0,0.04)] active:bg-orange-50 transition-colors shrink-0 flex items-center justify-center">
              End Chat
            </button>
          </div>
          
          {/* Locked Warning Pill */}
          <div className="self-center bg-[#FFF5ED] px-[16px] py-[8px] rounded-full flex items-center space-x-[8px] mb-[24px]">
            <Lock size={14} className="text-[#6B7280]" strokeWidth={2} />
            <span className="text-[13px] font-medium text-[#4B5563]">Calls are locked in free chat</span>
          </div>
          
          {/* Today Separator */}
          <div className="flex items-center w-full justify-center space-x-[12px] mb-[16px]">
            <div className="w-[20px] h-[1px] bg-[#E5E7EB]" />
            <span className="text-[12px] font-medium text-[#9CA3AF]">Today</span>
            <div className="w-[20px] h-[1px] bg-[#E5E7EB]" />
          </div>
        </div>

        <div className="flex flex-col space-y-[16px]">
          <AnimatePresence initial={false}>
          {messages.map((msg, index) => (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: index === 0 ? 0.3 : 0 }}
              className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[85%] sm:max-w-[75%] rounded-[20px] px-[16px] py-[12px] shadow-sm flex flex-col ${
                  msg.sender === 'user' 
                    ? 'bg-[#FF8A00] text-[#FFFFFF] rounded-tr-[4px]' 
                    : 'bg-[#FFFFFF] border border-[#F3F4F6] text-[#111827] rounded-tl-[4px]'
                }`}
              >
                <div className="text-[15px] leading-[1.6] whitespace-pre-wrap font-medium">
                  {msg.text}
                </div>
                <span className={`text-[11px] font-semibold mt-[6px] self-end tracking-wide ${
                  msg.sender === 'user' ? 'text-[#FFFFFF]/80' : 'text-[#9CA3AF]'
                }`}>
                  {msg.time}
                </span>
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="flex w-full justify-start"
            >
              <div className="bg-[#FFFFFF] border border-[#F3F4F6] rounded-[20px] rounded-tl-[4px] px-[16px] py-[14px] shadow-sm flex items-center space-x-[4px]">
                <motion.div className="w-[6px] h-[6px] bg-[#D1D5DB] rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0 }} />
                <motion.div className="w-[6px] h-[6px] bg-[#D1D5DB] rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.2 }} />
                <motion.div className="w-[6px] h-[6px] bg-[#D1D5DB] rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} className="h-[10px]" />
        </div>
      </div>

      {/* Message Input Bar or Premium Message */}
      {timeLeft > 0 ? (
        <div className="bg-[#FFFFFF] px-[20px] py-[12px] pb-[max(20px,env(safe-area-inset-bottom))] border-t border-[#F3F4F6] z-20 flex items-center space-x-[12px] shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
          
          <button className="w-[40px] h-[40px] flex items-center justify-center rounded-full hover:bg-gray-50 active:bg-gray-100 transition-colors text-[#9CA3AF] opacity-50 shrink-0" disabled>
            <Paperclip size={22} strokeWidth={2} />
          </button>
          
          <form onSubmit={handleSendMessage} className="flex-1 flex items-center bg-[#F9FAFB] border border-[#F3F4F6] rounded-[24px] pr-[6px] pl-[16px]">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Write your message..." 
              className="flex-1 bg-transparent border-none focus:outline-none text-[15px] font-medium text-[#111827] placeholder:text-[#9CA3AF] h-[48px]"
            />
            
            <button 
              type="submit"
              disabled={!inputText.trim()}
              className={`w-[36px] h-[36px] rounded-full flex items-center justify-center shrink-0 transition-all ${
                inputText.trim() 
                  ? 'bg-[#FF8A00] text-[#FFFFFF] shadow-[0_2px_8px_rgba(255,138,0,0.3)] active:scale-[0.96]' 
                  : 'bg-[#F3F4F6] text-[#9CA3AF]'
              }`}
            >
              <Send size={16} strokeWidth={2.5} className="ml-[2px]" />
            </button>
          </form>

        </div>
      ) : (
        <div className="bg-[#FFFFFF] px-[20px] pt-[24px] pb-[max(24px,env(safe-area-inset-bottom))] border-t border-[#F3F4F6] z-20 flex flex-col items-center shadow-[0_-10px_30px_rgba(0,0,0,0.04)]">
          <div className="w-[48px] h-[48px] rounded-full bg-[#FFF5ED] flex items-center justify-center text-[#FF8A00] mb-[16px]">
            <Clock size={24} strokeWidth={2.5} />
          </div>
          <p className="text-[15px] text-[#4B5563] text-center font-medium leading-[1.6] mb-[20px] px-[10px]">
            🙏 Aapka Free Chat Session samapt ho gaya hai. Agar aap apni Kundli ka aur gehra vishleshan ya future ke baare mein detail guidance lena chahte hain to Premium Subscription lekar conversation continue kar sakte hain.
          </p>
          <button className="w-full h-[52px] bg-[#FF8A00] rounded-[16px] text-[#FFFFFF] flex items-center justify-center font-semibold text-[16px] active:scale-[0.98] transition-all shadow-[0_4px_14px_rgba(255,138,0,0.25)] mb-[12px]">
            Continue with Premium
          </button>
          <button 
            onClick={() => onNavigate('home')}
            className="text-[14px] font-semibold text-[#6B7280] p-[8px] active:text-[#374151]"
          >
            Exit Chat
          </button>
        </div>
      )}
    </div>
  );
}
