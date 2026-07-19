import { WalletState, WalletTransaction } from '../../types/wallet';
import { ConsultationSession, ConsultationState } from '../../types/consultation';
import { Message, ChatState, AiChatThread } from '../../types/chat';
import { BirthDetails } from '../../types/profile';
import { KundliProfile, KundliData } from '../../types/kundli';

export interface IWalletRepository {
  getWalletState(): WalletState;
  getBalance(): number;
  getTransactions(): WalletTransaction[];
  recharge(amount: number, title: string, referenceId?: string): WalletState;
  debit(amount: number, title: string, referenceId?: string): WalletState;
  refund(amount: number, title: string, referenceId?: string): WalletState;
  subscribe(callback: (state: WalletState) => void): () => void;
}

export interface IConsultationRepository {
  getActiveRequest(): ConsultationSession | null;
  setActiveRequest(session: ConsultationSession): void;
  removeActiveRequest(): void;
  getActiveRequestTime(): number | null;
  setActiveRequestTime(time: number): void;
  removeActiveRequestTime(): void;
  getSessionHistory(): ConsultationSession[];
  saveSessionSession(session: ConsultationSession): void;
  saveSessionHistory(history: ConsultationSession[]): void;
  isSessionSeeded(): boolean;
  setSessionSeeded(status: boolean): void;
  subscribe(callback: (session: ConsultationSession | null) => void): () => void;
}

export interface IChatRepository {
  getMessages(sessionId: string): Message[];
  saveMessages(sessionId: string, messages: Message[]): void;
  getChatState(sessionId: string): ChatState | null;
  saveChatState(sessionId: string, state: ChatState): void;
  getAiHistory(): AiChatThread[];
  saveAiHistory(history: AiChatThread[]): void;
}

export interface IProfileRepository {
  getProfile(): BirthDetails | null;
  saveProfile(profile: BirthDetails): void;
  removeProfile(): void;
}

export interface IKundliProfileRepository {
  getAllProfiles(): KundliProfile[];
  getProfileById(profileId: string): KundliProfile | null;
  createProfile(profile: KundliProfile): KundliProfile;
  updateProfile(profileId: string, updates: Partial<KundliProfile>): KundliProfile;
  deleteProfile(profileId: string): void;
  getDefaultProfile(): KundliProfile | null;
  setDefaultProfile(profileId: string): void;
  subscribe(callback: (profiles: KundliProfile[]) => void): () => void;
  getSavedKundli(profileName: string): KundliData | null;
  saveSavedKundli(profileName: string, data: KundliData): void;
  getUserKundli(userId: string): any | null;
  saveUserKundli(userId: string, data: any): void;
}

export { walletStorage } from './walletStorage';
export { consultationStorage } from './consultationStorage';
export { chatStorage } from './chatStorage';
export { profileStorage } from './profileStorage';
export { kundliProfileStorage } from './kundliProfileStorage';
export { runMigrations } from './migrations';
