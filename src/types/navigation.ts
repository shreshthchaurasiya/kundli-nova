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
  | 'astrologer-consultation-chat'
  | 'manage-astrologer-profile'
  | 'help-support'
  | 'category-detail'
  | 'nova-ai'
  | 'kundli-profile-form';

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

/**
 * Navigation parameters that must survive the consultation flow:
 * ConsultationChat → KundliProfileSelector → KundliProfileFormScreen → back.
 */
export interface ConsultationNavParams {
  /** The astrologer the customer selected. Must be preserved across all screens. */
  astrologerId?: string;
  /** For read-only transcript viewing; bypasses selector. */
  readOnlySessionId?: string;
  /** Which screen to return to after profile creation. */
  returnTo?: Screen;
  /** Discriminator so screens know they are in a consultation creation flow. */
  intent?: 'select-kundli-for-consultation';
}

/** Route params accepted by KundliProfileFormScreen. */
export interface KundliProfileFormNavParams extends ConsultationNavParams {
  /** Which screen opened this form (for header back button label). */
  fromScreen?: Screen;
}
