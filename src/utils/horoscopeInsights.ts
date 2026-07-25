export const generateDailyInsights = (sign: string, dateStr: string) => {
  // Simple deterministic hash based on sign and date
  const str = `${sign}-${dateStr}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  
  // PRNG function based on hash
  const random = (min: number, max: number, offset: number) => {
    const seed = Math.abs(hash + offset);
    const x = Math.sin(seed) * 10000;
    const rand = x - Math.floor(x);
    return Math.floor(rand * (max - min + 1)) + min;
  };

  const categories = ['Personal', 'Professional', 'Health', 'Emotion', 'Travel', 'Luck'] as const;
  
  const explanations = {
    Personal: [
      "A great day to connect with loved ones and strengthen bonds.",
      "Focus on self-care and your inner peace today.",
      "Your charm is high; social interactions will be very rewarding.",
      "Take some time alone to reflect on your personal goals."
    ],
    Professional: [
      "Your hard work is getting noticed. Keep pushing forward.",
      "A good day for networking and exploring new career paths.",
      "Stay focused; minor challenges at work can be easily overcome.",
      "Creative ideas will flow naturally in your workspace today."
    ],
    Health: [
      "Your energy levels are stable. Maintain your routine.",
      "Consider starting a new wellness habit or light exercise.",
      "Pay attention to your diet today for better vitality.",
      "Rest is just as important as activity; don't overexert yourself."
    ],
    Emotion: [
      "You are feeling balanced and grounded today.",
      "Express your feelings; someone close to you needs to hear them.",
      "Don't let small annoyances disturb your inner calm.",
      "Your intuition is strong right now, trust your gut feelings."
    ],
    Travel: [
      "A short trip could bring unexpected joy and relaxation.",
      "If traveling, plan carefully to avoid minor delays.",
      "Perfect day to explore a new place in your own city.",
      "Stay put today; comfort is found at home."
    ],
    Luck: [
      "Fortune favors the bold today. Take a calculated risk.",
      "Your lucky stars are aligned for financial gains.",
      "Serendipity is at play; expect a pleasant surprise.",
      "Luck is moderate; rely on your skills rather than chance."
    ]
  };

  return categories.map((cat, i) => ({
    name: cat,
    score: random(65, 98, i),
    text: explanations[cat][random(0, 3, i + 10)]
  }));
};
