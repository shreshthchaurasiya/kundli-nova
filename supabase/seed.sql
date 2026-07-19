-- Seed Mock Astrologers for Kundli Nova

INSERT INTO public.astrologers (id, name, image, experience, languages, skills, rating, consultations, price_per_minute, status, about)
VALUES 
(
  '11111111-1111-1111-1111-111111111111', 
  'Astro Rahul', 
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
  '10 Years',
  ARRAY['English', 'Hindi'],
  ARRAY['Vedic', 'Tarot', 'Career', 'Marriage'],
  4.9,
  15400,
  25.00,
  'ONLINE',
  'Expert in Vedic Astrology and Tarot card reading with over 10 years of experience helping people find their path.'
),
(
  '22222222-2222-2222-2222-222222222222',
  'Tarot Priya',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
  '6 Years',
  ARRAY['English', 'Marathi'],
  ARRAY['Tarot', 'Numerology', 'Love', 'Marriage'],
  4.8,
  8200,
  15.00,
  'ONLINE',
  'Intuitive Tarot reader and numerologist.'
),
(
  '33333333-3333-3333-3333-333333333333',
  'Pandit Sharma',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
  '25 Years',
  ARRAY['Hindi', 'Sanskrit'],
  ARRAY['Vedic', 'Vastu', 'Vishnu Sahasranama', 'Career'],
  4.95,
  45000,
  50.00,
  'OFFLINE',
  'Renowned Vedic astrologer and Vastu expert.'
)
ON CONFLICT (id) DO NOTHING;
