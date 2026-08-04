import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Sparkles, Star, ChevronDown, Plus, X, ShieldAlert, CheckCircle } from 'lucide-react';
import { Screen } from '../types';
import { useProfile } from '../contexts/ProfileContext';
import { useRepositories } from '../repositories/repositoryProvider';
import { KundliProfile } from '../types/kundli';
import { 
  calculateMoolank, 
  calculateBhagyank,
  calculateChaldeanNameValue,
  getChaldeanLetterValues,
  reduceToSingleDigit,
  getCompatibilityStatus,
  getSpellingSuggestions,
  SpellingSuggestion,
  getPlanetaryInteractionText,
  PLANET_NAMES,
  LUCKY_PEN_INKS,
  PLANET_MANTRAS,
  calculatePersonalYear,
  calculatePersonalMonth,
  calculatePersonalDay
} from '../services/kundliService';

interface NumerologyScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
}

const MOOLANK_INSIGHTS: Record<number, { title: string, planet: string, element: string, traits: string, career: string, advice: string, color: string }> = {
  1: {
    title: "The Leader",
    planet: "Sun (Surya)",
    element: "Fire",
    color: "Gold & Orange",
    traits: "Independent, ambitious, pioneering, and authoritative. You are a natural-born leader who thrives on innovation and taking charge.",
    career: "Entrepreneurship, management, politics, or any field where you can lead and make independent decisions.",
    advice: "Avoid being overly dominant or stubborn. Learn to listen to others and collaborate while maintaining your leadership.",
  },
  2: {
    title: "The Peacemaker",
    planet: "Moon (Chandra)",
    element: "Water",
    color: "White & Silver",
    traits: "Empathetic, diplomatic, intuitive, and sensitive. You seek harmony and have a deep understanding of others' emotions.",
    career: "Counseling, teaching, arts, diplomacy, or any role that requires teamwork and emotional intelligence.",
    advice: "Protect your energy. Do not let your sensitivity become a weakness, and avoid overthinking or being overly dependent.",
  },
  3: {
    title: "The Communicator",
    planet: "Jupiter (Guru)",
    element: "Fire",
    color: "Yellow",
    traits: "Optimistic, charismatic, creative, and expressive. You have a vibrant energy that draws people to you and a natural talent for communication.",
    career: "Writing, acting, public speaking, teaching, or creative arts.",
    advice: "Stay focused. Your broad interests can lead to scattered energy. Cultivate discipline to finish what you start.",
  },
  4: {
    title: "The Builder",
    planet: "Rahu",
    element: "Earth",
    color: "Blue & Grey",
    traits: "Practical, hardworking, disciplined, and detail-oriented. You are the foundation upon which great things are built.",
    career: "Engineering, architecture, finance, project management, or any structured environment.",
    advice: "Avoid being overly rigid or resistant to change. Embrace flexibility and try not to get bogged down by minor details.",
  },
  5: {
    title: "The Explorer",
    planet: "Mercury (Buddh)",
    element: "Air",
    color: "Green",
    traits: "Adaptable, adventurous, curious, and dynamic. You crave freedom, travel, and continuous learning.",
    career: "Sales, marketing, travel, journalism, or any fast-paced career that offers variety.",
    advice: "Beware of restlessness. Cultivate patience and avoid making impulsive decisions or commitments you cannot keep.",
  },
  6: {
    title: "The Nurturer",
    planet: "Venus (Shukra)",
    element: "Earth/Air",
    color: "Light Blue & Pink",
    traits: "Responsible, loving, harmonious, and aesthetically inclined. You find deep joy in family, community, and creating beauty.",
    career: "Healthcare, education, interior design, counseling, or hospitality.",
    advice: "Remember to care for yourself as much as you care for others. Set healthy boundaries to avoid being taken advantage of.",
  },
  7: {
    title: "The Seeker",
    planet: "Ketu",
    element: "Water",
    color: "White & Light Colors",
    traits: "Analytical, spiritual, introspective, and mysterious. You are driven by a need to understand the deeper truths of life.",
    career: "Research, science, philosophy, occult studies, or technology.",
    advice: "Avoid isolation and cynicism. While you need your alone time, ensure you remain connected to the physical world and your loved ones.",
  },
  8: {
    title: "The Powerhouse",
    planet: "Saturn (Shani)",
    element: "Earth",
    color: "Black & Dark Blue",
    traits: "Ambitious, authoritative, resilient, and business-minded. You understand the material world and know how to manifest success.",
    career: "Corporate leadership, finance, law, real estate, or large-scale business.",
    advice: "Balance your material pursuits with spiritual grounding. Avoid becoming overly materialistic or ruthless in your ambition.",
  },
  9: {
    title: "The Humanitarian",
    planet: "Mars (Mangal)",
    element: "Fire",
    color: "Red",
    traits: "Compassionate, idealistic, courageous, and generous. You have a global perspective and a deep desire to make the world a better place.",
    career: "Philanthropy, healthcare, military, social work, or human resources.",
    advice: "Learn to let go. Forgiveness is your greatest lesson. Avoid holding onto past resentments or becoming overly aggressive.",
  }
};

const BHAGYANK_INSIGHTS: Record<number, { title: string, planet: string, element: string, traits: string, career: string, advice: string, color: string }> = {
  1: {
    title: "The Pioneer",
    planet: "Sun (Surya)",
    element: "Fire",
    color: "Gold & Saffron",
    traits: "Your life path is centered around self-determination, originality, and leadership. You are meant to break new ground and stand on your own two feet.",
    career: "Business creation, managerial roles, independent consulting, innovation, and leadership positions.",
    advice: "Do not let ego or impatience dictate your decisions. True leadership is about guiding others, not just self-promotion.",
  },
  2: {
    title: "The Diplomat",
    planet: "Moon (Chandra)",
    element: "Water",
    color: "White & Cream",
    traits: "Your destiny is to bring harmony, cooperation, and balance to the world. You excel in partnerships, mediation, and understanding the emotional landscape.",
    career: "Counseling, negotiation, diplomacy, human resources, teaching, and arts.",
    advice: "Establish healthy boundaries. Your desire for peace should not lead to self-sacrifice or hiding your true feelings.",
  },
  3: {
    title: "The Creative Catalyst",
    planet: "Jupiter (Guru)",
    element: "Fire",
    color: "Deep Yellow",
    traits: "Your life mission is to inspire, express, and spread joy. You are highly creative, communicative, and natural at uplifting others.",
    career: "Performing arts, writing, design, public relations, speaking, and spiritual counseling.",
    advice: "Avoid scattered energy and superficiality. Focus on applying your creative talents to deep, meaningful work rather than starting too many things at once.",
  },
  4: {
    title: "The Architect",
    planet: "Rahu",
    element: "Earth",
    color: "Blue & Grey",
    traits: "Your destiny is to establish order, stability, and structure. You are highly practical, reliable, and capable of building long-term systems.",
    career: "Engineering, logic/programming, database/finance administration, construction, and system design.",
    advice: "Embrace flexibility and change. Avoid becoming overly dogmatic or getting lost in micro-details at the cost of the big picture.",
  },
  5: {
    title: "The Free Spirit",
    planet: "Mercury (Buddh)",
    element: "Air",
    color: "Green",
    traits: "Your life path is one of adventure, freedom, change, and versatility. You are meant to learn from diverse experiences and bridge connections between people.",
    career: "Travel, media/journalism, sales, marketing, consulting, and dynamic startups.",
    advice: "Focus on commitment. Freedom is valuable, but without stability, you risk running away from challenges or leaving projects incomplete.",
  },
  6: {
    title: "The Caregiver",
    planet: "Venus (Shukra)",
    element: "Air/Earth",
    color: "Pastels & Pink",
    traits: "Your destiny is to nurture, serve, and create beauty and harmony. You are natural protectors, counselors, and creators of loving environments.",
    career: "Healthcare, education, counseling, design/arts, hospitality, and social work.",
    advice: "Avoid over-functioning for others or trying to control how they live. Nurturing others should not come at the expense of your own well-being.",
  },
  7: {
    title: "The Philosopher",
    planet: "Ketu",
    element: "Water",
    color: "Off-White & Pastels",
    traits: "Your life mission is the pursuit of truth, wisdom, and inner spiritual realization. You have a highly analytical and introspective mind.",
    career: "Research, philosophy, technological science, analysis, theology, and writing.",
    advice: "Do not isolate yourself. While you require solitude for reflection, maintain active, loving connections with the world.",
  },
  8: {
    title: "The Executive",
    planet: "Saturn (Shani)",
    element: "Earth",
    color: "Black & Navy",
    traits: "Your path is focused on material mastery, power, ambition, and handling major responsibilities. You must learn to direct material success towards a higher purpose.",
    career: "Corporate leadership, financial strategy, legal systems, real estate development, and administration.",
    advice: "Align material power with integrity and spiritual maturity. Real power is determined by how responsibly you handle it, not just by accumulation.",
  },
  9: {
    title: "The Philanthropist",
    planet: "Mars (Mangal)",
    element: "Fire",
    color: "Crimson Red",
    traits: "Your destiny is about humanitarian service, global perspective, and letting go of personal desires for the greater good. You are courageous and compassionate.",
    career: "Charity leadership, international law, medicine/healing, community organizing, and artistic fields.",
    advice: "Avoid anger and holding onto past hurts. Focus on the future, forgive easily, and understand that your path is about universal love.",
  }
};

