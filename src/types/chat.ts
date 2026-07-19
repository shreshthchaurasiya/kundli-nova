export interface Message {
  id: string;
  text?: string;
  sender: 'astrologer' | 'user' | 'system' | 'nova';
  time: string;
  type: 'text' | 'image' | 'pdf' | 'voice' | 'system' | 'kundli-loading' | 'kundli-card';
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: string;
  duration?: string;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  kundliLoadingStep?: number;
  kundliData?: any; // References KundliData from types/kundli
}

export interface ChatState {
  sessionId: string;
  status: 'waiting' | 'active' | 'recharging' | 'ended';
  lastMessageAt?: string;
  unreadCount: number;
}

export interface AiChatThread {
  id: string;
  topic: string;
  lastMessage: string;
  timestamp: string;
  messages: Message[];
}
