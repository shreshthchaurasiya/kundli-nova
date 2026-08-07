import { ConsultationHeartbeatResult, ConsultationRequestResult, ConsultationSession } from '../../types/consultation';

export interface IConsultationRepository {
  getActiveRequest(): Promise<ConsultationSession | null>;
  createSession(astrologerId: string): Promise<ConsultationRequestResult>;
  getSession(id: string): Promise<ConsultationSession>;
  heartbeat(id: string): Promise<ConsultationHeartbeatResult>;
  endSession(id: string): Promise<ConsultationHeartbeatResult>;
  expireSession(id: string): Promise<ConsultationHeartbeatResult>;
  transitionForDevelopment(id: string, targetStatus: 'ACTIVE' | 'REJECTED' | 'EXPIRED'): Promise<ConsultationHeartbeatResult>;
  
  // Expose subscriptions if realtime is supported, else polling handled higher up
  subscribe(callback: (session: ConsultationSession | null) => void): () => void;
}