const LOSHU_REMEDIES: Record<number, { element: string, represents: string, remedy: string }> = {
  1: {
    element: "Water",
    represents: "Career opportunities, individuality, and growth flow.",
    remedy: "Pour water to the Sun (Surya Arghya) daily in the morning, or wear a copper bracelet. Wear red or saffron clothes on Sundays."
  },
  2: {
    element: "Earth",
    represents: "Stability, relationships, love, and patience.",
    remedy: "Drink water from a silver glass. Wear a white pearl or crystal bracelet. Avoid using black clothing."
  },
  3: {
    element: "Wood",
    represents: "Family heritage, growth, wisdom, and health.",
    remedy: "Wear a yellow thread on your right wrist. Keep a green plant or water a banana plant on Thursdays. Respect your elders."
  },
  4: {
    element: "Wood",
    represents: "Wealth, assets, discipline, and future vision.",
    remedy: "Wear wooden beads (Tulsi Mala) or keep a green plant in the North-East direction of your room. Avoid clutter in your workspace."
  },
  5: {
    element: "Earth",
    represents: "Communication, stability, business intelligence, and center balance.",
    remedy: "Wear green clothes on Wednesdays, or wear a green aventurine crystal bracelet. Feed green grass to cows."
  },
  6: {
    element: "Metal",
    represents: "Luxury, home harmony, helpful friends, and travel.",
    remedy: "Wear a silver bracelet or ring on your right hand. Apply pleasant perfumes daily and keep a white marble article in the house."
  },
  7: {
    element: "Metal",
    represents: "Intuition, children, analytical research, and spirituality.",
    remedy: "Donate grey blankets or feed street dogs. Keep a silver article in your wallet and practice meditation in quiet rooms."
  },
  8: {
    element: "Earth",
    represents: "Patience, money management, deep education, and hard work.",
    remedy: "Feed crows on Saturdays. Avoid cheating or lying, and respect laborers or helpers. Donate black sesame seeds."
  },
  9: {
    element: "Fire",
    represents: "Energy, courage, name/fame, and social presence.",
    remedy: "Wear a copper coin around your neck or chant Hanuman Chalisa. Keep a red candle or red light in the South corner of your room."
  }
};

interface LoshuPlane {
  name: string;
  numbers: number[];
  type: string;
  description: string;
}

const LOSHU_PLANES: LoshuPlane[] = [
  { name: "Mental Plane", numbers: [4, 9, 2], type: "Mental", description: "Memory, thinking power, and intellectual capacity." },
  { name: "Soul Plane", numbers: [3, 5, 7], type: "Soul", description: "Emotional balance, intuition, and sensitivity." },
  { name: "Practical Plane", numbers: [8, 1, 6], type: "Practical", description: "Practical application, material success, and daily actions." },
  { name: "Thought Plane", numbers: [4, 3, 8], type: "Thought", description: "Planning, structured logic, and future plans." },
  { name: "Will Power Plane", numbers: [9, 5, 1], type: "Will", description: "Determination, persistence, and raw willpower." },
  { name: "Action Plane", numbers: [2, 7, 6], type: "Action", description: "Execution, physical action, and implementation." },
  { name: "Prosperity / Golden Plane", numbers: [4, 5, 6], type: "Prosperity", description: "High financial prosperity, luck, and overall success." },
  { name: "Spiritual / Silver Plane", numbers: [2, 5, 8], type: "Spiritual", description: "Inner peace, stability, and spiritual depth." }
];

const NAME_NUMBER_INSIGHTS: Record<number, { title: string, vibration: string, details: string }> = {
  1: { title: "Vibration of Leadership & Power", vibration: "Individuality, Action, & Ambition", details: "This name number carries the supreme vibration of the Sun. It brings strong leadership capabilities, independence, and recognition. It is highly compatible with business names and individuals seeking public fame." },
  2: { title: "Vibration of Peace & Harmony", vibration: "Diplomacy, Cooperation, & Sensitivity", details: "This name number vibrates at the frequency of the Moon. It brings a gentle, artistic, and cooperative nature. It helps in building deep emotional connections but requires grounding to prevent over-sensitivity." },
  3: { title: "Vibration of Creativity & Wisdom", vibration: "Expansion, Joy, & Communication", details: "This name number is governed by Jupiter. It brings immense creative expression, optimism, and spiritual or intellectual growth. It is highly lucky for writers, teachers, and communicators." },
  4: { title: "Vibration of Discipline & Structure", vibration: "Order, Logic, & Unconventionality", details: "Governed by Rahu, this number brings strong organizational abilities, dedication, and out-of-the-box thinking. It represents solid foundations but can bring sudden changes or struggles." },
  5: { title: "Vibration of Magnetism & Success", vibration: "Versatility, Freedom, & Commerce", details: "Governed by Mercury, this is one of the luckiest name numbers. It brings strong communication, business intelligence, rapid adaptability, and absolute charm. It is highly friendly with almost all birth numbers." },
  6: { title: "Vibration of Luxury & Attraction", vibration: "Beauty, Relationships, & Nurturing", details: "Governed by Venus, this name number brings harmony, luxury, comfort, and strong artistic inclination. It makes the bearer highly attractive and socially popular, bringing family comfort." },
  7: { title: "Vibration of Intuition & Wisdom", vibration: "Introspection, Spirituality, & Analysis", details: "Governed by Ketu, this number brings a highly intellectual, analytical, and spiritual vibration. It is excellent for researchers, philosophers, and spiritual seekers, but can cause emotional detachment." },
  8: { title: "Vibration of Authority & Karma", vibration: "Power, Materialism, & Resilience", details: "Governed by Saturn, this name number represents major financial mastery, administrative power, and resilience. However, it demands high integrity and brings heavy responsibilities and lessons." },
  9: { title: "Vibration of Courage & Humanity", vibration: "Compassion, Vitality, & Completion", details: "Governed by Mars, this number brings intense energy, courage, and humanitarian desire. It gives a strong protective nature and drives the person to fight for others, but requires anger control." }
};

