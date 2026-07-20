import { 
  Astrologer, 
  WalletTransaction, 
  ConsultationSession as ConsultationRequest, 
  ConsultationState, 
  Message 
} from '../types';
import { ApiClient } from './api/apiClient';
import { ENDPOINTS } from './api/endpoints';
import { ASTROLOGERS } from '../data';
import { SupabaseWalletRepository } from '../repositories/supabase/supabaseWalletRepository';
import { consultationStorage } from './storage/consultationStorage';
import { chatStorage } from './storage/chatStorage';
import { kundliProfileStorage } from './storage/kundliProfileStorage';


export type { ConsultationState, Message };
export type KundliData = DemoConsultationKundliData;

export interface DemoConsultationKundliData {
  lagna: string;
  moonSign: string;
  sunSign: string;
  nakshatra: string;
  mahadasha: string;
  antardasha: string;
  planetPositions: Array<{
    name: string;
    longitude: string;
    house: number;
    status: string; // Exalted, Debilitated, Own, Enemy, etc.
  }>;
  northIndianChart: string[]; // House configurations
  navamsaChart: string[];
}

// Helper to delay simulation (making it asynchronous like real networks)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const walletRepository = new SupabaseWalletRepository();

// --- IndexedDB Configuration for Chat Images ---
const DB_NAME = 'KundliNovaChatDB';
const DB_VERSION = 1;
const STORE_NAME = 'images';

function getIDBDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storeImageInIndexedDB(id: string, base64OrBlobUrl: string): Promise<string> {
  try {
    const db = await getIDBDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ id, data: base64OrBlobUrl });
      
      transaction.oncomplete = () => resolve(`idb://${id}`);
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('IndexedDB store failed, falling back to basic reference', error);
    return base64OrBlobUrl; // fallback
  }
}

export async function retrieveImageFromIndexedDB(idbUrl: string): Promise<string> {
  if (!idbUrl.startsWith('idb://')) return idbUrl;
  const id = idbUrl.replace('idb://', '');
  try {
    const db = await getIDBDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.data);
        } else {
          resolve('');
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('IndexedDB retrieve failed', error);
    return '';
  }
}

// --- 1. Wallet Service ---
export const walletService = {
  async getBalance(): Promise<number> {
    return (await walletRepository.getWalletState()).balance;
  },

  async recharge(amount: number): Promise<number> {
    const updatedState = await walletRepository.recharge(amount, 'Wallet Recharge (Demo)');
    return updatedState.balance;
  },

  async debit(amount: number): Promise<number> {
    const updatedState = await walletRepository.debit(amount, 'Consultation Session Charge');
    return updatedState.balance;
  },

  async getTransactions(): Promise<WalletTransaction[]> {
    return walletRepository.getTransactions();
  }
};

// --- 2. Consultation Service ---
export const consultationService = {
  async createRequest(astrologerId: string, userId: string): Promise<ConsultationRequest> {
    await delay(300);
    const astro = ASTROLOGERS.find(a => a.id === astrologerId) || ASTROLOGERS[0];
    const nowStr = new Date().toISOString();
    const newReq: ConsultationRequest = {
      id: `session-kn-${Date.now()}`,
      astrologerId,
      userId,
      status: 'CHECKING_WALLET',
      createdAt: nowStr,
      requestedAt: nowStr,
      elapsedSeconds: 0,
      billingMode: 'wallet',
      ratePerMin: astro.pricePerMinute || 25,
      ratePerMinute: astro.pricePerMinute || 25,
      totalCharged: 0,
      billedMinutes: 0
    };
    consultationStorage.setActiveRequest(newReq);
    return newReq;
  },

  async getRequest(requestId: string): Promise<ConsultationRequest | null> {
    const req = consultationStorage.getActiveRequest();
    if (req && req.id === requestId) return req;
    return null;
  },

  async updateRequestStatus(requestId: string, status: ConsultationState): Promise<ConsultationRequest | null> {
    const req = await this.getRequest(requestId);
    if (req) {
      req.status = status;
      consultationStorage.setActiveRequest(req);
      return req;
    }
    return null;
  },

  async acceptRequest(requestId: string): Promise<ConsultationRequest | null> {
    await delay(500);
    const req = await this.getRequest(requestId);
    if (req) {
      req.status = 'ACTIVE';
      req.acceptedAt = new Date().toISOString();
      req.startedAt = new Date().toISOString();
      req.lastBilledAt = new Date().toISOString();
      req.billedMinutes = 1;
      req.totalCharged = req.ratePerMinute;
      await walletService.debit(req.ratePerMinute);
      consultationStorage.setActiveRequest(req);
      return req;
    }
    return null;
  },

  async rejectRequest(requestId: string): Promise<ConsultationRequest | null> {
    await delay(400);
    return this.updateRequestStatus(requestId, 'REJECTED');
  },

  async expireRequest(requestId: string): Promise<ConsultationRequest | null> {
    await delay(400);
    return this.updateRequestStatus(requestId, 'EXPIRED');
  },

  async startSession(requestId: string): Promise<ConsultationRequest | null> {
    await delay(300);
    const req = await this.getRequest(requestId);
    if (req) {
      req.status = 'ACTIVE';
      req.acceptedAt = new Date().toISOString();
      req.startedAt = new Date().toISOString();
      req.lastBilledAt = new Date().toISOString();
      req.billedMinutes = 1;
      req.totalCharged = req.ratePerMinute;
      await walletService.debit(req.ratePerMinute);
      consultationStorage.setActiveRequest(req);
      return req;
    }
    return null;
  },

  async endSession(sessionId: string, currentSeconds: number, currentCharged: number): Promise<ConsultationRequest | null> {
    await delay(400);
    const req = await this.getRequest(sessionId);
    if (req) {
      req.status = 'ENDED';
      req.elapsedSeconds = currentSeconds;
      req.totalCharged = currentCharged;
      req.endedAt = new Date().toISOString();
      consultationStorage.saveSessionSession(req);
      consultationStorage.removeActiveRequest();
      return req;
    } else {
      const history = consultationStorage.getSessionHistory();
      const existing = history.find(item => item.id === sessionId);
      if (existing) {
        return existing;
      }
    }
    return null;
  },

  async getSessionHistory(): Promise<ConsultationRequest[]> {
    return consultationStorage.getSessionHistory();
  }
};

