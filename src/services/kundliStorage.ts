export interface BirthDetails {
  name: string;
  gender: string;
  dob: string;
  tob: string;
  state: string;
  district: string;
  city: string;
}

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
  chartData: string[]; // North Indian 12 houses
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

export const getSavedProfile = (): BirthDetails | null => {
  const profileStr = localStorage.getItem('kundli_nova_profile');
  if (profileStr) {
    try {
      return JSON.parse(profileStr);
    } catch (e) {
      console.error('Error parsing profile from local storage', e);
    }
  }
  return null;
};

export const getSavedKundli = (profileName: string): KundliData | null => {
  const key = `kundli_nova_saved_kundli_${profileName.toLowerCase().replace(/\s+/g, '_')}`;
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Error parsing saved Kundli', e);
    }
  }
  return null;
};

export const saveKundliData = (data: KundliData): void => {
  const nameKey = data.birthDetails.name.toLowerCase().replace(/\s+/g, '_');
  const key = `kundli_nova_saved_kundli_${nameKey}`;
  localStorage.setItem(key, JSON.stringify(data));
};
