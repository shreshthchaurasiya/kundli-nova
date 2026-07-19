import { BirthDetails, KundliData, PlanetaryPosition } from './kundliStorage';

// Reusable calculation helpers
export const calculateMoolank = (dobString: string): number => {
  // dob format: YYYY-MM-DD
  if (!dobString) return 6;
  const parts = dobString.split('-');
  if (parts.length < 3) return 6;
  const day = parseInt(parts[2], 10);
  if (isNaN(day)) return 6;
  
  const sumDigits = (num: number): number => {
    let sum = 0;
    let temp = num;
    while (temp > 0) {
      sum += temp % 10;
      temp = Math.floor(temp / 10);
    }
    return sum > 9 ? sumDigits(sum) : sum;
  };
  
  return sumDigits(day);
};

export const calculateBhagyank = (dobString: string): number => {
  if (!dobString) return 4;
  const digitsOnly = dobString.replace(/[^0-9]/g, '');
  
  const sumDigits = (numStr: string): number => {
    let sum = 0;
    for (let i = 0; i < numStr.length; i++) {
      sum += parseInt(numStr[i], 10);
    }
    return sum > 9 ? sumDigits(sum.toString()) : sum;
  };
  
  return sumDigits(digitsOnly);
};

const getDeterministicValue = (seed: string, array: string[]): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % array.length;
  return array[index];
};

export const generateKundli = (profile: BirthDetails): KundliData => {
  const name = profile.name || 'Shreshth';
  const dob = profile.dob || '1995-10-15';
  const tob = profile.tob || '10:30';
  const seed = `${name}_${dob}_${tob}`;

  const lagnas = ['Mesh (Aries)', 'Vrishabha (Taurus)', 'Mithuna (Gemini)', 'Karka (Cancer)', 'Simha (Leo)', 'Kanya (Virgo)', 'Tula (Libra)', 'Vrishchika (Scorpio)', 'Dhanu (Sagittarius)', 'Makara (Capricorn)', 'Kumbha (Aquarius)', 'Meena (Pisces)'];
  const sunSigns = ['Mesh (Aries)', 'Vrishabha (Taurus)', 'Mithuna (Gemini)', 'Karka (Cancer)', 'Simha (Leo)', 'Kanya (Virgo)', 'Tula (Libra)', 'Vrishchika (Scorpio)', 'Dhanu (Sagittarius)', 'Makara (Capricorn)', 'Kumbha (Aquarius)', 'Meena (Pisces)'];
  const moonSigns = ['Mesh (Aries)', 'Vrishabha (Taurus)', 'Mithuna (Gemini)', 'Karka (Cancer)', 'Simha (Leo)', 'Kanya (Virgo)', 'Tula (Libra)', 'Vrishchika (Scorpio)', 'Dhanu (Sagittarius)', 'Makara (Capricorn)', 'Kumbha (Aquarius)', 'Meena (Pisces)'];
  const nakshatras = ['Hasta', 'Rohini', 'Ashwini', 'Krittika', 'Chitra', 'Swati', 'Anuradha', 'Pushya', 'Purva Phalguni', 'Uttara Phalguni', 'Sravana', 'Bharani'];

  const selectedLagna = getDeterministicValue(seed + 'lagna', lagnas);
  const selectedSun = getDeterministicValue(seed + 'sun', sunSigns);
  const selectedMoon = getDeterministicValue(seed + 'moon', moonSigns);
  const selectedNakshatra = getDeterministicValue(seed + 'nakshatra', nakshatras);

  const moolank = calculateMoolank(dob);
  const bhagyank = calculateBhagyank(dob);

  // Generate dynamic-looking 12 houses diagram configuration
  // For North Indian Kundli chart (we put planetary abbreviations inside each house)
  const chartData = [
    'Sy, Bu',   // House 1 (Lagna House - Top Triangle)
    'Ch',       // House 2
    'Empty',    // House 3
    'Sa, Sk',   // House 4
    'Gu',       // House 5
    'Ra',       // House 6
    'Empty',    // House 7
    'Ma',       // House 8
    'Empty',    // House 9
    'Ke',       // House 10
    'Empty',    // House 11
    'Empty'     // House 12
  ];

  // Map planets
  const planetaryPositions: PlanetaryPosition[] = [
    { name: 'Sun (Surya)', zodiac: selectedSun.split(' ')[0], house: 1, degree: '12° 24\' 15"' },
    { name: 'Moon (Chandra)', zodiac: selectedMoon.split(' ')[0], house: 2, degree: '08° 11\' 44"' },
    { name: 'Mars (Mangal)', zodiac: 'Mesh', house: 8, degree: '24° 51\' 10"' },
    { name: 'Mercury (Budh)', zodiac: selectedSun.split(' ')[0], house: 1, degree: '15° 12\' 30"' },
    { name: 'Jupiter (Guru)', zodiac: 'Dhanu', house: 5, degree: '19° 04\' 22"' },
    { name: 'Venus (Shukra)', zodiac: 'Tula', house: 4, degree: '04° 15\' 08"' },
    { name: 'Saturn (Shani)', zodiac: 'Kumbha', house: 4, degree: '22° 07\' 14"' },
    { name: 'Rahu', zodiac: 'Mithuna', house: 6, degree: '06° 31\' 55"' },
    { name: 'Ketu', zodiac: 'Dhanu', house: 10, degree: '06° 31\' 55"' }
  ];

  const mahadashas = ['Jupiter (Guru)', 'Saturn (Shani)', 'Mercury (Budh)', 'Venus (Shukra)', 'Sun (Surya)', 'Moon (Chandra)', 'Mars (Mangal)'];
  const antardashas = ['Mercury (Budh)', 'Venus (Shukra)', 'Jupiter (Guru)', 'Saturn (Shani)', 'Mars (Mangal)'];

  const mahadasha = getDeterministicValue(seed + 'mahadasha', mahadashas);
  const antardasha = getDeterministicValue(seed + 'antardasha', antardashas);

  // High-quality concise 1-2 lines insights (no long paragraphs as requested)
  const lifeInsights = {
    career: 'Excellent support of Jupiter in the 5th house points to great success in consulting, management, or technology. October brings new opportunities.',
    marriage: 'Smooth dasha with Venus in the 4th house. A peaceful marriage partner is predicted, with strong planetary compatibility of moons.',
    finance: 'Dhanyog is active. Strong income growth is expected through self-employment or secondary sources after your 28th year.',
    health: 'Mars transit requires minor vigilance in digestion and high-energy tasks. Daily yoga is suggested for complete physical harmony.',
    family: 'Very cooperative household environments. Support from parental figures will help you resolve key financial/property milestones.'
  };

  return {
    profileId: seed,
    kundliId: `KND-${Date.now()}`,
    birthDetails: {
      name,
      gender: profile.gender || 'male',
      dob,
      tob,
      state: profile.state || 'Uttar Pradesh',
      district: profile.district || 'Varanasi',
      city: profile.city || 'Varanasi'
    },
    chartData,
    planetaryPositions,
    astrologySummary: {
      lagna: selectedLagna,
      sunSign: selectedSun,
      moonSign: selectedMoon,
      nakshatra: selectedNakshatra,
      moolank,
      bhagyank
    },
    currentDasha: {
      mahadasha,
      antardasha
    },
    lifeInsights,
    generatedAt: new Date().toLocaleString('en-IN')
  };
};
