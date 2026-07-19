import { KEYS } from './storageKeys';
import { storageAdapter } from './storageAdapter';
import { ConsultationSession } from '../../types/consultation';
import { IConsultationRepository } from './interfaces';

type ConsultationListener = (session: ConsultationSession | null) => void;
const listeners = new Set<ConsultationListener>();

function notifyConsultationListeners(session: ConsultationSession | null): void {
  listeners.forEach(cb => {
    try {
      cb(session);
    } catch (err) {
      console.error('[ConsultationStorage] Subscriber callback error', err);
    }
  });
}

export const consultationStorage: IConsultationRepository = {
  getActiveRequest(): ConsultationSession | null {
    return storageAdapter.getItem<ConsultationSession | null>(KEYS.ACTIVE_REQUEST, null);
  },

  setActiveRequest(session: ConsultationSession): void {
    storageAdapter.setItem(KEYS.ACTIVE_REQUEST, session);
    notifyConsultationListeners(session);
  },

  removeActiveRequest(): void {
    storageAdapter.removeItem(KEYS.ACTIVE_REQUEST);
    notifyConsultationListeners(null);
  },

  getActiveRequestTime(): number | null {
    const timeStr = storageAdapter.getRaw(KEYS.ACTIVE_REQUEST_TIME);
    return timeStr ? parseInt(timeStr, 10) : null;
  },

  setActiveRequestTime(time: number): void {
    storageAdapter.setRaw(KEYS.ACTIVE_REQUEST_TIME, time.toString());
  },

  removeActiveRequestTime(): void {
    storageAdapter.removeItem(KEYS.ACTIVE_REQUEST_TIME);
  },

  getSessionHistory(): ConsultationSession[] {
    return storageAdapter.getItem<ConsultationSession[]>(KEYS.SESSION_HISTORY, []);
  },

  saveSessionSession(session: ConsultationSession): void {
    const history = this.getSessionHistory();
    const filtered = history.filter(item => item.id !== session.id);
    const updated = [session, ...filtered];
    storageAdapter.setItem(KEYS.SESSION_HISTORY, updated);
  },

  saveSessionHistory(history: ConsultationSession[]): void {
    storageAdapter.setItem(KEYS.SESSION_HISTORY, history);
  },

  isSessionSeeded(): boolean {
    return storageAdapter.getRaw(KEYS.SESSION_HISTORY_SEEDED) === 'true';
  },

  setSessionSeeded(status: boolean): void {
    storageAdapter.setRaw(KEYS.SESSION_HISTORY_SEEDED, status ? 'true' : 'false');
  },

  subscribe(callback: ConsultationListener): () => void {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  }
};
