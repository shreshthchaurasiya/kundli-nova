import { ConsultationHeartbeatResult, ConsultationRequestResult, ConsultationSession } from '../../types/consultation';

export interface IConsultationRepository {
  listSessions(): Promise<ConsultationSession[]>;
  getActiveRequest(): Promise<ConsultationSession | null>;
  createSession(astrologerId: string, kundliProfileId?: string): Promise<ConsultationRequestResult>;
  getSession(id: string): Promise<ConsultationSession>;
  heartbeat(id: string): Promise<ConsultationHeartbeatResult>;
  endSession(id: string): Promise<ConsultationHeartbeatResult>;
  endAssignedSession(id: string): Promise<ConsultationHeartbeatResult>;
  expireSession(id: string): Promise<ConsultationHeartbeatResult>;
  acceptSession(id: string): Promise<ConsultationHeartbeatResult>;
  rejectSession(id: string): Promise<ConsultationHeartbeatResult>;
  cancelSession(id: string): Promise<ConsultationHeartbeatResult>;
  updateKundliProfile(id: string, kundliProfileId: string): Promise<ConsultationSession>;
  
  // Expose subscriptions if realtime is supported, else polling handled higher up
  subscribe(callback: (session: ConsultationSession | null) => void): () => void;
}
