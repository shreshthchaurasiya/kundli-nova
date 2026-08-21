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

export const CHALDEAN_MAP: Record<string, number> = {
  a: 1, i: 1, j: 1, q: 1, y: 1,
  b: 2, k: 2, r: 2,
  c: 3, g: 3, l: 3, s: 3,
  d: 4, m: 4, t: 4,
  e: 5, h: 5, n: 5, x: 5,
  u: 6, v: 6, w: 6,
  o: 7, z: 7,
  f: 8, p: 8
};

export const calculateChaldeanNameValue = (name: string): number => {
  const cleaned = name.toLowerCase().replace(/[^a-z]/g, '');
  let sum = 0;
  for (let i = 0; i < cleaned.length; i++) {
    sum += CHALDEAN_MAP[cleaned[i]] || 0;
  }
  return sum;
};

export const getChaldeanLetterValues = (name: string): Array<{ letter: string, value: number }> => {
  const letters: Array<{ letter: string, value: number }> = [];
  const cleaned = name.toLowerCase();
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (/[a-z]/.test(char)) {
      letters.push({ letter: cleaned[i].toUpperCase(), value: CHALDEAN_MAP[char] || 0 });
    } else if (char === ' ') {
      letters.push({ letter: 'Space', value: 0 });
    }
  }
  return letters;
};

export const reduceToSingleDigit = (num: number): number => {
  if (num === 0) return 0;
  const sum = String(num).split('').reduce((acc, digit) => acc + parseInt(digit, 10), 0);
  return sum > 9 ? reduceToSingleDigit(sum) : sum;
};

const COMPATIBILITY_MATRIX: Record<number, { friendly: number[], enemy: number[] }> = {
  1: { friendly: [1, 2, 3, 5, 9], enemy: [6, 8] },
  2: { friendly: [1, 2, 3, 5], enemy: [4, 7, 8, 9] },
  3: { friendly: [1, 2, 3, 5, 7, 9], enemy: [6, 8] },
  4: { friendly: [1, 5, 6, 7], enemy: [2, 8, 9] },
  5: { friendly: [1, 2, 3, 5, 6, 8, 9], enemy: [] },
  6: { friendly: [4, 5, 6, 7, 8], enemy: [1, 2, 3, 9] },
  7: { friendly: [1, 3, 4, 5, 6], enemy: [2, 8, 9] },
  8: { friendly: [5, 6], enemy: [1, 2, 4, 8, 9] },
  9: { friendly: [1, 2, 3, 5, 9], enemy: [4, 6, 7, 8] }
};

export const getCompatibilityStatus = (nameDigit: number, birthDigit: number): 'friendly' | 'neutral' | 'enemy' => {
  const relationship = COMPATIBILITY_MATRIX[birthDigit];
  if (!relationship) return 'neutral';
  if (relationship.friendly.includes(nameDigit)) return 'friendly';
  if (relationship.enemy.includes(nameDigit)) return 'enemy';
  return 'neutral';
};

export interface SpellingSuggestion {
  suggestedName: string;
  compoundValue: number;
  singleDigit: number;
  addedLetter: string;
}

export const getSpellingSuggestions = (
  name: string,
  moolank: number,
  bhagyank: number
): SpellingSuggestion[] => {
  const suggestions: SpellingSuggestion[] = [];
  const nameParts = name.trim().split(/\s+/);
  if (nameParts.length === 0) return [];
  
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');
  
  const candidates: Array<{ name: string, added: string }> = [];
  
  // Vowels and key spelling enhancers to try doubling
  const lettersToDouble = ['a', 'e', 'i', 'o', 'u', 'h', 's', 'r', 'n', 't', 'g', 'l'];
  
  // 1. Try doubling letters in first name
  for (let i = 0; i < firstName.length; i++) {
    const char = firstName[i].toLowerCase();
    
    // Skip doubling starting consonants (index 0 and 1) to avoid unnatural spellings like "SShreshth" or "GGyan"
    const isVowel = ['a', 'e', 'i', 'o', 'u'].includes(char);
    if (i <= 1 && !isVowel) continue;
    
    if (lettersToDouble.includes(char)) {
      const suggestedFirst = firstName.slice(0, i) + firstName[i] + firstName[i] + firstName.slice(i + 1);
      const suggestedFullName = lastName ? `${suggestedFirst} ${lastName}` : suggestedFirst;
      candidates.push({ name: suggestedFullName, added: `Double '${firstName[i].toUpperCase()}'` });
    }
  }
  
  // 2. Try appending lucky letters to first name
  const appends = ['a', 'e', 'i', 'h', 's'];
  for (const letter of appends) {
    const suggestedFirst = firstName + letter;
    const suggestedFullName = lastName ? `${suggestedFirst} ${lastName}` : suggestedFirst;
    candidates.push({ name: suggestedFullName, added: `Add '${letter.toUpperCase()}' at end` });
  }

  // Evaluate compatibility for each candidate
  const seenNames = new Set<string>();
  seenNames.add(name.toLowerCase()); // exclude the original name
  
  for (const cand of candidates) {
    const candLower = cand.name.toLowerCase();
    if (seenNames.has(candLower)) continue;
    
    const compound = calculateChaldeanNameValue(cand.name);
    const single = reduceToSingleDigit(compound);
    
    const mStatus = getCompatibilityStatus(single, moolank);
    const bStatus = getCompatibilityStatus(single, bhagyank);
    
    // Suggest if friendly with both, or friendly with one and neutral with other
    const isFriendlyMatch = (mStatus === 'friendly' && bStatus === 'friendly') ||
                           (mStatus === 'friendly' && bStatus === 'neutral') ||
                           (mStatus === 'neutral' && bStatus === 'friendly');
                           
    if (isFriendlyMatch) {
      seenNames.add(candLower);
      suggestions.push({
        suggestedName: cand.name,
        compoundValue: compound,
        singleDigit: single,
        addedLetter: cand.added
      });
    }
  }
  return suggestions.slice(0, 4); // return top 4 suggestions
};

