const API_BASE = (import.meta as any).env.VITE_API_BASE_URL;

if (!API_BASE) {
  throw new Error('VITE_API_BASE_URL environment variable is missing.');
}

export const ENDPOINTS = {
  WALLET: {
    GET: `${API_BASE}/wallet`,
    TRANSACTIONS: `${API_BASE}/wallet/transactions`,
    RECHARGE: `${API_BASE}/wallet/recharge`,
  },
  CONSULTATION: {
    CREATE: `${API_BASE}/consultations`,
    GET_ACTIVE: `${API_BASE}/consultations/active`,
    GET_BY_ID: (id: string) => `${API_BASE}/consultations/${id}`,
    HEARTBEAT: (id: string) => `${API_BASE}/consultations/${id}/heartbeat`,
    END: (id: string) => `${API_BASE}/consultations/${id}/end`,
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