// --- 3. Kundli Service ---
export const kundliService = {
  async getUserProfile(userId: string): Promise<any> {
    await delay(100);
    return { name: 'Shreshth', gender: 'male', dob: '1995-10-15', tob: '10:30', state: 'Uttar Pradesh', district: 'Varanasi', city: 'Varanasi' };
  },

  async getUserKundli(userId: string): Promise<DemoConsultationKundliData | null> {
    await delay(300);
    const saved = kundliProfileStorage.getUserKundli(userId);
    if (saved) return saved;
    return this.generateDemoKundli(userId);
  },

  async generateDemoKundli(userId: string): Promise<DemoConsultationKundliData> {
    await delay(500);
    const demo: DemoConsultationKundliData = {
      lagna: 'Mesh (Aries)',
      moonSign: 'Kanya (Virgo)',
      sunSign: 'Kark (Cancer)',
      nakshatra: 'Hasta',
      mahadasha: 'Jupiter (Guru)',
      antardasha: 'Mercury (Budh)',
      planetPositions: [
        { name: 'Sun (Surya)', longitude: '15° 24\' 12"', house: 4, status: 'Friendly' },
        { name: 'Moon (Chandra)', longitude: '08° 12\' 44"', house: 6, status: 'Neutral' },
        { name: 'Mars (Mangal)', longitude: '22° 41\' 09"', house: 1, status: 'Own Sign (Ruchak Yoga)' },
        { name: 'Mercury (Budha)', longitude: '11° 50\' 32"', house: 4, status: 'Budhaditya Yoga' },
        { name: 'Jupiter (Guru)', longitude: '29° 01\' 55"', house: 11, status: 'Friendly' },
        { name: 'Venus (Shukra)', longitude: '03° 14\' 10"', house: 3, status: 'Enemy Sign' },
        { name: 'Saturn (Shani)', longitude: '18° 07\' 24"', house: 9, status: 'Own Sign' },
        { name: 'Rahu', longitude: '05° 33\' 12"', house: 12, status: 'Neutral' },
        { name: 'Ketu', longitude: '05° 33\' 12"', house: 6, status: 'Neutral' }
      ],
      northIndianChart: [
        'Lagna (Ar)', 'Rahu', 'Venus', 'Sun, Budha', 'Empty', 'Moon, Ketu',
        'Empty', 'Empty', 'Saturn', 'Empty', 'Jupiter', 'Empty'
      ],
      navamsaChart: [
        'Empty', 'Moon', 'Empty', 'Sun', 'Empty', 'Saturn',
        'Mars', 'Jupiter', 'Rahu', 'Ketu', 'Venus', 'Mercury'
      ]
    };
    kundliProfileStorage.saveUserKundli(userId, demo);
    return demo;
  },

  async getKundliStatus(userId: string): Promise<string> {
    await delay(200);
    return 'PREPARED';
  }
};