export const PLANET_NAMES: Record<number, string> = {
  1: "Sun (Surya)",
  2: "Moon (Chandra)",
  3: "Jupiter (Guru)",
  4: "Rahu",
  5: "Mercury (Budh)",
  6: "Venus (Shukra)",
  7: "Ketu",
  8: "Saturn (Shani)",
  9: "Mars (Mangal)"
};

export const LUCKY_PEN_INKS: Record<number, string> = {
  1: "Red or Orange Ink",
  2: "Blue Ink",
  3: "Yellow or Orange Ink",
  4: "Blue Ink",
  5: "Green Ink",
  6: "White or Light Blue Ink",
  7: "Blue Ink",
  8: "Blue or Black Ink",
  9: "Red Ink"
};

export const PLANET_MANTRAS: Record<number, string> = {
  1: "Om Suryaya Namah (ऊँ सूर्याय नमः)",
  2: "Om Somaya Namah (ऊँ सोमाय नमः)",
  3: "Om Gurave Namah (ऊँ गुरवे नमः)",
  4: "Om Rahave Namah (ऊँ राहवे नमः)",
  5: "Om Budhaya Namah (ऊँ बुधाय नमः)",
  6: "Om Shukraya Namah (ऊँ शुक्राय नमः)",
  7: "Om Ketave Namah (ऊँ केतवे नमः)",
  8: "Om Sham Shanaishcharaya Namah (ऊँ शं शनैश्चराय नमः)",
  9: "Om Bhaumaya Namah (ऊँ भौमाय नमः)"
};

const PLANET_PAIR_EXPLANATIONS: Record<string, string> = {
  "1-8": "Clash between Sun (1) and Saturn (8) (father-son enmity in astrology). This causes authority clashes, self-doubt, and major delays in professional growth.",
  "8-1": "Clash between Saturn (8) and Sun (1). This creates a struggle for recognition, obstacles from higher-ups, and sudden career blocks.",
  "1-6": "Friction between Sun (1) and Venus (6). Ego clashes with luxury/relationships, leading to personal conflicts and emotional dissatisfaction.",
  "6-1": "Venus (6) vs Sun (1). Causes a conflict between personal artistic desires and public expectations, making it hard to find peace.",
  "2-4": "Eclipse energy of Moon (2) and Rahu (4). This brings high emotional instability, anxiety, confusion, and sudden financial fluctuations.",
  "4-2": "Rahu (4) vs Moon (2). Causes illusions, lack of focus, and sudden mood shifts that disrupt continuous progress.",
  "2-7": "Detachment energy between Moon (2) and Ketu (7). Leads to spiritual restlessness, sudden isolation, and feeling disconnected from material goals.",
  "7-2": "Ketu (7) vs Moon (2). Heightens detachment, causing user to abandon efforts midway or feel constant self-doubt.",
  "2-8": "Vish Yoga energy of Moon (2) and Saturn (8). This creates heavy mental depression, delays in daily execution, and feeling burdened.",
  "8-2": "Saturn (8) vs Moon (2). Imposes strict delays on mental satisfaction and locks the user in repetitive struggles.",
  "2-9": "Fire-water clash of Moon (2) and Mars (9). Results in high impulsiveness, short-temper, and emotional volatility.",
  "9-2": "Mars (9) vs Moon (2). Directs aggressive energy inward, leading to internal tension and relationship disputes.",
  "3-6": "Ideology clash between Jupiter (3) and Venus (6) (Dev Guru vs Asur Guru). Leads to confusion between spiritual growth and material indulgence.",
  "6-3": "Venus (6) vs Jupiter (3). Makes it difficult to balance spending on luxury with long-term financial wisdom.",
  "4-8": "Extreme pressure of Rahu (4) and Saturn (8). Causes sudden setbacks, legal worries, or feeling stuck under heavy karma.",
  "8-4": "Saturn (8) vs Rahu (4). Multiplies struggle, demanding double effort for basic success.",
  "4-9": "Angarak vibration of Rahu (4) and Mars (9). Heightens risk of arguments, legal issues, and impulsive accidents.",
  "9-4": "Mars (9) vs Rahu (4). Creates explosive anger or sudden disputes with business partners and family.",
  "8-9": "Iron and Fire clash of Saturn (8) and Mars (9). Leads to heavy accidents, opposition from powerful enemies, and sudden failures.",
  "9-8": "Mars (9) vs Saturn (8). Slows down vital drive and causes internal frustration due to restricted actions."
};

