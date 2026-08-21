import React from 'react';

interface ZodiacIconProps {
  size?: number;
  isSelected?: boolean;
  className?: string;
}

export const AriesIcon = ({ size = 44, isSelected, className }: ZodiacIconProps) => (
  <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="22" cy="22" r="22" fill={isSelected ? '#FF8A00' : '#FFF3E0'} />
    <circle cx="22" cy="22" r="18" fill="none" stroke={isSelected ? 'rgba(255,255,255,0.2)' : '#FFE0B2'} strokeWidth="0.5" strokeDasharray="2 3" />
    <path d="M13 17 C11 14, 10 10, 14 9 C17 8, 18 11, 18 14" stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="2.2" strokeLinecap="round" fill="none"/>
    <path d="M31 17 C33 14, 34 10, 30 9 C27 8, 26 11, 26 14" stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="2.2" strokeLinecap="round" fill="none"/>
    <ellipse cx="22" cy="22" rx="6" ry="7" fill={isSelected ? 'rgba(255,255,255,0.2)' : '#FFB74D'} />
    <circle cx="19" cy="21" r="1.5" fill={isSelected ? '#fff' : '#BF360C'} />
    <circle cx="25" cy="21" r="1.5" fill={isSelected ? '#fff' : '#BF360C'} />
    <path d="M20 25 Q22 27 24 25" stroke={isSelected ? '#fff' : '#BF360C'} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <path d="M16 19 L18 18 M28 19 L26 18" stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="22" cy="17" r="1.5" fill={isSelected ? 'rgba(255,255,255,0.6)' : '#FF8A00'} />
  </svg>
);

export const TaurusIcon = ({ size = 44, isSelected, className }: ZodiacIconProps) => (
  <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="22" cy="22" r="22" fill={isSelected ? '#FF8A00' : '#FFF3E0'} />
    <circle cx="22" cy="22" r="18" fill="none" stroke={isSelected ? 'rgba(255,255,255,0.2)' : '#FFE0B2'} strokeWidth="0.5" strokeDasharray="2 3" />
    <path d="M14 16 C11 11, 13 8, 17 9" stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="2.2" strokeLinecap="round" fill="none"/>
    <path d="M30 16 C33 11, 31 8, 27 9" stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="2.2" strokeLinecap="round" fill="none"/>
    <ellipse cx="22" cy="22" rx="8" ry="7" fill={isSelected ? 'rgba(255,255,255,0.2)' : '#FFB74D'} />
    <ellipse cx="22" cy="25" rx="5" ry="3.5" fill={isSelected ? 'rgba(255,255,255,0.15)' : '#FFA726'} />
    <circle cx="20" cy="25" r="1" fill={isSelected ? '#fff' : '#BF360C'} />
    <circle cx="24" cy="25" r="1" fill={isSelected ? '#fff' : '#BF360C'} />
    <circle cx="19" cy="19" r="1.5" fill={isSelected ? '#fff' : '#BF360C'} />
    <circle cx="25" cy="19" r="1.5" fill={isSelected ? '#fff' : '#BF360C'} />
    <circle cx="13" cy="20" r="2" fill="none" stroke={isSelected ? '#fff' : '#FF8A00'} strokeWidth="1.5"/>
    <circle cx="31" cy="20" r="2" fill="none" stroke={isSelected ? '#fff' : '#FF8A00'} strokeWidth="1.5"/>
  </svg>
);

export const GeminiIcon = ({ size = 44, isSelected, className }: ZodiacIconProps) => (
  <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="22" cy="22" r="22" fill={isSelected ? '#FF8A00' : '#FFF3E0'} />
    <circle cx="22" cy="22" r="18" fill="none" stroke={isSelected ? 'rgba(255,255,255,0.2)' : '#FFE0B2'} strokeWidth="0.5" strokeDasharray="2 3" />
    <ellipse cx="17" cy="15" rx="3.5" ry="4" fill={isSelected ? 'rgba(255,255,255,0.25)' : '#FFB74D'} />
    <ellipse cx="27" cy="15" rx="3.5" ry="4" fill={isSelected ? 'rgba(255,255,255,0.25)' : '#FFB74D'} />
    <path d="M14 19 C14 19, 13 32, 17 32 C21 32, 20 19, 17 19" fill={isSelected ? 'rgba(255,255,255,0.2)' : '#FFCC80'} />
    <path d="M30 19 C30 19, 31 32, 27 32 C23 32, 24 19, 27 19" fill={isSelected ? 'rgba(255,255,255,0.2)' : '#FFCC80'} />
    <line x1="17" y1="22" x2="27" y2="22" stroke={isSelected ? '#fff' : '#FF8A00'} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="17" y1="26" x2="27" y2="26" stroke={isSelected ? '#fff' : '#FF8A00'} strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="22" cy="11" r="1.5" fill={isSelected ? '#fff' : '#FF8A00'} />
    <circle cx="22" cy="35" r="1.5" fill={isSelected ? '#fff' : '#FF8A00'} />
  </svg>
);

