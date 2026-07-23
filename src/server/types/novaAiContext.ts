import {
  KundliNovaNatalChart,
  KundliNovaVimshottariDasha,
  KundliNovaDoshaAnalysis,
  KundliNovaYogaAnalysis,
  KundliNovaDetailedReport
} from './astrologyProvider';

export interface NovaAIMessage {
  sender: 'user' | 'nova';
  text: string;
  time: string;
}

export interface NovaAIConversationMemory {
  sessionId: string;
  topic: string;
  recentMessages: NovaAIMessage[];
}

export interface NovaAIContext {
  user: {
    id: string;
  };
  selectedProfile: {
    id: string;
    name: string;
    gender: string;
    dob: string;
    timeOfBirth: string;
    city: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  astrology: {
    natalChart: KundliNovaNatalChart | null;
    dasha: KundliNovaVimshottariDasha | null;
    dosha: KundliNovaDoshaAnalysis | null;
    yoga: KundliNovaYogaAnalysis | null;
    detailedReport: KundliNovaDetailedReport | null;
  };
  memory: NovaAIConversationMemory;
}