const PERSONAL_YEAR_DETAILS: Record<number, { theme: string, description: string }> = {
  1: { theme: "Year of New Beginnings & Action", description: "A time to plant seeds for the next 9-year cycle. Focus on independence, start new projects, and lead with courage. Avoid procrastination." },
  2: { theme: "Year of Harmony, Patience & Union", description: "Focus on relationships, partnerships, and emotional growth. A year to cooperate rather than push aggressively. Balance is key." },
  3: { theme: "Year of Creative Expression & Expansion", description: "A highly lucky and expressive year. Perfect for learning, communication, travel, and social success. Let your creativity guide you." },
  4: { theme: "Year of Hard Work, Discipline & Foundation", description: "Focus on building solid foundations, managing finances, and organized routines. Requires dedication and physical efforts." },
  5: { theme: "Year of Change, Freedom & Adaptability", description: "Expect unexpected opportunities, travel, and lifestyle shifts. Excellent for business growth and learning, but avoid impulsive risks." },
  6: { theme: "Year of Responsibility, Family & Luxury", description: "Focus on domestic peace, home decoration, family duties, and self-care. A great time for marriage, assets purchase, and luxury." },
  7: { theme: "Year of Introspection, Analysis & Spirit", description: "A year to study, meditate, and reflect. Material gains may be slower, but spiritual wisdom and research capacities will be at their peak." },
  8: { theme: "Year of Power, Harvest & Karma", description: "The year of material fruits. Success in administrative power, finances, and long-term career. However, demands complete ethical integrity." },
  9: { theme: "Year of Completion, Release & Charity", description: "A year to clean up old, useless attachments, finish pending projects, and perform charity. Prepare yourself for the upcoming Year 1 cycle." }
};

const PERSONAL_MONTH_DETAILS: Record<number, { theme: string, advice: string }> = {
  1: { theme: "Initiate New Actions", advice: "Start that pending project or idea now. You have the raw mental drive to push forward." },
  2: { theme: "Cooperate & Connect", advice: "Nurture partnerships, keep emotional balance, and avoid arguments. Listen to others." },
  3: { theme: "Socialize & Express", advice: "A month for communication, learning, and self-promotion. Share your thoughts confidently." },
  4: { theme: "Structure & Organize", advice: "Clean your workspace, manage your budgets, and work with structure. Hard work pays off." },
  5: { theme: "Explore & Adapt", advice: "Adapt to changes, communicate with clients, and be ready to travel. Keep your schedule flexible." },
  6: { theme: "Care & Comfort", advice: "Focus on home peace, resolve family conflicts, and spend on self-care and aesthetics." },
  7: { theme: "Reflect & Meditate", advice: "Spend quiet time in nature, read books, analyze plans, and avoid starting heavy physical expansion." },
  8: { theme: "Manage & Execute", advice: "Take charge of financial decisions, ask for authority, and execute your long-term strategies." },
  9: { theme: "Release & Conclude", advice: "Clean up clutter, let go of past grudges, complete projects, and help someone in need." }
};

