import { ConsultationSession } from '../../types/consultation';

export interface IConsultationRepository {
  getActiveRequest(): Promise<ConsultationSession | null>;
  createSession(astrologerId: string): Promise<ConsultationSession>;
  getSession(id: string): Promise<ConsultationSession>;
  heartbeat(id: string): Promise<{ status: string; balance?: number }>;
  endSession(id: string): Promise<void>;
  
  // Expose subscriptions if realtime is supported, else polling handled higher up
  subscribe(callback: (session: ConsultationSession | null) => void): () => void;
}
