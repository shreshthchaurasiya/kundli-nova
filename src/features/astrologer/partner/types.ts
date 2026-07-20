import { Astrologer } from '../../../types';

export type AstrologerApplicationStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'suspended';

export interface AstrologerApplication {
  id: string;
  userId: string;
  status: AstrologerApplicationStatus;
  legalName: string;
  displayName: string;
  email: string;
  phone: string;
  panNumber: string;
  experienceYears: number | null;
  languages: string[];
  skills: string[];
  qualification: string;
  consultationModes: string[];
  about: string;
  requestedPricePerMinute: number | null;
  profilePhotoUrl: string;
  panDocumentPath: string;
  certificatePaths: string[];
  rejectionReason: string;
  submittedAt?: string;
  reviewedAt?: string;
}

export interface AstrologerApplicationDraft {
  legalName: string;
  displayName: string;
  email: string;
  phone: string;
  panNumber: string;
  experienceYears: number | null;
  languages: string[];
  skills: string[];
  qualification: string;
  consultationModes: string[];
  about: string;
  requestedPricePerMinute: number | null;
  profilePhotoUrl: string;
  panDocumentPath: string;
  certificatePaths: string[];
}

export interface AstrologerPublicProfileDraft {
  name: string;
  image: string;
  experience: string;
  languages: string[];
  skills: string[];
  about: string;
}

export interface AstrologerPartnerState {
  application: AstrologerApplication | null;
  publicProfile: Astrologer | null;
  isLoading: boolean;
  error: string | null;
}