export default function NumerologyScreen({ onNavigate }: NumerologyScreenProps) {
  const { defaultKundliProfile } = useProfile();
  const repositories = useRepositories();
  
  const [profiles, setProfiles] = useState<KundliProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isProfileSwitcherOpen, setIsProfileSwitcherOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'moolank' | 'bhagyank' | 'loshu' | 'name' | 'forecast'>('moolank');

  const getProfileDobString = (prof: any) => {
    const dob = prof?.birthDetails?.dob || prof?.dob;
    if (!dob) return '';
    try {
      return new Date(dob).toLocaleDateString();
    } catch (e) {
      return '';
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const list = await repositories.kundliProfile.getAllProfiles();
        if (isMounted) {
          setProfiles(list);
          const selfP = list.find(p => p.relation === 'self');
          const defaultP = list.find(p => p.isDefault);
          const activeP = selfP || defaultP || list[0] || null;
          if (activeP) {
            setSelectedProfileId(activeP.id);
          }
        }
      } catch (err) {
        console.error('Failed to load profiles in NumerologyScreen', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [repositories.kundliProfile]);

  const selectedProfile = useMemo(() => {
    return profiles.find(p => p.id === selectedProfileId) || null;
  }, [profiles, selectedProfileId]);

  const moolank = useMemo(() => {
    const dob = selectedProfile?.birthDetails?.dob || (selectedProfile as any)?.dob || null;
    return dob ? calculateMoolank(dob) : null;
  }, [selectedProfile]);

  const bhagyank = useMemo(() => {
    const dob = selectedProfile?.birthDetails?.dob || (selectedProfile as any)?.dob || null;
    return dob ? calculateBhagyank(dob) : null;
  }, [selectedProfile]);

  // Extract DOB digits + Moolank + Bhagyank for Loshu grid map
  const loshuNumbers = useMemo(() => {
    const dob = selectedProfile?.birthDetails?.dob || (selectedProfile as any)?.dob || null;
    if (!dob) return [];
    const digits: number[] = [];
    
    // 1. Get raw digits from date string
    const cleaned = dob.replace(/[^0-9]/g, '');
    for (let i = 0; i < cleaned.length; i++) {
      const num = parseInt(cleaned[i], 10);
      if (num > 0 && num <= 9) {
        digits.push(num);
      }
    }
    // 2. Add Moolank
    if (moolank && moolank > 0 && moolank <= 9) {
      digits.push(moolank);
    }
    // 3. Add Bhagyank
    if (bhagyank && bhagyank > 0 && bhagyank <= 9) {
      digits.push(bhagyank);
    }
    return digits;
  }, [selectedProfile, moolank, bhagyank]);

  // Map occurrences for rendering
  const numberOccurrences = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let i = 1; i <= 9; i++) counts[i] = 0;
    for (const num of loshuNumbers) {
      counts[num] = (counts[num] || 0) + 1;
    }
    return counts;
  }, [loshuNumbers]);

  const missingNumbers = useMemo(() => {
    const missing: number[] = [];
    for (let i = 1; i <= 9; i++) {
      if (!numberOccurrences[i]) {
        missing.push(i);
      }
    }
    return missing;
  }, [numberOccurrences]);

  const nameLetters = useMemo(() => {
    return selectedProfile ? getChaldeanLetterValues(selectedProfile.name) : [];
  }, [selectedProfile]);

  const nameCompoundValue = useMemo(() => {
    return selectedProfile ? calculateChaldeanNameValue(selectedProfile.name) : 0;
  }, [selectedProfile]);

  const nameSingleDigit = useMemo(() => {
    return reduceToSingleDigit(nameCompoundValue);
  }, [nameCompoundValue]);

  const moolankRelation = useMemo(() => {
    return moolank && nameSingleDigit ? getPlanetaryInteractionText(nameSingleDigit, moolank) : null;
  }, [nameSingleDigit, moolank]);

  const bhagyankRelation = useMemo(() => {
    return bhagyank && nameSingleDigit ? getPlanetaryInteractionText(nameSingleDigit, bhagyank) : null;
  }, [nameSingleDigit, bhagyank]);

  const moolankCompatibility = useMemo(() => {
    return moolankRelation?.status || 'neutral';
  }, [moolankRelation]);

  const bhagyankCompatibility = useMemo(() => {
    return bhagyankRelation?.status || 'neutral';
  }, [bhagyankRelation]);

  const spellingSuggestions = useMemo(() => {
    return selectedProfile && moolank && bhagyank 
      ? getSpellingSuggestions(selectedProfile.name, moolank, bhagyank) 
      : [];
  }, [selectedProfile, moolank, bhagyank]);

  const nameInsight = useMemo(() => {
    return nameSingleDigit ? NAME_NUMBER_INSIGHTS[nameSingleDigit] : null;
  }, [nameSingleDigit]);

  const today = useMemo(() => new Date(), []);

  const personalYear = useMemo(() => {
    const dob = selectedProfile?.birthDetails?.dob || (selectedProfile as any)?.dob || null;
    return dob ? calculatePersonalYear(dob, today.getFullYear()) : 1;
  }, [selectedProfile, today]);

  const personalMonth = useMemo(() => {
    return calculatePersonalMonth(personalYear, today.getMonth() + 1);
  }, [personalYear, today]);

  const personalDay = useMemo(() => {
    return calculatePersonalDay(personalMonth, today.getDate());
  }, [personalMonth, today]);

  const personalDayCompatibility = useMemo(() => {
    return moolank && personalDay ? getCompatibilityStatus(personalDay, moolank) : 'neutral';
  }, [personalDay, moolank]);

  const activeInsight = useMemo(() => {
    if (activeSubTab === 'moolank') {
      return moolank ? MOOLANK_INSIGHTS[moolank] : null;
    } else if (activeSubTab === 'bhagyank') {
      return bhagyank ? BHAGYANK_INSIGHTS[bhagyank] : null;
    }
    return null;
  }, [activeSubTab, moolank, bhagyank]);

  const gridLayout = [
    [4, 9, 2],
    [3, 5, 7],
    [8, 1, 6]
  ];

  return (
    <div className="h-full w-full bg-[#FAFAFA] overflow-hidden flex flex-col font-sans relative text-neutral-800">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-[#FF8A00]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#8B5CF6]/5 rounded-full blur-[100px]" />
      </div>

      <div className="bg-[#FFFFFF]/90 backdrop-blur-md border-b border-gray-100/60 sticky top-0 z-40 shadow-[0_2px_12px_rgba(0,0,0,0.015)]">
        <div className="flex items-center justify-between px-4 py-4">
          <button 
            onClick={() => onNavigate('home')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-neutral-50 text-neutral-800 active:bg-neutral-100 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex flex-col items-center">
            <h1 className="text-neutral-900 font-bold text-[18px] tracking-wide">Numerology</h1>
            <p className="text-[#FF8A00] text-[10px] font-extrabold tracking-widest uppercase mt-0.5">Secret of Numbers</p>
          </div>
          <div className="w-10 h-10" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-6 pb-24 z-10 space-y-6">
        {selectedProfile && (
          <div 
            onClick={() => setIsProfileSwitcherOpen(true)}
            className="max-w-md mx-auto bg-gradient-to-r from-[#FFFDF9] to-[#FFF9F0] border border-[#F5E6D3] rounded-2xl p-4 shadow-[0_2px_8px_rgba(255,138,0,0.02)] flex items-center justify-between cursor-pointer hover:border-[#FF8A00]/40 transition-colors group relative overflow-hidden"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#FF8A00] to-[#FFB74D] text-white flex items-center justify-center font-[800] text-[18px] shadow-[0_3px_8px_rgba(255,138,0,0.15)] ring-2 ring-white shrink-0">
                {selectedProfile.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[14.5px] font-[850] text-[#111827] leading-tight max-w-[150px] truncate group-hover:text-[#FF8A00] transition-colors">
                    {selectedProfile.name}
                  </span>
                  <ChevronDown size={14} className="text-neutral-400 group-hover:text-[#FF8A00] transition-colors" />
                </div>
                <div className="flex items-center space-x-1.5 text-neutral-400 text-[11px] font-semibold mt-1">
                  <span className="capitalize">{selectedProfile.relation}</span>
                  <span className="text-neutral-300">•</span>
                  <span>{getProfileDobString(selectedProfile)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#FFFDF9] to-[#FFF9F0] p-5 rounded-[24px] border border-[#F5E6D3] shadow-[0_4px_20px_rgba(0,0,0,0.02)] relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF8A00]/5 rounded-full blur-[40px] pointer-events-none" />
          <h2 className="text-[#111827] font-bold text-xl mb-1.5">Discover Your Destiny</h2>
          <p className="text-neutral-600 text-xs leading-relaxed">
            Numerology reveals the hidden meaning of numbers in your life. We calculate your <strong className="text-[#111827] font-semibold">Moolank (Root Number)</strong>, <strong className="text-[#111827] font-semibold">Bhagyank (Destiny Number)</strong>, and map your planetary numbers on the sacred <strong className="text-[#111827] font-semibold">Loshu Grid</strong>.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#FF8A00] border-t-transparent rounded-full animate-spin" />
            <p className="text-neutral-400 text-xs mt-3 font-semibold">Loading Profile Details...</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            {/* Header circles display */}
            <div className="flex flex-col items-center justify-center py-4">
              <div className="flex items-center justify-center gap-8 w-full max-w-xs">
                <div 
                  onClick={() => setActiveSubTab('moolank')}
                  className={`flex flex-col items-center cursor-pointer transition-all duration-300 ${activeSubTab === 'moolank' ? 'scale-105' : 'opacity-65 hover:opacity-85'}`}
                >
                  <div className="relative">
                    {activeSubTab === 'moolank' && <div className="absolute inset-0 bg-gradient-to-br from-[#FF8A00] to-[#E85D04] opacity-10 blur-[20px] rounded-full animate-pulse" />}
                    <div className={`w-[84px] h-[84px] rounded-full p-[2.5px] shadow-md transition-colors ${activeSubTab === 'moolank' ? 'bg-gradient-to-br from-[#FF8A00] to-[#E85D04]' : 'bg-neutral-200'}`}>
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center relative overflow-hidden">
                        <span className="text-[40px] font-black text-transparent bg-clip-text bg-gradient-to-b from-[#FFB74D] to-[#FF8A00] drop-shadow-md">{moolank}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[12px] font-extrabold text-neutral-800 mt-2.5">Moolank</span>
                </div>
                <div 
                  onClick={() => setActiveSubTab('bhagyank')}
                  className={`flex flex-col items-center cursor-pointer transition-all duration-300 ${activeSubTab === 'bhagyank' ? 'scale-105' : 'opacity-65 hover:opacity-85'}`}
                >
                  <div className="relative">
                    {activeSubTab === 'bhagyank' && <div className="absolute inset-0 bg-gradient-to-br from-[#FF8A00] to-[#E85D04] opacity-10 blur-[20px] rounded-full animate-pulse" />}
                    <div className={`w-[84px] h-[84px] rounded-full p-[2.5px] shadow-md transition-colors ${activeSubTab === 'bhagyank' ? 'bg-gradient-to-br from-[#FF8A00] to-[#E85D04]' : 'bg-neutral-200'}`}>
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center relative overflow-hidden">
                        <span className="text-[40px] font-black text-transparent bg-clip-text bg-gradient-to-b from-[#FFB74D] to-[#FF8A00] drop-shadow-md">{bhagyank}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[12px] font-extrabold text-neutral-800 mt-2.5">Bhagyank</span>
                </div>
              </div>
              {activeInsight && (
                <div className="text-center mt-6">
                  <h3 className="text-[#111827] text-lg font-[850] tracking-tight">{activeInsight.title}</h3>
                  <div className="flex items-center justify-center gap-1.5 mt-2 bg-neutral-100/80 px-3.5 py-1.5 rounded-full border border-neutral-200/40">
                    <Star size={13} className="text-[#FF8A00] fill-[#FF8A00]" />
                    <span className="text-neutral-500 text-xs font-semibold">Ruling Planet: <span className="text-neutral-800 font-bold">{activeInsight.planet}</span></span>
                  </div>
                </div>
              )}
            </div>

            {/* Five Tab Switcher Pill (Horizontal Scroll) */}
            <div className="flex bg-neutral-200/40 p-1.5 rounded-[18px] max-w-sm mx-auto shadow-inner border border-neutral-200/20 overflow-x-auto no-scrollbar gap-1.5 flex-nowrap w-full">
              <button 
                onClick={() => setActiveSubTab('moolank')} 
                className={`shrink-0 py-2.5 px-4 rounded-[14px] text-[11.5px] font-extrabold transition-all duration-200 whitespace-nowrap ${
                  activeSubTab === 'moolank' 
                    ? 'bg-white text-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-neutral-200/5' 
                    : 'text-neutral-550 hover:text-neutral-800'
                }`}
              >
                Moolank
              </button>
              <button 
                onClick={() => setActiveSubTab('bhagyank')} 
                className={`shrink-0 py-2.5 px-4 rounded-[14px] text-[11.5px] font-extrabold transition-all duration-200 whitespace-nowrap ${
                  activeSubTab === 'bhagyank' 
                    ? 'bg-white text-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-neutral-200/5' 
                    : 'text-neutral-550 hover:text-neutral-800'
                }`}
              >
                Bhagyank
              </button>
              <button 
                onClick={() => setActiveSubTab('loshu')} 
                className={`shrink-0 py-2.5 px-4 rounded-[14px] text-[11.5px] font-extrabold transition-all duration-200 whitespace-nowrap ${
                  activeSubTab === 'loshu' 
                    ? 'bg-white text-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-neutral-200/5' 
                    : 'text-neutral-550 hover:text-neutral-800'
                }`}
              >
                Loshu Grid
              </button>
              <button 
                onClick={() => setActiveSubTab('name')} 
                className={`shrink-0 py-2.5 px-4 rounded-[14px] text-[11.5px] font-extrabold transition-all duration-200 whitespace-nowrap ${
                  activeSubTab === 'name' 
                    ? 'bg-white text-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-neutral-200/5' 
                    : 'text-neutral-550 hover:text-neutral-800'
                }`}
              >
                Name Match
              </button>
              <button 
                onClick={() => setActiveSubTab('forecast')} 
                className={`shrink-0 py-2.5 px-4 rounded-[14px] text-[11.5px] font-extrabold transition-all duration-200 whitespace-nowrap ${
                  activeSubTab === 'forecast' 
                    ? 'bg-white text-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-neutral-200/5' 
                    : 'text-neutral-550 hover:text-neutral-800'
                }`}
              >
                Forecast
              </button>
            </div>

            {/* Dynamic Rendering based on Tab */}
            {activeSubTab !== 'loshu' && activeSubTab !== 'name' && activeSubTab !== 'forecast' && activeInsight ? (
              <div className="grid gap-4">
                <div className="bg-white rounded-[20px] p-5 border border-neutral-100 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:border-[#FF8A00]/15 transition-all">
                  <div className="text-[#FF8A00] text-[10px] font-extrabold tracking-wider uppercase mb-1.5">{activeSubTab === 'moolank' ? 'Core Personality' : 'Destiny & Purpose'}</div>
                  <p className="text-neutral-700 text-[14px] leading-relaxed font-medium">{activeInsight.traits}</p>
                </div>
                <div className="bg-white rounded-[20px] p-5 border border-neutral-100 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:border-[#FF8A00]/15 transition-all">
                  <div className="text-[#8B5CF6] text-[10px] font-extrabold tracking-wider uppercase mb-1.5">Ideal Career Path</div>
                  <p className="text-neutral-700 text-[14px] leading-relaxed font-medium">{activeInsight.career}</p>
                </div>
                <div className="bg-white rounded-[20px] p-5 border border-neutral-100 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:border-[#FF8A00]/15 transition-all">
                  <div className="text-[#10B981] text-[10px] font-extrabold tracking-wider uppercase mb-1.5">Guidance & Advice</div>
                  <p className="text-neutral-700 text-[14px] leading-relaxed font-medium">{activeInsight.advice}</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 bg-white rounded-[20px] p-4 border border-neutral-100 shadow-[0_4px_20px_rgba(0,0,0,0.01)] flex flex-col items-center justify-center text-center">
                    <div className="text-neutral-400 text-[9px] font-extrabold tracking-wider uppercase mb-1">Element</div>
                    <div className="text-neutral-800 font-bold text-[14px]">{activeInsight.element}</div>
                  </div>
                  <div className="flex-1 bg-white rounded-[20px] p-4 border border-neutral-100 shadow-[0_4px_20px_rgba(0,0,0,0.01)] flex flex-col items-center justify-center text-center">
                    <div className="text-neutral-400 text-[9px] font-extrabold tracking-wider uppercase mb-1">{activeSubTab === 'moolank' ? 'Lucky Color' : 'Destiny Color'}</div>
                    <div className="text-neutral-800 font-bold text-[14px]">{activeInsight.color}</div>
                  </div>
                </div>
              </div>
            ) : activeSubTab === 'loshu' ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* What is Loshu Grid explanation card */}
                <div className="bg-white rounded-[24px] p-5 border border-neutral-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF8A00]/5 rounded-full blur-[30px] pointer-events-none" />
                  <div className="flex items-center space-x-2.5 mb-2">
                    <Sparkles size={16} className="text-[#FF8A00]" />
                    <h3 className="text-neutral-900 font-bold text-[14.5px]">What is the Loshu Grid?</h3>
                  </div>
                  <p className="text-neutral-600 text-[12px] leading-relaxed font-medium">
                    The Loshu Grid is a sacred 3x3 magic square containing numbers from 1 to 9. It is a powerful tool in Chinese and Vedic Numerology. By placing your Birth Date digits, Moolank, and Bhagyank into the grid, we can analyze the flow of planetary energies in your life. It reveals your strengths (Planes of Strength) and identifies missing energies that require Vedic Remedies.
                  </p>
                </div>

                {/* Visual 3x3 Loshu Grid card */}
                <div className="bg-white rounded-[28px] p-6 border border-neutral-100 shadow-[0_4px_25px_rgba(0,0,0,0.02)] flex flex-col items-center">
                  <div className="text-neutral-400 text-[10px] font-extrabold tracking-wider uppercase mb-5">Vedic Loshu Grid Map</div>
                  
                  {/* Grid layout */}
                  <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] aspect-square bg-[#FDFBF7] p-3 rounded-[24px] border border-[#F4EADA]">
                    {gridLayout.map((row, rIdx) => 
                      row.map((num) => {
                        const count = numberOccurrences[num] || 0;
                        const hasNumber = count > 0;
                        
                        return (
                          <div 
                            key={`${rIdx}-${num}`}
                            className={`flex flex-col items-center justify-center rounded-[18px] border transition-all duration-300 relative aspect-square ${
                              hasNumber 
                                ? 'bg-gradient-to-br from-[#FFF8ED] to-[#FFF3E0] border-[#FF8A00]/40 text-[#FF8A00] shadow-[0_2px_8px_rgba(255,138,0,0.05)]' 
                                : 'bg-[#FAFAFA]/50 border-neutral-200/50 text-neutral-300'
                            }`}
                          >
                            {/* Original Position Indicator */}
                            <span className="absolute top-1.5 left-2 text-[8px] font-bold text-neutral-300 select-none">
                              {num}
                            </span>
                            
                            {/* Occurrences display */}
                            {hasNumber ? (
                              <div className="flex flex-wrap items-center justify-center gap-0.5 px-2">
                                {Array.from({ length: Math.min(count, 4) }).map((_, idx) => (
                                  <span key={idx} className="text-[20px] font-black tracking-tighter leading-none">
                                    {num}
                                  </span>
                                ))}
                                {count > 4 && <span className="text-[10px] font-extrabold leading-none">+</span>}
                              </div>
                            ) : (
                              <span className="text-[16px] font-extrabold opacity-10">—</span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Planes of Strength section */}
                <div className="bg-white rounded-[28px] p-5 border border-neutral-100 shadow-[0_4px_25px_rgba(0,0,0,0.02)] space-y-4">
                  <div className="text-neutral-900 font-bold text-[15px]">Planes of Strength (Arrows)</div>
                  
                  <div className="grid gap-3">
                    {LOSHU_PLANES.map((plane, idx) => {
                      const presentCount = plane.numbers.filter(n => numberOccurrences[n] > 0).length;
                      const strengthPercent = Math.round((presentCount / plane.numbers.length) * 100);
                      
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-[#FAFAFA] border border-neutral-100 hover:border-neutral-200/50 transition-colors">
                          <div className="flex-1 pr-3">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-neutral-800 font-bold text-[13px]">{plane.name}</span>
                              <span className="text-[9.5px] font-semibold text-neutral-400">({plane.numbers.join('-')})</span>
                            </div>
                            <p className="text-neutral-500 text-[11px] font-medium leading-normal mt-0.5">{plane.description}</p>
                          </div>
                          
                          <div className="flex flex-col items-end shrink-0">
                            {strengthPercent === 100 ? (
                              <span className="flex items-center space-x-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                                <CheckCircle size={10} className="fill-emerald-600 text-white" />
                                <span>100% Strength</span>
                              </span>
                            ) : strengthPercent > 0 ? (
                              <span className="text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                                {strengthPercent}% Strength
                              </span>
                            ) : (
                              <span className="text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                                Weak Plane
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Missing Numbers Remedies section */}
                <div className="bg-white rounded-[28px] p-5 border border-neutral-100 shadow-[0_4px_25px_rgba(0,0,0,0.02)] space-y-4">
                  <div className="flex items-center space-x-2">
                    <ShieldAlert size={16} className="text-[#FF8A00]" />
                    <h3 className="text-neutral-900 font-bold text-[15px]">Missing Numbers & Remedies</h3>
                  </div>
                  
                  {missingNumbers.length > 0 ? (
                    <div className="divide-y divide-neutral-100">
                      {missingNumbers.map((num) => {
                        const rem = LOSHU_REMEDIES[num];
                        return (
                          <div key={num} className="py-4 first:pt-0 last:pb-0 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="w-6 h-6 rounded-full bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center text-[12px] font-extrabold">
                                  {num}
                                </span>
                                <span className="text-neutral-800 font-bold text-[13px]">Number {num} missing</span>
                              </div>
                              <span className="text-[10px] bg-neutral-100 text-neutral-600 font-semibold px-2 py-0.5 rounded-full border border-neutral-200/20">
                                {rem.element} Element
                              </span>
                            </div>
                            
                            <p className="text-neutral-600 text-xs leading-normal font-medium pl-8">
                              <span className="text-neutral-400 font-bold uppercase tracking-wider text-[9px] block mb-0.5">Impact</span>
                              {rem.represents}
                            </p>
                            
                            <p className="text-neutral-700 bg-neutral-50/80 p-3 rounded-2xl border border-neutral-100 text-xs leading-relaxed font-semibold pl-4 border-l-3 border-l-[#FF8A00]">
                              <span className="text-[#FF8A00] font-bold uppercase tracking-wider text-[9px] block mb-1">Vedic Remedy</span>
                              {rem.remedy}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-emerald-600 font-bold text-xs bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                      Congratulations! Your grid contains all numbers. You have a fully balanced energy field.
                    </div>
                  )}
                </div>
              </motion.div>
            ) : activeSubTab === 'name' ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Intro Card */}
                <div className="bg-white rounded-[24px] p-5 border border-neutral-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF8A00]/5 rounded-full blur-[30px] pointer-events-none" />
                  <div className="flex items-center space-x-2.5 mb-2">
                    <Sparkles size={16} className="text-[#FF8A00]" />
                    <h3 className="text-neutral-900 font-bold text-[14.5px]">Name Spelling Compatibility</h3>
                  </div>
                  <p className="text-neutral-600 text-[12px] leading-relaxed font-medium">
                    In Chaldean Numerology, letters carry specific vibration frequencies. We analyze your profile's name spelling, compute its total value, and test its compatibility sync against your birth numbers (Moolank & Bhagyank) to ensure maximum success, career flow, and harmony.
                  </p>
                </div>

                {/* Name Character Breakdown Card */}
                <div className="bg-white rounded-[28px] p-6 border border-neutral-100 shadow-[0_4px_25px_rgba(0,0,0,0.02)] space-y-4">
                  <div className="text-neutral-400 text-[10px] font-extrabold tracking-wider uppercase text-center">Chaldean Letter Values</div>
                  
                  {/* Letters row */}
                  <div className="flex flex-wrap gap-1.5 justify-center py-2.5 bg-neutral-50/50 p-3 rounded-2xl border border-neutral-100/60 shadow-inner">
                    {nameLetters.map((l, idx) => (
                      <div key={idx} className={`flex flex-col items-center justify-center min-w-[34px] h-[46px] rounded-xl border ${l.letter === 'Space' ? 'border-dashed border-neutral-200 bg-neutral-50/20' : 'bg-white border-neutral-100 shadow-sm'}`}>
                        <span className="text-[12px] font-extrabold text-neutral-800">{l.letter === 'Space' ? '␣' : l.letter}</span>
                        <span className="text-[10px] font-bold text-[#FF8A00] mt-0.5">{l.letter === 'Space' ? '' : l.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Calculations sum & single digit */}
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                    <div className="flex flex-col">
                      <span className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider">Compound Name Value</span>
                      <span className="text-neutral-800 font-black text-lg mt-0.5">{nameCompoundValue}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="flex flex-col items-end">
                        <span className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider">Destiny Name Number</span>
                        <span className="text-neutral-800 font-black text-lg mt-0.5">{nameSingleDigit}</span>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#FF8A00] to-[#FFB74D] text-white flex items-center justify-center font-black text-lg shadow-[0_3px_8px_rgba(255,138,0,0.15)] ring-2 ring-white">
                        {nameSingleDigit}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compatibility Sync Status Card */}
                <div className="bg-white rounded-[28px] p-5 border border-neutral-100 shadow-[0_4px_25px_rgba(0,0,0,0.02)] space-y-4">
                  <h3 className="text-neutral-900 font-bold text-[15px]">Birth Numbers Alignment</h3>

                  <div className="grid gap-3">
                    {/* Moolank Compatibility */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAFAFA] border border-neutral-100">
                      <div>
                        <div className="text-[13px] font-bold text-neutral-800">Alignment with Moolank ({moolank})</div>
                        <p className="text-[11px] text-neutral-500 font-medium mt-0.5">Controls your daily mindset and behavior.</p>
                      </div>
                      
                      <div>
                        {moolankCompatibility === 'friendly' ? (
                          <span className="text-emerald-600 bg-emerald-50 border border-emerald-100/50 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide">
                            Friendly Sync
                          </span>
                        ) : moolankCompatibility === 'neutral' ? (
                          <span className="text-neutral-500 bg-neutral-100 border border-neutral-200/20 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide">
                            Neutral Sync
                          </span>
                        ) : (
                          <span className="text-rose-500 bg-rose-50 border border-rose-100/50 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide">
                            Incompatible
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bhagyank Compatibility */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAFAFA] border border-neutral-100">
                      <div>
                        <div className="text-[13px] font-bold text-neutral-800">Alignment with Bhagyank ({bhagyank})</div>
                        <p className="text-[11px] text-neutral-500 font-medium mt-0.5">Controls your destiny, assets, and path.</p>
                      </div>
                      
                      <div>
                        {bhagyankCompatibility === 'friendly' ? (
                          <span className="text-emerald-600 bg-emerald-50 border border-emerald-100/50 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide">
                            Friendly Sync
                          </span>
                        ) : bhagyankCompatibility === 'neutral' ? (
                          <span className="text-neutral-500 bg-neutral-100 border border-neutral-200/20 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide">
                            Neutral Sync
                          </span>
                        ) : (
                          <span className="text-rose-500 bg-rose-50 border border-rose-100/50 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide">
                            Incompatible
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {nameInsight && (
                    <div className="mt-4 pt-4 border-t border-neutral-100/60 space-y-2">
                      <div className="text-[#FF8A00] text-[10px] font-extrabold tracking-wider uppercase">{nameInsight.vibration}</div>
                      <h4 className="text-neutral-900 font-[800] text-[14px]">{nameInsight.title}</h4>
                      <p className="text-neutral-600 text-xs leading-relaxed font-medium">{nameInsight.details}</p>
                    </div>
                  )}
                </div>

                {/* Impact & Name Correction Remedies Card */}
                <div className="bg-white rounded-[28px] p-5 border border-neutral-100 shadow-[0_4px_25px_rgba(0,0,0,0.02)] space-y-4">
                  <div className="flex items-center space-x-2">
                    <ShieldAlert size={16} className="text-[#FF8A00]" />
                    <h3 className="text-neutral-900 font-bold text-[15px]">Correction Remedies & Impact</h3>
                  </div>

                  {(moolankCompatibility === 'enemy' || bhagyankCompatibility === 'enemy') ? (
                    <div className="space-y-3.5">
                      <div className="space-y-2.5">
                        <span className="text-rose-700 text-xs font-bold uppercase tracking-wider block">Astrological Conflict Impact</span>
                        
                        {moolankCompatibility === 'enemy' && moolankRelation && (
                          <div className="bg-rose-50/50 border border-rose-100/50 p-3 rounded-xl text-xs leading-relaxed font-semibold">
                            <span className="text-rose-850 font-bold block mb-0.5">Moolank Impact:</span>
                            {moolankRelation.explanation}
                          </div>
                        )}
                        
                        {bhagyankCompatibility === 'enemy' && bhagyankRelation && (
                          <div className="bg-rose-50/50 border border-rose-100/50 p-3 rounded-xl text-xs leading-relaxed font-semibold">
                            <span className="text-rose-850 font-bold block mb-0.5">Bhagyank Impact:</span>
                            {bhagyankRelation.explanation}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2.5 pt-2 border-t border-neutral-100">
                        <span className="text-[#FF8A00] text-[10px] font-extrabold tracking-wider uppercase">Name Correction Remedies</span>
                        
                        <div className="grid gap-2 text-[11px] text-neutral-600 font-semibold leading-relaxed">
                          <div className="flex items-start space-x-2 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                            <span className="text-[#FF8A00] font-bold text-xs">1.</span>
                            <span><strong>Adopt Spelling Correction:</strong> Start using the suggested spelling below on social media profiles, email signature, and business cards. Changing it in legal documents is NOT mandatory.</span>
                          </div>
                          
                          {spellingSuggestions[0] && (
                            <div className="flex items-start space-x-2 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                              <span className="text-[#FF8A00] font-bold text-xs">2.</span>
                              <span>
                                <strong>The 21-Times Ritual:</strong> Write your lucky corrected spelling (e.g. <strong>{spellingSuggestions[0].suggestedName}</strong>) 21 times daily on a paper using a <strong>{LUCKY_PEN_INKS[spellingSuggestions[0].singleDigit] || 'Green Ink'} Pen</strong> to train your subconscious with the friendly vibration.
                              </span>
                            </div>
                          )}
                          
                          {spellingSuggestions[0] && (
                            <div className="flex items-start space-x-2 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                              <span className="text-[#FF8A00] font-bold text-xs">3.</span>
                              <span>
                                <strong>Vedic Mantra Chanting:</strong> To align your name vibration with {PLANET_NAMES[spellingSuggestions[0].singleDigit] || 'Mercury'}, chant the mantra <strong>{PLANET_MANTRAS[spellingSuggestions[0].singleDigit]}</strong> 108 times on Wednesdays or daily.
                              </span>
                            </div>
                          )}
                          
                          <div className="flex items-start space-x-2 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                            <span className="text-[#FF8A00] font-bold text-xs">4.</span>
                            <span><strong>Growth Signature:</strong> Always sign your name in an upward direction at a 45-degree angle. Never put a dot or strike-through line across your signature, as it blocks positive flow.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      <div className="space-y-2.5">
                        <span className="text-emerald-700 text-xs font-bold uppercase tracking-wider block">Astrological Harmony Impact</span>
                        
                        {moolankRelation && (
                          <div className="bg-emerald-50/30 border border-emerald-100/50 p-3 rounded-xl text-xs leading-relaxed font-semibold">
                            <span className="text-emerald-850 font-bold block mb-0.5">Moolank Status:</span>
                            {moolankRelation.explanation}
                          </div>
                        )}
                        
                        {bhagyankRelation && (
                          <div className="bg-emerald-50/30 border border-emerald-100/50 p-3 rounded-xl text-xs leading-relaxed font-semibold">
                            <span className="text-emerald-850 font-bold block mb-0.5">Bhagyank Status:</span>
                            {bhagyankRelation.explanation}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2.5 pt-2 border-t border-neutral-100">
                        <span className="text-emerald-600 text-[10px] font-extrabold tracking-wider uppercase">Vedic Alignment Tips</span>
                        
                        <div className="grid gap-2 text-[11px] text-neutral-600 font-semibold leading-relaxed">
                          <div className="flex items-start space-x-2 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                            <span className="text-[#10B981] font-bold text-xs">1.</span>
                            <span><strong>Maintain Consistency:</strong> Keep using your exact spelling across all platforms. Do not use shortcuts or random abbreviations that might alter the sum.</span>
                          </div>
                          <div className="flex items-start space-x-2 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                            <span className="text-[#10B981] font-bold text-xs">2.</span>
                            <span><strong>Signature Clarity:</strong> Ensure your signature is clearly legible, starts with a strong capital letter, and ends with a smooth upward tail to maintain stability.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Spelling Corrections Recommendations */}
                <div className="bg-white rounded-[28px] p-5 border border-neutral-100 shadow-[0_4px_25px_rgba(0,0,0,0.02)] space-y-4">
                  <div className="flex items-center space-x-2">
                    <Sparkles size={16} className="text-[#FF8A00]" />
                    <h3 className="text-neutral-900 font-bold text-[15px]">Lucky Spelling Adjustments</h3>
                  </div>

                  {(moolankCompatibility === 'friendly' && bhagyankCompatibility === 'friendly') ? (
                    <div className="py-6 text-center text-emerald-600 font-bold text-xs bg-emerald-50/50 rounded-2xl border border-emerald-100/50 px-4">
                      Excellent! Your name spelling is vibrating in perfect sync with your birth numbers.
                    </div>
                  ) : spellingSuggestions.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-neutral-500 text-[11px] font-semibold leading-relaxed">
                        Minor spelling tweaks can shift your name's vibration to a friendly frequency. Consider using these suggestions for profiles, email, or signatures:
                      </p>
                      
                      <div className="grid gap-3 pt-1">
                        {spellingSuggestions.map((sug, idx) => (
                          <div key={idx} className="p-3.5 rounded-2xl bg-[#FFFDF9] border border-[#F5E6D3] flex items-center justify-between hover:border-[#FF8A00]/40 transition-colors">
                            <div>
                              <div className="text-[14px] font-black text-neutral-800 tracking-wide">{sug.suggestedName}</div>
                              <span className="text-[9px] bg-[#FF8A00]/10 text-[#FF8A00] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider mt-1.5 inline-block">
                                {sug.addedLetter}
                              </span>
                            </div>

                            <div className="flex items-center space-x-2 shrink-0">
                              <div className="flex flex-col items-end">
                                <span className="text-neutral-400 text-[9px] font-bold uppercase tracking-wider">New Value</span>
                                <span className="text-neutral-800 font-extrabold text-[12px] mt-0.5">{sug.compoundValue} ({sug.singleDigit})</span>
                              </div>
                              <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center font-black text-xs">
                                ✓
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-neutral-500 font-semibold text-xs bg-neutral-50 rounded-2xl border border-neutral-100">
                      No spelling corrections found. Consult our numerologist for custom spelling charts.
                    </div>
                  )}
                </div>
              </motion.div>
            ) : activeSubTab === 'forecast' ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Intro Card */}
                <div className="bg-white rounded-[24px] p-5 border border-neutral-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF8A00]/5 rounded-full blur-[30px] pointer-events-none" />
                  <div className="flex items-center space-x-2.5 mb-2">
                    <Sparkles size={16} className="text-[#FF8A00]" />
                    <h3 className="text-neutral-900 font-bold text-[14.5px]">Personal Numerology Forecast</h3>
                  </div>
                  <p className="text-neutral-600 text-[12px] leading-relaxed font-medium">
                    Your birth date acts as a permanent blueprint. By overlaying today's transit date, we calculate your personal 9-year, 9-month, and 9-day planetary cycles. These forecast energies guide your daily actions and long-term planning.
                  </p>
                </div>

                {/* Today's Personal Vibe Card */}
                <div className="bg-white rounded-[28px] p-6 border border-neutral-100 shadow-[0_4px_25px_rgba(0,0,0,0.02)] flex flex-col items-center relative overflow-hidden">
                  <div className="text-neutral-400 text-[10px] font-extrabold tracking-wider uppercase mb-1">Today's Personal Day Vibe</div>
                  <div className="text-neutral-500 text-[11px] font-bold mb-4">
                    {today.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>

                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#FF8A00] to-[#FFB74D] text-white flex items-center justify-center font-black text-[36px] shadow-[0_4px_15px_rgba(255,138,0,0.2)] ring-4 ring-amber-50">
                    {personalDay}
                  </div>

                  <div className="text-center mt-3.5 space-y-1">
                    <h4 className="text-neutral-900 font-[850] text-[15px]">{PLANET_NAMES[personalDay] ? `Rule of ${PLANET_NAMES[personalDay]}` : 'Today\'s Number'}</h4>
                    
                    {/* Compatibility pill */}
                    <div className="inline-block mt-1">
                      {personalDayCompatibility === 'friendly' ? (
                        <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide">
                          Auspicious Day
                        </span>
                      ) : personalDayCompatibility === 'neutral' ? (
                        <span className="text-neutral-500 bg-neutral-100 border border-neutral-200/20 px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide">
                          Stable Vibe
                        </span>
                      ) : (
                        <span className="text-rose-500 bg-rose-50 border border-rose-100 px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide">
                          Caution Vibe
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Daily forecast text */}
                  <div className="mt-4 pt-4 border-t border-neutral-100/60 w-full text-center text-xs leading-relaxed font-semibold text-neutral-600">
                    {personalDayCompatibility === 'friendly' ? (
                      <span>The daily transit vibration is highly friendly with your Moolank ({moolank}). Opportunities will flow easily today. Great day for meetings, signing contracts, or initiating important tasks.</span>
                    ) : personalDayCompatibility === 'neutral' ? (
                      <span>Today's transit energy is neutral and stable. Continue with your scheduled tasks. Good day for execution, research, and routine activities.</span>
                    ) : (
                      <span>Today's transit conflicts slightly with your Moolank ({moolank}). Keep your temper in check, avoid making major investments, and focus on patience and planning rather than pushing too hard.</span>
                    )}
                  </div>
                </div>

                {/* Monthly & Yearly Card */}
                <div className="grid gap-4">
                  {/* Personal Month Card */}
                  <div className="bg-white rounded-[24px] p-5 border border-neutral-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)] relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2.5">
                      <div>
                        <span className="text-[#8B5CF6] text-[10px] font-extrabold tracking-wider uppercase">Personal Month Cycle</span>
                        <h4 className="text-neutral-900 font-black text-[16px] mt-0.5">Month Number {personalMonth}</h4>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center font-black text-sm">
                        {personalMonth}
                      </div>
                    </div>
                    
                    {PERSONAL_MONTH_DETAILS[personalMonth] && (
                      <div className="space-y-1.5">
                        <div className="text-neutral-800 font-[800] text-[13px]">{PERSONAL_MONTH_DETAILS[personalMonth].theme}</div>
                        <p className="text-neutral-600 text-xs leading-relaxed font-medium">{PERSONAL_MONTH_DETAILS[personalMonth].advice}</p>
                      </div>
                    )}
                  </div>

                  {/* Personal Year Card */}
                  <div className="bg-white rounded-[24px] p-5 border border-neutral-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)] relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2.5">
                      <div>
                        <span className="text-[#10B981] text-[10px] font-extrabold tracking-wider uppercase">Personal Year Cycle</span>
                        <h4 className="text-neutral-900 font-black text-[16px] mt-0.5">Year Number {personalYear}</h4>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center font-black text-sm">
                        {personalYear}
                      </div>
                    </div>
                    
                    {PERSONAL_YEAR_DETAILS[personalYear] && (
                      <div className="space-y-1.5">
                        <div className="text-neutral-800 font-[800] text-[13px]">{PERSONAL_YEAR_DETAILS[personalYear].theme}</div>
                        <p className="text-neutral-600 text-xs leading-relaxed font-medium">{PERSONAL_YEAR_DETAILS[personalYear].description}</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : null}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {isProfileSwitcherOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 max-w-md mx-auto bg-[#111827]/40 backdrop-blur-[2px] z-50" onClick={() => setIsProfileSwitcherOpen(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-3xl z-50 flex flex-col max-h-[85vh] overflow-hidden shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
              <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-neutral-100 shrink-0">
                <div>
                  <h3 className="text-[17px] font-[850] text-[#111827] tracking-tight">Switch Profile</h3>
                  <p className="text-[11.5px] text-neutral-400 font-semibold mt-0.5">Select a profile for Numerology</p>
                </div>
                <button onClick={() => setIsProfileSwitcherOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-[#111827] transition-colors"><X size={16} strokeWidth={3} /></button>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-3">
                {profiles.map(p => {
                  const isSelected = p.id === selectedProfileId;
                  return (
                    <div key={p.id} onClick={() => { setSelectedProfileId(p.id); setIsProfileSwitcherOpen(false); }} className={`relative w-full rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all border-2 ${isSelected ? 'bg-[#FFFDF9] border-[#FF8A00] shadow-[0_4px_12px_rgba(255,138,0,0.1)]' : 'bg-white border-[#EBE8E0] hover:border-[#FF8A00]/40 shadow-sm'}`}>
                      <div className="flex items-center space-x-3.5">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-[800] text-[18px] shrink-0 ${isSelected ? 'bg-gradient-to-tr from-[#FF8A00] to-[#FFB74D] text-white shadow-sm ring-2 ring-white' : 'bg-neutral-100 text-neutral-500'}`}>{p.name.charAt(0).toUpperCase()}</div>
                        <div>
                          <span className="text-[15px] font-[850] text-[#111827]">{p.name}</span>
                          <div className="flex items-center space-x-1.5 text-neutral-400 text-[11.5px] font-semibold mt-0.5"><span className="capitalize">{p.relation}</span><span>•</span><span>{getProfileDobString(p)}</span></div>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'border-[#FF8A00] bg-[#FF8A00]' : 'border-neutral-300'}`}>{isSelected && <div className="w-2 h-2 bg-white rounded-full" />}</div>
                    </div>
                  );
                })}
              </div>
              <div className="p-5 pt-3 pb-safe border-t border-neutral-100 bg-white shrink-0">
                <button onClick={() => { setIsProfileSwitcherOpen(false); onNavigate('kundli-profile-form', { returnTo: 'numerology', mode: 'kundli', profileId: selectedProfileId }); }} className="w-full flex items-center justify-center space-x-2 h-12 rounded-2xl bg-neutral-100 text-[#111827] font-extrabold text-[13px] hover:bg-neutral-200 transition-colors"><Plus size={16} strokeWidth={3} /><span>Add New Profile</span></button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
