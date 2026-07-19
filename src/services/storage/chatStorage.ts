import { KEYS } from './storageKeys';
import { storageAdapter } from './storageAdapter';
import { Message, ChatState, AiChatThread } from '../../types/chat';
import { IChatRepository } from './index';

export const chatStorage: IChatRepository = {
  getMessages(sessionId: string): Message[] {
    const key = `${KEYS.CHAT_MESSAGES_PREFIX}${sessionId}`;
    return storageAdapter.getItem<Message[]>(key, []);
  },

  saveMessages(sessionId: string, messages: Message[]): void {
    const key = `${KEYS.CHAT_MESSAGES_PREFIX}${sessionId}`;
    storageAdapter.setItem(key, messages);
  },

  getChatState(sessionId: string): ChatState | null {
    const key = `${KEYS.CHAT_STATE_PREFIX}${sessionId}`;
    return storageAdapter.getItem<ChatState | null>(key, null);
  },

  saveChatState(sessionId: string, state: ChatState): void {
    const key = `${KEYS.CHAT_STATE_PREFIX}${sessionId}`;
    storageAdapter.setItem(key, state);
  },

  getAiHistory(): AiChatThread[] {
    return storageAdapter.getItem<AiChatThread[]>(KEYS.AI_HISTORY, []);
  },

  saveAiHistory(history: AiChatThread[]): void {
    storageAdapter.setItem(KEYS.AI_HISTORY, history);
  }
};