export const CancerIcon = ({ size = 44, isSelected, className }: ZodiacIconProps) => (
  <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="22" cy="22" r="22" fill={isSelected ? '#FF8A00' : '#FFF3E0'} />
    <circle cx="22" cy="22" r="18" fill="none" stroke={isSelected ? 'rgba(255,255,255,0.2)' : '#FFE0B2'} strokeWidth="0.5" strokeDasharray="2 3" />
    <ellipse cx="22" cy="23" rx="8" ry="6" fill={isSelected ? 'rgba(255,255,255,0.2)' : '#FFB74D'} />
    <path d="M14 20 C10 17, 9 14, 12 13 C14 12, 15 15, 14 18" stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="2" strokeLinecap="round" fill="none"/>
    <path d="M14 20 C10 23, 9 26, 12 27 C14 28, 15 25, 14 21" stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="2" strokeLinecap="round" fill="none"/>
    <path d="M30 20 C34 17, 35 14, 32 13 C30 12, 29 15, 30 18" stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="2" strokeLinecap="round" fill="none"/>
    <path d="M30 20 C34 23, 35 26, 32 27 C30 28, 29 25, 30 21" stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="2" strokeLinecap="round" fill="none"/>
    <circle cx="19" cy="21" r="1.5" fill={isSelected ? '#fff' : '#BF360C'} />
    <circle cx="25" cy="21" r="1.5" fill={isSelected ? '#fff' : '#BF360C'} />
    <path d="M16 26 L13 31 M19 27 L18 32 M25 27 L26 32 M28 26 L31 31" stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M19 13 C19 11, 21 10, 22 12 C23 14, 25 13, 25 11" stroke={isSelected ? '#fff' : '#FF8A00'} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <circle cx="19.5" cy="13.5" r="1" fill={isSelected ? '#fff' : '#FF8A00'}/>
    <circle cx="24.5" cy="10.5" r="1" fill={isSelected ? '#fff' : '#FF8A00'}/>
  </svg>
);

export const LeoIcon = ({ size = 44, isSelected, className }: ZodiacIconProps) => (
  <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="22" cy="22" r="22" fill={isSelected ? '#FF8A00' : '#FFF3E0'} />
    <circle cx="22" cy="22" r="18" fill="none" stroke={isSelected ? 'rgba(255,255,255,0.2)' : '#FFE0B2'} strokeWidth="0.5" strokeDasharray="2 3" />
    <circle cx="22" cy="21" r="10" fill={isSelected ? 'rgba(255,255,255,0.15)' : '#FFA726'} />
    <circle cx="22" cy="21" r="7" fill={isSelected ? 'rgba(255,255,255,0.25)' : '#FFB74D'} />
    <ellipse cx="19" cy="19" rx="1.5" ry="2" fill={isSelected ? '#fff' : '#BF360C'} />
    <ellipse cx="25" cy="19" rx="1.5" ry="2" fill={isSelected ? '#fff' : '#BF360C'} />
    <ellipse cx="22" cy="22" rx="2" ry="1.5" fill={isSelected ? 'rgba(255,255,255,0.4)' : '#E65100'} />
    <path d="M19 24 Q22 27 25 24" stroke={isSelected ? '#fff' : '#BF360C'} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <path d="M12 21 L18 22 M12 24 L18 23" stroke={isSelected ? 'rgba(255,255,255,0.6)' : '#FF8A00'} strokeWidth="1" strokeLinecap="round"/>
    <path d="M32 21 L26 22 M32 24 L26 23" stroke={isSelected ? 'rgba(255,255,255,0.6)' : '#FF8A00'} strokeWidth="1" strokeLinecap="round"/>
    <path d="M15 13 L18 10 L22 13 L26 10 L29 13" stroke={isSelected ? '#fff' : '#FF8A00'} strokeWidth="2" strokeLinejoin="round" fill="none"/>
    <circle cx="22" cy="13" r="1.5" fill={isSelected ? '#fff' : '#FF8A00'} />
  </svg>
);

