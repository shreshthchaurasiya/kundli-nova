import { GoogleGenAI } from '@google/genai';
import { KundliNovaDailyHoroscope, ZodiacSign, ZODIAC_SIGNS } from '../types/astrologyProvider';
import { ProviderError } from '../errors/ProviderError';

export class GeminiHoroscopeProvider {
  private ai: any;

  private getAi() {
    const apiKey = process.env.GEMINI_HOROSCOPE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("No Gemini API key is set in the environment variables!");
    }
    return new GoogleGenAI({ apiKey });
  }

  public async getDailyHoroscope(
    zodiac: ZodiacSign,
    dateContext?: string
  ): Promise<KundliNovaDailyHoroscope> {
    if (!ZODIAC_SIGNS.includes(zodiac)) {
      throw new ProviderError('gemini', 'PROVIDER_BAD_RESPONSE', `Invalid zodiac sign: ${zodiac}`, 400);
    }

    const date = dateContext || new Date().toISOString().split('T')[0];
    
    const prompt = `You are an expert Vedic astrologer creating a highly detailed daily horoscope for the zodiac sign ${zodiac.toUpperCase()} specifically for the exact date: ${date}.
    Your audience is users of the Kundli Nova app, who appreciate deep, insightful, and comprehensive astrological guidance.
    
    IMPORTANT RULES:
    1. The language must be professional, deeply encouraging, and completely family-friendly.
    2. STRICTLY PROHIBITED WORDS: Do NOT use any words related to sex, sexuality, intercourse, physical intimacy, or similar concepts. Focus purely on emotional romance, deep connection, mutual understanding, and friendship instead.
    3. BE UNIQUE & SPECIFIC: The predictions MUST be completely unique and distinct for ${date}. Do not repeat generic advice. Mention the specific day's planetary transits (e.g., Moon transiting a specific house) to ensure authenticity.
    4. BE DETAILED: Each category should be a rich paragraph (at least 4 to 5 sentences). Provide in-depth guidance and give actionable advice.
    5. Output the result ONLY as a raw JSON object (without markdown blocks like \`\`\`json) matching exactly this schema:
    {
      "overview": "A comprehensive 4-5 sentence overview of the overall energy and theme of the day.",
      "personal": "A detailed 4-5 sentence prediction regarding personal life, romantic relationships, and family.",
      "profession": "A detailed 4-5 sentence prediction regarding career progression, workplace dynamics, and financial decisions.",
      "health": "A detailed 4-5 sentence prediction regarding physical vitality, mental peace, and wellness routines.",
      "travel": "A detailed 3-4 sentence prediction regarding travel, commuting, or movement.",
      "emotions": "A detailed 4-5 sentence prediction regarding emotional state, inner feelings, and psychological well-being.",
      "luck": "A detailed 3-4 sentence prediction regarding lucky numbers, colors, timings, and general fortune."
    }`;

    const generateWithRetry = async (retries = 3): Promise<any> => {
      try {
        return await this.ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: prompt,
          config: {
            temperature: 0.7,
          }
        });
      } catch (err: any) {
        if (retries > 0) {
          console.warn(`Gemini API error, retrying... (${retries} left):`, err.message);
          await new Promise(resolve => setTimeout(resolve, 1500));
          return generateWithRetry(retries - 1);
        }
        throw err;
      }
    };

    try {
      const response = await generateWithRetry(3);

      if (!response.text) {
        throw new Error("Empty response from Gemini");
      }

      let cleanText = response.text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '').trim();
      }

      const data = JSON.parse(cleanText);

      return {
        schemaVersion: '1.0',
        provider: 'gemini',
        providerVersion: 'v1',
        zodiacSign: zodiac,
        period: 'today',
        date: date,
        overview: data.overview || "Today brings a mix of positive energies. Stay focused on your goals.",
        categories: {
          personal: data.personal,
          profession: data.profession,
          health: data.health,
          travel: data.travel,
          emotions: data.emotions,
          luck: data.luck
        },
        generatedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      console.error("Gemini Horoscope Provider Error:", err);
      throw new ProviderError('gemini', 'PROVIDER_UNAVAILABLE', `Failed to generate horoscope: ${err.message}`, 503);
    }
  }
}
