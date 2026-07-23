import {
  KundliNovaNatalChart,
  KundliNovaVimshottariDasha,
  KundliNovaDoshaAnalysis,
  KundliNovaYogaAnalysis,
  KundliNovaDetailedReport
} from './astrologyProvider';

import { NormalizedCompatibilityContext } from '../../types/matchingAiContext';

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
  matching?: {
    partnerProfile: {
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
    normalizedContext?: NormalizedCompatibilityContext;
  };
  memory: NovaAIConversationMemory;
}
