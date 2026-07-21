import { Message } from '../../types/chat';

export interface IChatRepository {
  getMessages(sessionId: string): Promise<Message[]>;
  sendMessage(sessionId: string, text: string, clientMessageId: string, messageType?: 'text' | 'image', attachmentUrl?: string): Promise<Message>;
  getUploadUrl?(sessionId: string, mimeType: string, sizeBytes: number): Promise<{ signedUrl: string; token: string; path: string }>;
}
