import { Astrologer, ChatThread } from './types';

export const LOGO_URL = "https://i.ibb.co/20ZwLw81/Whats-App-Image-2026-07-15-at-4-22-23-PM-removebg-preview.png";

export const DUMMY_BANNERS = [
  "https://images.unsplash.com/photo-1534067783941-51c9c23ecefd?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1515942400420-2b98fed1f515?w=800&auto=format&fit=crop&q=80",
];

export const ASTROLOGERS: Astrologer[] = [
  {
    id: '1',
    name: 'Astro Rahul',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
    experience: '10 Years',
    languages: ['English', 'Hindi'],
    skills: ['Vedic', 'Tarot', 'Career', 'Marriage'],
    rating: 4.9,
    consultations: 15400,
    pricePerMinute: 25,
    isOnline: true,
    about: 'Expert in Vedic Astrology and Tarot card reading with over 10 years of experience helping people find their path.'
  },
  {
    id: '2',
    name: 'Tarot Priya',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
    experience: '6 Years',
    languages: ['English', 'Marathi'],
    skills: ['Tarot', 'Numerology', 'Love', 'Marriage'],
    rating: 4.8,
    consultations: 8200,
    pricePerMinute: 15,
    isOnline: true,
    about: 'Intuitive Tarot reader and numerologist.'
  },
  {
    id: '3',
    name: 'Pandit Sharma',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
    experience: '25 Years',
    languages: ['Hindi', 'Sanskrit'],
    skills: ['Vedic', 'Vastu', 'Vishnu Sahasranama', 'Career'],
    rating: 4.95,
    consultations: 45000,
    pricePerMinute: 50,
    isOnline: false,
    about: 'Renowned Vedic astrologer and Vastu expert.'
  }
];

export const CHAT_THREADS: ChatThread[] = [
  {
    id: 'c1',
    astrologerId: '1',
    lastMessage: 'Your sun sign indicates a favorable time for career growth.',
    unreadCount: 2,
    timestamp: '10:45 AM'
  },
  {
    id: 'c2',
    astrologerId: '2',
    lastMessage: 'Let me pull one more card for you.',
    unreadCount: 0,
    timestamp: 'Yesterday'
  }
];