const FRIENDLY_PAIR_EXPLANATIONS: Record<string, string> = {
  "1-5": "Budhaditya vibration of Sun (1) and Mercury (5). This brings sharp intelligence, excellent business communication, and public honor.",
  "5-1": "Auspicious alignment of Mercury (5) and Sun (1). Sharpens intellectual execution and gives strong analytical skills.",
  "5-6": "Wealth vibration of Mercury (5) and Venus (6). Highly lucky for commercial success, financial prosperity, and creative luxuries.",
  "6-5": "Venus (6) and Mercury (5) combination. Bestows an attractive personality, artistic skills, and wealth accumulation.",
  "1-2": "Royal alignment of Sun (1) and Moon (2). Balances public status with internal peace, bringing leadership with emotional wisdom.",
  "2-1": "Moon (2) and Sun (1) alignment. Strengthens willpower and improves relationship with father and authorities.",
  "1-3": "Sun (1) and Jupiter (3) alliance. Brings high moral character, administrative success, and wisdom.",
  "3-1": "Jupiter (3) and Sun (1) harmony. Boosts educational excellence and builds a highly respectable social position.",
  "1-9": "Sun (1) and Mars (9) power. Inspires high courage, administrative control, and competitive victory.",
  "9-1": "Mars (9) and Sun (1) alliance. Amplifies physical energy, focus, and leadership capabilities.",
  "2-3": "Gaja Kesari energy of Moon (2) and Jupiter (3). Brings mental calmness, deep wisdom, wealth, and spiritual growth.",
  "3-2": "Jupiter (3) and Moon (2) alliance. Brings emotional stability, learning capacity, and clean intuition.",
  "5-9": "Mercury (5) and Mars (9) combination. Gives rapid decision making, sharp wit, and mechanical/engineering success."
};

export const getPlanetaryInteractionText = (
  nameNum: number,
  birthNum: number
): { status: 'friendly' | 'neutral' | 'enemy'; explanation: string } => {
  const status = getCompatibilityStatus(nameNum, birthNum);
  const key = `${nameNum}-${birthNum}`;
  
  let explanation = '';
  if (status === 'enemy') {
    explanation = PLANET_PAIR_EXPLANATIONS[key] || 
      `The vibration of your Name Number ${nameNum} (${PLANET_NAMES[nameNum] || 'Unknown Planet'}) conflicts with your Birth Number ${birthNum} (${PLANET_NAMES[birthNum] || 'Unknown Planet'}). This creates minor friction and blocks the natural flow of opportunities.`;
  } else if (status === 'friendly') {
    explanation = FRIENDLY_PAIR_EXPLANATIONS[key] || 
      `Excellent harmony! Your Name Number ${nameNum} (${PLANET_NAMES[nameNum] || 'Unknown Planet'}) perfectly aligns with your Birth Number ${birthNum} (${PLANET_NAMES[birthNum] || 'Unknown Planet'}). This supports a steady and positive flow of career growth and recognition.`;
  } else {
    explanation = `Your Name Number ${nameNum} (${PLANET_NAMES[nameNum] || 'Unknown Planet'}) is neutral with your Birth Number ${birthNum} (${PLANET_NAMES[birthNum] || 'Unknown Planet'}). It brings stable, balanced energies without any negative friction.`;
  }
  
  return { status, explanation };
};

export const calculatePersonalYear = (dob: string, targetYear: number): number => {
  const parts = dob.split('-');
  if (parts.length < 3) return 1;
  const birthDay = parseInt(parts[2], 10);
  const birthMonth = parseInt(parts[1], 10);
  
  if (isNaN(birthDay) || isNaN(birthMonth)) return 1;
  
  const sum = birthDay + birthMonth + targetYear;
  return reduceToSingleDigit(sum);
};

export const calculatePersonalMonth = (personalYear: number, month1Based: number): number => {
  return reduceToSingleDigit(personalYear + month1Based);
};

export const calculatePersonalDay = (personalMonth: number, dayOfMonth: number): number => {
  return reduceToSingleDigit(personalMonth + dayOfMonth);
};



