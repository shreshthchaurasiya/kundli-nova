import { IChatRepository } from '../interfaces/chat';
import { Message } from '../../types/chat';
import { ApiClient } from '../../services/api/apiClient';
import { ENDPOINTS } from '../../services/api/endpoints';

export class ApiChatRepository implements IChatRepository {
  async getMessages(sessionId: string): Promise<Message[]> {
    return await ApiClient.get<Message[]>(ENDPOINTS.CHAT.GET_MESSAGES(sessionId));
  }

  async sendMessage(sessionId: string, text: string, clientMessageId: string): Promise<Message> {
    return await ApiClient.post<Message>(ENDPOINTS.CHAT.SEND_MESSAGE(sessionId), {
      body: { text, client_message_id: clientMessageId },
    });
  }
}
