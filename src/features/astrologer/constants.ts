export const ASTROLOGER_LANGUAGES = [
  'Hindi',
  'English',
  'Marathi',
  'Bengali',
  'Gujarati',
  'Tamil',
  'Telugu',
  'Kannada',
  'Malayalam',
  'Punjabi',
  'Sanskrit',
] as const;

export const ASTROLOGER_SKILLS = [
  'Vedic',
  'Tarot',
  'Numerology',
  'Vastu',
  'Palmistry',
  'Face Reading',
  'Career',
  'Marriage',
  'Relationship',
  'Finance',
] as const;

export const CONSULTATION_MODES = ['Chat', 'Voice', 'Video'] as const;

export const ASTROLOGER_UPLOAD_LIMITS = {
  profilePhotoBytes: 5 * 1024 * 1024,
  verificationDocumentBytes: 10 * 1024 * 1024,
  imageTypes: ['image/jpeg', 'image/png', 'image/webp'],
  documentTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
} as const;

export const APPLICATION_STATUS_CONTENT = {
  draft: {
    title: 'Complete your application',
    description: 'Your progress is saved. Complete every step when you are ready.',
  },
  pending: {
    title: 'Application under review',
    description: 'Our verification team is reviewing your profile and documents.',
  },
  approved: {
    title: 'Astrologer profile approved',
    description: 'Your verified public profile is now available in Kundli Nova.',
  },
  rejected: {
    title: 'Application needs changes',
    description: 'Review the feedback, update your information and submit again.',
  },
  suspended: {
    title: 'Profile temporarily unavailable',
    description: 'Please contact support for help with your professional account.',
  },
} as const;

