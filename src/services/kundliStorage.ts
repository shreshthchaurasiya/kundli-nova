import { profileStorage } from './storage/profileStorage';
import { kundliProfileStorage } from './storage/kundliProfileStorage';
import { BirthDetails } from '../types/profile';

export type { PlanetaryPosition, KundliData } from '../types/kundli';
export type { BirthDetails };

export const getSavedProfile = (): any | null => {
  return profileStorage.getProfile();
};

export const getSavedKundli = (profileName: string): any | null => {
  return kundliProfileStorage.getSavedKundli(profileName);
};

export const saveKundliData = (data: any): void => {
  if (data && data.birthDetails && data.birthDetails.name) {
    kundliProfileStorage.saveSavedKundli(data.birthDetails.name, data);
  }
};