// --- 4. Chat Service ---
export const chatService = {
  async getMessages(sessionId: string): Promise<Message[]> {
    try {
      const dbMessages = await ApiClient.get<any[]>(ENDPOINTS.CHAT.GET_MESSAGES(sessionId));
      if (Array.isArray(dbMessages)) {
        const formatted: Message[] = dbMessages.map(msg => ({
          id: msg.id || `msg-${Date.now()}-${Math.random()}`,
          text: msg.message_text,
          sender: msg.sender === 'user' ? 'user' : 'astrologer',
          time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'text',
          status: 'sent'
        }));
        
        // Merge with local ones in case there are image attachments not in DB yet
        const localMessages = chatStorage.getMessages(sessionId);
        const allMessages = [...formatted];
        // simple merge strategy: add non-text messages from local
        for (const localMsg of localMessages) {
          if (localMsg.type !== 'text' && !allMessages.find(m => m.id === localMsg.id)) {
            allMessages.push(localMsg);
          }
        }
        allMessages.sort((a, b) => {
          // If we can't properly sort by time, keep insertion order, 
          // but formatted are from DB so they are already sorted by time.
          return 0;
        });

        chatStorage.saveMessages(sessionId, allMessages);
        return allMessages;
      }
    } catch (err) {
      console.warn("Failed to fetch messages from backend, falling back to local storage", err);
    }
    
    return chatStorage.getMessages(sessionId);
  },

  async saveMessages(sessionId: string, messages: Message[]): Promise<void> {
    chatStorage.saveMessages(sessionId, messages);
  },

  async sendTextMessage(sessionId: string, senderId: string, text: string): Promise<Message> {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      text,
      sender: senderId === 'user' ? 'user' : 'astrologer',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text',
      status: 'sent'
    };
    
    // Save locally for instant UI update
    const current = chatStorage.getMessages(sessionId);
    chatStorage.saveMessages(sessionId, [...current, newMessage]);
    
    // Sync with backend
    try {
      await ApiClient.post(ENDPOINTS.CHAT.SEND_MESSAGE(sessionId), {
        body: { text, client_message_id: newMessage.id }
      });
    } catch (err) {
      console.warn("Failed to sync message to backend", err);
    }
    
    return newMessage;
  },

  async sendImageMessage(sessionId: string, senderId: string, base64Image: string, fileName: string): Promise<Message> {
    await delay(200);
    
    // Save image to IndexedDB first to avoid localstorage quota limit
    const imageId = `chat-img-${Date.now()}`;
    const idbUrl = await storeImageInIndexedDB(imageId, base64Image);

    const newMessage: Message = {
      id: `msg-img-${Date.now()}`,
      sender: senderId === 'user' ? 'user' : 'astrologer',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'image',
      attachmentUrl: idbUrl, // Saved reference string like idb://chat-img-12345
      attachmentName: fileName,
      status: 'sent'
    };

    // Save locally
    const current = chatStorage.getMessages(sessionId);
    chatStorage.saveMessages(sessionId, [...current, newMessage]);
    
    // Sync with backend (Note: in production, you would upload the image to Supabase Storage and send the URL)
    try {
      await ApiClient.post(ENDPOINTS.CHAT.SEND_MESSAGE(sessionId), {
        body: { text: "[Image Attachment]", client_message_id: newMessage.id }
      });
    } catch (err) {
      console.warn("Failed to sync image message to backend", err);
    }
    
    return newMessage;
  },

  subscribeToMessages(sessionId: string, onUpdate: (messages: Message[]) => void): () => void {
    // Poll storage for chat updates (creates simulation of real-time server updates)
    const interval = setInterval(async () => {
      const msgs = await this.getMessages(sessionId);
      onUpdate(msgs);
    }, 1500);

    return () => clearInterval(interval);
  },

  async saveSessionState(sessionId: string, state: any): Promise<void> {
    await delay(100);
    chatStorage.saveChatState(sessionId, state);
  }
};

// --- 5. Astrologer Service ---
export const astrologerService = {
  async getAstrologer(astrologerId: string): Promise<Astrologer | null> {
    await delay(100);
    const astro = ASTROLOGERS.find(a => a.id === astrologerId);
    return astro || null;
  },

  async getAvailability(astrologerId: string): Promise<boolean> {
    await delay(150);
    const astro = await this.getAstrologer(astrologerId);
    return astro ? astro.isOnline : false;
  },

  async setAvailability(astrologerId: string, status: boolean): Promise<boolean> {
    await delay(200);
    const index = ASTROLOGERS.findIndex(a => a.id === astrologerId);
    if (index !== -1) {
      ASTROLOGERS[index].isOnline = status;
      return status;
    }
    return false;
  }
};