export const VirgoIcon = ({ size = 44, isSelected, className }: ZodiacIconProps) => (
  <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="22" cy="22" r="22" fill={isSelected ? '#FF8A00' : '#FFF3E0'} />
    <circle cx="22" cy="22" r="18" fill="none" stroke={isSelected ? 'rgba(255,255,255,0.2)' : '#FFE0B2'} strokeWidth="0.5" strokeDasharray="2 3" />
    <circle cx="22" cy="14" r="5" fill={isSelected ? 'rgba(255,255,255,0.25)' : '#FFB74D'} />
    <path d="M17 13 C16 10, 18 8, 22 8 C26 8, 28 10, 27 13" stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="2" strokeLinecap="round" fill={isSelected ? 'rgba(255,255,255,0.1)' : '#FFA726'} />
    <path d="M17 13 C15 18, 14 24, 15 30" stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <path d="M17 19 L15 34 M27 19 L29 34 M17 19 L27 19" stroke={isSelected ? 'rgba(255,255,255,0.6)' : '#FFB74D'} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M15 27 L29 27" stroke={isSelected ? 'rgba(255,255,255,0.4)' : '#FFA726'} strokeWidth="1" strokeLinecap="round"/>
    <path d="M22 24 Q20 21, 22 20 Q24 21, 22 24" fill={isSelected ? '#fff' : '#FF8A00'} />
    <path d="M22 24 Q19 22, 18 23 Q19 25, 22 24" fill={isSelected ? 'rgba(255,255,255,0.7)' : '#FFB74D'} />
    <path d="M22 24 Q25 22, 26 23 Q25 25, 22 24" fill={isSelected ? 'rgba(255,255,255,0.7)' : '#FFB74D'} />
    <circle cx="20" cy="14" r="1" fill={isSelected ? '#FF8A00' : '#BF360C'} />
    <circle cx="24" cy="14" r="1" fill={isSelected ? '#FF8A00' : '#BF360C'} />
  </svg>
);

export const LibraIcon = ({ size = 44, isSelected, className }: ZodiacIconProps) => (
  <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="22" cy="22" r="22" fill={isSelected ? '#FF8A00' : '#FFF3E0'} />
    <circle cx="22" cy="22" r="18" fill="none" stroke={isSelected ? 'rgba(255,255,255,0.2)' : '#FFE0B2'} strokeWidth="0.5" strokeDasharray="2 3" />
    <line x1="22" y1="13" x2="22" y2="32" stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="12" y1="20" x2="32" y2="20" stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M12 20 C10 22, 10 26, 12 27 C14 28, 18 28, 20 27 C22 26, 22 22, 20 20" fill={isSelected ? 'rgba(255,255,255,0.2)' : '#FFB74D'} stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="1.5"/>
    <path d="M24 20 C22 22, 22 26, 24 27 C26 28, 30 28, 32 27 C34 26, 34 22, 32 20" fill={isSelected ? 'rgba(255,255,255,0.2)' : '#FFB74D'} stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="1.5"/>
    <path d="M18 32 L26 32" stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="22" cy="12" r="2.5" fill={isSelected ? '#fff' : '#FF8A00'} />
    <circle cx="22" cy="12" r="1.5" fill={isSelected ? '#FF8A00' : '#FFF3E0'} />
  </svg>
);

