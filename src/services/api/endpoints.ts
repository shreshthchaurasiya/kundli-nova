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
    LIST: `${API_BASE}/consultations`,
    GET_ACTIVE: `${API_BASE}/consultations/active`,
    GET_BY_ID: (id: string) => `${API_BASE}/consultations/${id}`,
    HEARTBEAT: (id: string) => `${API_BASE}/consultations/${id}/heartbeat`,
    END: (id: string) => `${API_BASE}/consultations/${id}/end`,
    ASTROLOGER_END: (id: string) => `${API_BASE}/consultations/${id}/astrologer-end`,
    EXPIRE: (id: string) => `${API_BASE}/consultations/${id}/expire`,
    ACCEPT: (id: string) => `${API_BASE}/consultations/${id}/accept`,
    REJECT: (id: string) => `${API_BASE}/consultations/${id}/reject`,
    CANCEL: (id: string) => `${API_BASE}/consultations/${id}/cancel`,
    UPDATE_KUNDLI_PROFILE: (id: string) => `${API_BASE}/consultations/${id}/kundli-profile`,
  },
  PROFILE: {
    GET: `${API_BASE}/profile`,
    UPDATE: `${API_BASE}/profile`,
  },
  KUNDLI: {
    LIST: `${API_BASE}/kundli-profiles`,
    CREATE: `${API_BASE}/kundli-profiles`,
    SYNC_SELF: `${API_BASE}/kundli-profiles/sync-self`,
    GET_BY_ID: (id: string) => `${API_BASE}/kundli-profiles/${id}`,
    UPDATE: (id: string) => `${API_BASE}/kundli-profiles/${id}`,
    DELETE: (id: string) => `${API_BASE}/kundli-profiles/${id}`,
  },
  CHAT: {
    GET_MESSAGES: (id: string) => `${API_BASE}/consultations/${id}/messages`,
    SEND_MESSAGE: (id: string) => `${API_BASE}/consultations/${id}/messages`,
    GET_UPLOAD_URL: (id: string) => `${API_BASE}/consultations/${id}/messages/upload-url`,
  },
  ASTROLOGY: {
    DAILY_HOROSCOPE: (zodiac: string) => `${API_BASE}/astrology/horoscope/daily?zodiac=${zodiac}`,
    GET_KUNDLI: (profileId: string) => `${API_BASE}/astrology/kundli/${profileId}`,
    GET_DASHA: (profileId: string) => `${API_BASE}/astrology/dasha/${profileId}`,
    GET_DOSHA: (profileId: string) => `${API_BASE}/astrology/dosha/${profileId}`,
    GET_YOGA: (profileId: string) => `${API_BASE}/astrology/yoga/${profileId}`,
    GET_COMPATIBILITY: (profileAId: string, profileBId: string) => `${API_BASE}/astrology/compatibility?profileAId=${profileAId}&profileBId=${profileBId}`,
  }
};

export const ASTROLOGER_WORKSPACE = {
  GET: (id: string) => `${API_BASE}/astrologer-workspace/${id}`,
  UPDATE_NOTES: (id: string) => `${API_BASE}/astrologer-workspace/${id}/notes`,
};
