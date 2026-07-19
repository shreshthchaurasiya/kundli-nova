import { IConsultationRepository } from '../interfaces/consultation';
import { ConsultationSession } from '../../types/consultation';
import { ApiClient } from '../../services/api/apiClient';
import { ENDPOINTS } from '../../services/api/endpoints';

export class ApiConsultationRepository implements IConsultationRepository {
  private activeSubscriptions = new Set<(session: ConsultationSession | null) => void>();

  async getActiveRequest(): Promise<ConsultationSession | null> {
    try {
      return await ApiClient.get<ConsultationSession>(ENDPOINTS.CONSULTATION.GET_ACTIVE);
    } catch (error: any) {
      if (error.statusCode === 404) return null;
      throw error;
    }
  }

  async createSession(astrologerId: string): Promise<ConsultationSession> {
    return await ApiClient.post<ConsultationSession>(ENDPOINTS.CONSULTATION.CREATE, {
      body: { astrologer_id: astrologerId },
    });
  }

  async getSession(id: string): Promise<ConsultationSession> {
    return await ApiClient.get<ConsultationSession>(ENDPOINTS.CONSULTATION.GET_BY_ID(id));
  }

  async heartbeat(id: string): Promise<{ status: string; balance?: number }> {
    return await ApiClient.post<{ status: string; balance?: number }>(ENDPOINTS.CONSULTATION.HEARTBEAT(id));
  }

  async endSession(id: string): Promise<void> {
    await ApiClient.post(ENDPOINTS.CONSULTATION.END(id));
  }

  subscribe(callback: (session: ConsultationSession | null) => void): () => void {
    // In a full realtime system, this would subscribe to Supabase Postgres changes for the session.
    // For now, it's a stub or local observer list if we poll manually.
    this.activeSubscriptions.add(callback);
    return () => this.activeSubscriptions.delete(callback);
  }

  // Helper method for polling updates to notify subscribers
  notifySubscribers(session: ConsultationSession | null) {
    this.activeSubscriptions.forEach(cb => cb(session));
  }
}
