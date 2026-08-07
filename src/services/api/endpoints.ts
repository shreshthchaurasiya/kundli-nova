// Use a relative URL by default. This works when the Express server serves the
// app itself and, during standalone Vite development, is forwarded by the
// development proxy configured in vite.config.ts.
const configuredApiBase = (import.meta as any).env.VITE_API_BASE_URL as string | undefined;
const API_BASE = (configuredApiBase || '/api/v1').replace(/\/$/, '');

export const ENDPOINTS = {
  WALLET: {
    GET: `${API_BASE}/wallet`,
    TRANSACTIONS: `${API_BASE}/wallet/transactions`,
  },
  CONSULTATION: {
    CREATE: `${API_BASE}/consultations`,
    GET_ACTIVE: `${API_BASE}/consultations/active`,
    GET_BY_ID: (id: string) => `${API_BASE}/consultations/${id}`,
    HEARTBEAT: (id: string) => `${API_BASE}/consultations/${id}/heartbeat`,
    END: (id: string) => `${API_BASE}/consultations/${id}/end`,
    EXPIRE: (id: string) => `${API_BASE}/consultations/${id}/expire`,
    DEV_TRANSITION: (id: string) => `${API_BASE}/consultations/${id}/dev-transition`,
  },
  PROFILE: {
    GET: `${API_BASE}/profile`,
    UPDATE: `${API_BASE}/profile`,
  },
  KUNDLI: {
    LIST: `${API_BASE}/kundli-profiles`,
    CREATE: `${API_BASE}/kundli-profiles`,
    GET_BY_ID: (id: string) => `${API_BASE}/kundli-profiles/${id}`,
    UPDATE: (id: string) => `${API_BASE}/kundli-profiles/${id}`,
    DELETE: (id: string) => `${API_BASE}/kundli-profiles/${id}`,
  },
  CHAT: {
    GET_MESSAGES: (id: string) => `${API_BASE}/consultations/${id}/messages`,
    SEND_MESSAGE: (id: string) => `${API_BASE}/consultations/${id}/messages`,
  }
};
