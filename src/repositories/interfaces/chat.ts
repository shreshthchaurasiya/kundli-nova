import { Message } from '../../types/chat';

export interface IChatRepository {
  getMessages(sessionId: string): Promise<Message[]>;
  sendMessage(sessionId: string, text: string, clientMessageId: string): Promise<Message>;
}
