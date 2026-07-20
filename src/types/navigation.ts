export type Screen = 
  | 'splash' 
  | 'login' 
  | 'signup'
  | 'forgot-password'
  | 'otp' 
  | 'create-profile' 
  | 'edit-profile'
  | 'view-kundli'
  | 'consultation-chat'
  | 'welcome-gift'
  | 'home' 
  | 'wallet' 
  | 'chat' 
  | 'nova-ai-chat'
  | 'nova-kundli'
  | 'chat-list'
  | 'chat-history'
  | 'astrologers' 
  | 'services'
  | 'profile' 
  | 'astrologer-profile'
  | 'partner-with-us'
  | 'astrologer-application'
  | 'astrologer-dashboard'
  | 'manage-astrologer-profile'
  | 'help-support'
  | 'category-detail'
  | 'nova-ai';

export type Tab = 'home' | 'chat-list' | 'chat-history' | 'nova-ai' | 'services' | 'profile';

export interface Astrologer {
  id: string;
  name: string;
  image: string;
  experience: string;
  languages: string[];
  skills: string[];
  rating: number;
  consultations: number;
  pricePerMinute: number;
  isOnline: boolean;
  about: string;
}

export interface ChatThread {
  id: string;
  astrologerId: string;
  lastMessage: string;
  unreadCount: number;
  timestamp: string;
}
