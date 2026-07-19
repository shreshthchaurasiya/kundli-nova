import { Astrologer } from '../types';
import { ASTROLOGERS } from '../data';

// --- Types ---
export type ConsultationState =
  | 'CHECKING_WALLET'
  | 'INSUFFICIENT_BALANCE'
  | 'PREPARING_KUNDLI'
  | 'WAITING_FOR_ASTROLOGER'
  | 'REJECTED'
  | 'EXPIRED'
  | 'ACTIVE'
  | 'LOW_BALANCE'
  | 'RECHARGING'
  | 'ENDED';

export interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  timestamp: string;
}

export interface ConsultationRequest {
  id: string;
  astrologerId: string;
  userId: string;
  status: ConsultationState;
  createdAt: string;
  acceptedAt?: string;
  endedAt?: string;
  elapsedSeconds: number;
  billingMode: 'wallet' | 'subscription';
  ratePerMin: number;
  totalCharged: number;
}

export interface KundliData {
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

export interface Message {
  id: string;
  text?: string;
  sender: 'astrologer' | 'user' | 'system';
  time: string;
  type: 'text' | 'image' | 'pdf' | 'voice' | 'system';
  attachmentUrl?: string; // For IndexedDB, could be an "idb://<key>" string
  attachmentName?: string;
  attachmentSize?: string;
  duration?: string;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
}

// Helper to delay simulation (making it asynchronous like real networks)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
    await delay(300);
    const saved = localStorage.getItem('kundli_nova_wallet_balance');
    if (saved !== null) {
      const parsed = parseFloat(saved);
      return isNaN(parsed) ? 150 : parsed;
    }
    localStorage.setItem('kundli_nova_wallet_balance', '150');
    return 150;
  },

  async recharge(amount: number): Promise<number> {
    await delay(400);
    const current = await this.getBalance();
    const updated = current + amount;
    localStorage.setItem('kundli_nova_wallet_balance', updated.toString());

    // Record transaction
    const txs = await this.getTransactions();
    const newTx: WalletTransaction = {
      id: `tx-${Date.now()}`,
      type: 'credit',
      amount,
      description: 'Wallet Recharge (Demo)',
      timestamp: new Date().toLocaleString()
    };
    localStorage.setItem('kundli_nova_transactions', JSON.stringify([newTx, ...txs]));
    return updated;
  },

  async debit(amount: number): Promise<number> {
    await delay(200);
    const current = await this.getBalance();
    const updated = Math.max(0, current - amount);
    localStorage.setItem('kundli_nova_wallet_balance', updated.toString());

    // Record transaction
    const txs = await this.getTransactions();
    const newTx: WalletTransaction = {
      id: `tx-${Date.now()}`,
      type: 'debit',
      amount,
      description: 'Consultation Session Charge',
      timestamp: new Date().toLocaleString()
    };
    localStorage.setItem('kundli_nova_transactions', JSON.stringify([newTx, ...txs]));
    return updated;
  },

  async getTransactions(): Promise<WalletTransaction[]> {
    await delay(200);
    const saved = localStorage.getItem('kundli_nova_transactions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  }
};

// --- 2. Consultation Service ---
export const consultationService = {
  async createRequest(astrologerId: string, userId: string): Promise<ConsultationRequest> {
    await delay(300);
    const astro = ASTROLOGERS.find(a => a.id === astrologerId) || ASTROLOGERS[0];
    const newReq: ConsultationRequest = {
      id: `session-kn-${Date.now()}`,
      astrologerId,
      userId,
      status: 'CHECKING_WALLET',
      createdAt: new Date().toISOString(),
      elapsedSeconds: 0,
      billingMode: 'wallet',
      ratePerMin: astro.pricePerMinute || 25,
      totalCharged: 0
    };
    localStorage.setItem('kundli_nova_active_request', JSON.stringify(newReq));
    return newReq;
  },

  async getRequest(requestId: string): Promise<ConsultationRequest | null> {
    const saved = localStorage.getItem('kundli_nova_active_request');
    if (saved) {
      try {
        const req: ConsultationRequest = JSON.parse(saved);
        if (req.id === requestId) return req;
      } catch {
        return null;
      }
    }
    return null;
  },

  async updateRequestStatus(requestId: string, status: ConsultationState): Promise<ConsultationRequest | null> {
    const req = await this.getRequest(requestId);
    if (req) {
      req.status = status;
      localStorage.setItem('kundli_nova_active_request', JSON.stringify(req));
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
      localStorage.setItem('kundli_nova_active_request', JSON.stringify(req));
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
      localStorage.setItem('kundli_nova_active_request', JSON.stringify(req));
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
      localStorage.setItem('kundli_nova_active_request', JSON.stringify(req));
      
      // Save session state to a historic catalog with unique id check
      const history = await this.getSessionHistory();
      const filteredHistory = history.filter(item => item.id !== sessionId);
      localStorage.setItem('kundli_nova_session_history', JSON.stringify([req, ...filteredHistory]));
      
      // Also clear active request
      localStorage.removeItem('kundli_nova_active_request');
      return req;
    } else {
      const history = await this.getSessionHistory();
      const existing = history.find(item => item.id === sessionId);
      if (existing) {
        return existing;
      }
    }
    return null;
  },

  async getSessionHistory(): Promise<ConsultationRequest[]> {
    const saved = localStorage.getItem('kundli_nova_session_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  }
};

// --- 3. Kundli Service ---
export const kundliService = {
  async getUserProfile(userId: string): Promise<any> {
    await delay(100);
    const saved = localStorage.getItem('kundli_nova_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  },

  async getUserKundli(userId: string): Promise<KundliData | null> {
    await delay(300);
    const saved = localStorage.getItem(`kundli_nova_user_kundli_${userId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    // Automatically generate if not existing
    return this.generateDemoKundli(userId);
  },

  async generateDemoKundli(userId: string): Promise<KundliData> {
    await delay(500);
    const demo: KundliData = {
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
    localStorage.setItem(`kundli_nova_user_kundli_${userId}`, JSON.stringify(demo));
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
    await delay(100);
    const saved = localStorage.getItem(`kundli_nova_chat_messages_${sessionId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  },

  async saveMessages(sessionId: string, messages: Message[]): Promise<void> {
    localStorage.setItem(`kundli_nova_chat_messages_${sessionId}`, JSON.stringify(messages));
  },

  async sendTextMessage(sessionId: string, senderId: string, text: string): Promise<Message> {
    await delay(100);
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      text,
      sender: senderId === 'user' ? 'user' : 'astrologer',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text',
      status: 'sent'
    };
    
    const current = await this.getMessages(sessionId);
    await this.saveMessages(sessionId, [...current, newMessage]);
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

    const current = await this.getMessages(sessionId);
    await this.saveMessages(sessionId, [...current, newMessage]);
    return newMessage;
  },

  subscribeToMessages(sessionId: string, onUpdate: (messages: Message[]) => void): () => void {
    // Poll localStorage for chat updates (creates simulation of real-time server updates)
    const interval = setInterval(async () => {
      const msgs = await this.getMessages(sessionId);
      onUpdate(msgs);
    }, 1500);

    return () => clearInterval(interval);
  },

  async saveSessionState(sessionId: string, state: any): Promise<void> {
    await delay(100);
    localStorage.setItem(`kundli_nova_chat_state_${sessionId}`, JSON.stringify(state));
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