export const ScorpioIcon = ({ size = 44, isSelected, className }: ZodiacIconProps) => (
  <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="22" cy="22" r="22" fill={isSelected ? '#FF8A00' : '#FFF3E0'} />
    <circle cx="22" cy="22" r="18" fill="none" stroke={isSelected ? 'rgba(255,255,255,0.2)' : '#FFE0B2'} strokeWidth="0.5" strokeDasharray="2 3" />
    <ellipse cx="20" cy="22" rx="7" ry="5" fill={isSelected ? 'rgba(255,255,255,0.2)' : '#FFB74D'} />
    <path d="M26 22 C30 22, 33 20, 33 17 C33 13, 30 11, 28 13" stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    <path d="M28 13 L26 10" stroke={isSelected ? '#fff' : '#BF360C'} strokeWidth="2" strokeLinecap="round"/>
    <polygon points="26,10 25,8 29,9" fill={isSelected ? '#fff' : '#BF360C'}/>
    <path d="M13 18 C9 16, 8 12, 11 11" stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="2" strokeLinecap="round" fill="none"/>
    <path d="M13 18 C9 20, 8 24, 11 25" stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="2" strokeLinecap="round" fill="none"/>
    <path d="M15 24 L12 28 M18 25 L16 30 M22 25 L22 30 M25 24 L27 29" stroke={isSelected ? '#fff' : '#FF8A00'} strokeWidth="1.2" strokeLinecap="round"/>
    <circle cx="18" cy="21" r="1.5" fill={isSelected ? '#fff' : '#BF360C'} />
    <circle cx="22" cy="21" r="1.5" fill={isSelected ? '#fff' : '#BF360C'} />
  </svg>
);

export const SagittariusIcon = ({ size = 44, isSelected, className }: ZodiacIconProps) => (
  <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="22" cy="22" r="22" fill={isSelected ? '#FF8A00' : '#FFF3E0'} />
    <circle cx="22" cy="22" r="18" fill="none" stroke={isSelected ? 'rgba(255,255,255,0.2)' : '#FFE0B2'} strokeWidth="0.5" strokeDasharray="2 3" />
    <path d="M11 31 C9 22, 11 14, 18 10" stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    <line x1="11" y1="31" x2="18" y2="10" stroke={isSelected ? 'rgba(255,255,255,0.5)' : '#FFB74D'} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2"/>
    <line x1="14" y1="28" x2="33" y2="11" stroke={isSelected ? '#fff' : '#BF360C'} strokeWidth="2.5" strokeLinecap="round"/>
    <polygon points="33,11 28,12 32,16" fill={isSelected ? '#fff' : '#BF360C'}/>
    <path d="M14 28 L11 30 M14 28 L12 31" stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="28" cy="16" r="1.5" fill={isSelected ? 'rgba(255,255,255,0.7)' : '#FF8A00'} />
    <circle cx="32" cy="20" r="1" fill={isSelected ? 'rgba(255,255,255,0.5)' : '#FFA726'} />
    <circle cx="24" cy="28" r="1" fill={isSelected ? 'rgba(255,255,255,0.5)' : '#FFA726'} />
  </svg>
);

export const CapricornIcon = ({ size = 44, isSelected, className }: ZodiacIconProps) => (
  <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="22" cy="22" r="22" fill={isSelected ? '#FF8A00' : '#FFF3E0'} />
    <circle cx="22" cy="22" r="18" fill="none" stroke={isSelected ? 'rgba(255,255,255,0.2)' : '#FFE0B2'} strokeWidth="0.5" strokeDasharray="2 3" />
    <ellipse cx="18" cy="15" rx="6" ry="5" fill={isSelected ? 'rgba(255,255,255,0.2)' : '#FFB74D'} />
    <path d="M14 12 C12 8, 14 6, 17 8" stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="2" strokeLinecap="round" fill="none"/>
    <path d="M20 11 C22 7, 25 7, 24 11" stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="2" strokeLinecap="round" fill="none"/>
    <path d="M15 18 C14 21, 15 24, 17 22" stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <path d="M18 19 C17 22, 18 25, 20 23" stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <circle cx="18" cy="14" r="1.5" fill={isSelected ? '#fff' : '#BF360C'} />
    <path d="M24 18 C28 18, 32 16, 34 20 C36 24, 32 30, 26 30 C22 30, 20 26, 22 22 C23 19, 24 18, 24 18" fill={isSelected ? 'rgba(255,255,255,0.15)' : '#FFCC80'} stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="1.5"/>
    <path d="M26 30 C24 33, 28 36, 30 33 C32 36, 36 33, 34 30" fill={isSelected ? 'rgba(255,255,255,0.2)' : '#FFB74D'} stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="1.5"/>
    <path d="M25 20 Q27 19, 29 20 M25 23 Q28 22, 30 23 M25 26 Q27 25, 29 26" stroke={isSelected ? 'rgba(255,255,255,0.4)' : '#FFA726'} strokeWidth="1" strokeLinecap="round"/>
  </svg>
);

