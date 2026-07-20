import { IConsultationRepository } from '../interfaces/consultation';
import { ConsultationHeartbeatResult, ConsultationRequestResult, ConsultationSession } from '../../types/consultation';
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

  async createSession(astrologerId: string): Promise<ConsultationRequestResult> {
    return await ApiClient.post<ConsultationRequestResult>(ENDPOINTS.CONSULTATION.CREATE, {
      body: { astrologerId },
    });
  }

  async getSession(id: string): Promise<ConsultationSession> {
    return await ApiClient.get<ConsultationSession>(ENDPOINTS.CONSULTATION.GET_BY_ID(id));
  }

  async heartbeat(id: string): Promise<ConsultationHeartbeatResult> {
    return await ApiClient.post<ConsultationHeartbeatResult>(ENDPOINTS.CONSULTATION.HEARTBEAT(id));
  }

  async endSession(id: string): Promise<ConsultationHeartbeatResult> {
    return await ApiClient.post<ConsultationHeartbeatResult>(ENDPOINTS.CONSULTATION.END(id));
  }

  async expireSession(id: string): Promise<ConsultationHeartbeatResult> {
    return await ApiClient.post<ConsultationHeartbeatResult>(ENDPOINTS.CONSULTATION.EXPIRE(id));
  }

  async transitionForDevelopment(id: string, targetStatus: 'ACTIVE' | 'REJECTED' | 'EXPIRED'): Promise<ConsultationHeartbeatResult> {
    return await ApiClient.post<ConsultationHeartbeatResult>(ENDPOINTS.CONSULTATION.DEV_TRANSITION(id), {
      body: { targetStatus },
    });
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
