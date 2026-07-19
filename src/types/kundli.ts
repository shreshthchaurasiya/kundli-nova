import { BirthDetails } from './profile';

export interface PlanetaryPosition {
  name: string;
  zodiac: string;
  house: number;
  degree: string;
}

export interface KundliData {
  profileId: string;
  kundliId: string;
  birthDetails: BirthDetails;
  chartData: string[];
  planetaryPositions: PlanetaryPosition[];
  astrologySummary: {
    lagna: string;
    sunSign: string;
    moonSign: string;
    nakshatra: string;
    moolank: number;
    bhagyank: number;
  };
  currentDasha: {
    mahadasha: string;
    antardasha: string;
  };
  lifeInsights: {
    career: string;
    marriage: string;
    finance: string;
    health: string;
    family: string;
  };
  generatedAt: string;
}

export interface KundliProfile {
  id: string;
  ownerId: string;
  name: string;
  relation: 'self' | 'partner' | 'family' | 'friend' | 'other';
  birthDetails: BirthDetails;
  kundliData?: KundliData;
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
}