export const AquariusIcon = ({ size = 44, isSelected, className }: ZodiacIconProps) => (
  <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="22" cy="22" r="22" fill={isSelected ? '#FF8A00' : '#FFF3E0'} />
    <circle cx="22" cy="22" r="18" fill="none" stroke={isSelected ? 'rgba(255,255,255,0.2)' : '#FFE0B2'} strokeWidth="0.5" strokeDasharray="2 3" />
    <path d="M10 18 C12 15, 15 21, 18 18 C21 15, 24 21, 27 18 C30 15, 33 21, 35 18" stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    <path d="M10 24 C12 21, 15 27, 18 24 C21 21, 24 27, 27 24 C30 21, 33 27, 35 24" stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    <path d="M10 30 C12 27, 15 33, 18 30 C21 27, 24 33, 27 30 C30 27, 33 33, 35 30" stroke={isSelected ? 'rgba(255,255,255,0.6)' : '#FFB74D'} strokeWidth="2" strokeLinecap="round" fill="none"/>
    <path d="M14 10 L12 18 M30 10 L32 18" stroke={isSelected ? '#fff' : '#FFA726'} strokeWidth="2" strokeLinecap="round"/>
    <ellipse cx="22" cy="10" rx="8" ry="3" fill={isSelected ? 'rgba(255,255,255,0.2)' : '#FFB74D'} stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="1.5"/>
    <circle cx="18" cy="9" r="1" fill={isSelected ? '#fff' : '#FF8A00'} />
    <circle cx="26" cy="9" r="1" fill={isSelected ? '#fff' : '#FF8A00'} />
  </svg>
);

export const PiscesIcon = ({ size = 44, isSelected, className }: ZodiacIconProps) => (
  <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="22" cy="22" r="22" fill={isSelected ? '#FF8A00' : '#FFF3E0'} />
    <circle cx="22" cy="22" r="18" fill="none" stroke={isSelected ? 'rgba(255,255,255,0.2)' : '#FFE0B2'} strokeWidth="0.5" strokeDasharray="2 3" />
    <path d="M14 16 C18 12, 26 13, 28 16 C26 19, 18 20, 14 16" fill={isSelected ? 'rgba(255,255,255,0.2)' : '#FFB74D'} stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="1.5"/>
    <path d="M14 16 L10 13 L11 16 L10 19 Z" fill={isSelected ? '#fff' : '#FFA726'} />
    <circle cx="26" cy="16" r="1.5" fill={isSelected ? '#FF8A00' : '#BF360C'} />
    <path d="M30 28 C26 24, 18 25, 16 28 C18 31, 26 32, 30 28" fill={isSelected ? 'rgba(255,255,255,0.2)' : '#FFB74D'} stroke={isSelected ? '#fff' : '#E65100'} strokeWidth="1.5"/>
    <path d="M30 28 L34 25 L33 28 L34 31 Z" fill={isSelected ? '#fff' : '#FFA726'} />
    <circle cx="18" cy="28" r="1.5" fill={isSelected ? '#FF8A00' : '#BF360C'} />
    <path d="M22 20 C20 22, 24 24, 22 26" stroke={isSelected ? '#fff' : '#FF8A00'} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <circle cx="22" cy="22" r="2" fill={isSelected ? '#fff' : '#FF8A00'} />
    <circle cx="22" cy="22" r="1" fill={isSelected ? '#FF8A00' : '#FFF3E0'} />
  </svg>
);

export const ZODIAC_ICON_MAP: Record<string, React.FC<ZodiacIconProps>> = {
  aries: AriesIcon,
  taurus: TaurusIcon,
  gemini: GeminiIcon,
  cancer: CancerIcon,
  leo: LeoIcon,
  virgo: VirgoIcon,
  libra: LibraIcon,
  scorpio: ScorpioIcon,
  sagittarius: SagittariusIcon,
  capricorn: CapricornIcon,
  aquarius: AquariusIcon,
  pisces: PiscesIcon,
};

export default ZODIAC_ICON_MAP;
