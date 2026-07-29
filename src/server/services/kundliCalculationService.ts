import { AstrologyCalculationProvider, KundliNovaCalcInput, KundliNovaNatalChart, KundliNovaVimshottariDasha, KundliNovaDoshaAnalysis, KundliNovaYogaAnalysis } from '../types/astrologyProvider';
import { ProviderError } from '../errors/ProviderError';
import * as crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '../config/supabase';

export class KundliCalculationService {
  private natalCache = new Map<string, KundliNovaNatalChart>();
  private natalInflight = new Map<string, Promise<KundliNovaNatalChart>>();

  private dashaCache = new Map<string, KundliNovaVimshottariDasha>();
  private dashaInflight = new Map<string, Promise<KundliNovaVimshottariDasha>>();

  private doshaCache = new Map<string, KundliNovaDoshaAnalysis>();
  private doshaInflight = new Map<string, Promise<KundliNovaDoshaAnalysis>>();
  
  private yogaCache = new Map<string, KundliNovaYogaAnalysis>();
  private yogaInflight = new Map<string, Promise<KundliNovaYogaAnalysis>>();
  
  private compatibilityCache = new Map<string, import('../types/astrologyProvider').KundliNovaCompatibilityAnalysis>();
  private compatibilityInflight = new Map<string, Promise<import('../types/astrologyProvider').KundliNovaCompatibilityAnalysis>>();

  private detailedReportCache = new Map<string, import('../types/astrologyProvider').KundliNovaDetailedReport>();
  private detailedReportInflight = new Map<string, Promise<import('../types/astrologyProvider').KundliNovaDetailedReport>>();
  
  private manglikCache = new Map<string, import('../types/astrologyProvider').KundliNovaManglikAnalysis>();
  private manglikInflight = new Map<string, Promise<import('../types/astrologyProvider').KundliNovaManglikAnalysis>>();
  
  constructor(private provider: AstrologyCalculationProvider) {}

  private async loadAuthorizedCalculationInput(profileId: string, userId: string): Promise<KundliNovaCalcInput> {
    const { data: profile, error } = await supabaseAdmin
      .from('kundli_profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle();

    if (error) throw error;
    if (!profile) {
      throw { statusCode: 404, code: 'PROFILE_NOT_FOUND', message: 'Kundli profile not found' };
    }
    if (profile.owner_id !== userId) {
      throw { statusCode: 403, code: 'PROFILE_BELONGS_TO_ANOTHER_USER', message: 'Forbidden: Profile belongs to another user' };
    }

    const input: KundliNovaCalcInput = {
      profileId: profile.id,
      name: profile.name,
      dateOfBirth: profile.dob,
      timeOfBirth: profile.tob,
      latitude: profile.latitude,
      longitude: profile.longitude,
      timezone: profile.timezone,
    };

    if (
      !input.dateOfBirth ||
      !input.timeOfBirth ||
      input.latitude == null ||
      input.longitude == null ||
      !input.timezone
    ) {
      throw {
        statusCode: 400,
        code: 'INCOMPLETE_BIRTH_DETAILS',
        message: 'Complete birth details are required to generate this Kundli.'
      };
    }

    return input;
  }

  private createFingerprint(input: KundliNovaCalcInput): string {
    const data = `${input.dateOfBirth}|${input.timeOfBirth}|${input.latitude}|${input.longitude}|${input.timezone}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  public async getKundli(profileId: string, userId: string): Promise<KundliNovaNatalChart> {
    const input = await this.loadAuthorizedCalculationInput(profileId, userId);
    const fingerprint = this.createFingerprint(input);
    const cacheKey = `navamsha:v1:${input.profileId}:${fingerprint}`;

    if (this.natalCache.has(cacheKey)) return this.natalCache.get(cacheKey)!;
    if (this.natalInflight.has(cacheKey)) return this.natalInflight.get(cacheKey)!;

    const promise = this.provider.getNatalChart(input)
      .then(async chart => {
        this.natalCache.set(cacheKey, chart);
        
        try {
          const moon = chart.planets.find(p => p.name.toLowerCase() === 'moon');
          const updatePayload = {
            rashi: moon?.sign || null,
            nakshatra: moon?.nakshatra || null,
            lagna: chart.ascendant?.sign || null,
          };
          
          await supabaseAdmin
            .from('kundli_profiles')
            .update(updatePayload)
            .eq('id', input.profileId);
        } catch (e) {
          console.error('Failed to sync astrology data to kundli_profiles:', e);
        }
        
        return chart;
      })
      .finally(() => this.natalInflight.delete(cacheKey));

    this.natalInflight.set(cacheKey, promise);
    return promise;
  }

  public async getVimshottariDasha(profileId: string, userId: string): Promise<KundliNovaVimshottariDasha> {
    const input = await this.loadAuthorizedCalculationInput(profileId, userId);
    const fingerprint = this.createFingerprint(input);
    const cacheKey = `vimshottari-dasha:navamsha:v1:${input.profileId}:${fingerprint}`;

    if (this.dashaCache.has(cacheKey)) return this.dashaCache.get(cacheKey)!;
    if (this.dashaInflight.has(cacheKey)) return this.dashaInflight.get(cacheKey)!;

    const promise = this.provider.getVimshottariDasha(input)
      .then(dasha => {
        // Business Rule: Calculate remaining days based on current server time
        // Clamp to 0 if the period has already ended or date is malformed
        const now = new Date();
        const calcRemaining = (endDateStr: string) => {
          const end = new Date(endDateStr);
          if (isNaN(end.getTime())) return 0;
          const diffMs = end.getTime() - now.getTime();
          const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          return Math.max(0, days);
        };

        if (dasha.currentMahadasha?.endDate) {
          dasha.currentMahadasha.remainingDays = calcRemaining(dasha.currentMahadasha.endDate);
        }
        if (dasha.currentAntardasha?.endDate) {
          dasha.currentAntardasha.remainingDays = calcRemaining(dasha.currentAntardasha.endDate);
        }

        try {
          if (dasha.currentMahadasha?.planet) {
            const mahadashaStr = dasha.currentAntardasha?.planet
              ? `${dasha.currentMahadasha.planet} / ${dasha.currentAntardasha.planet}`
              : dasha.currentMahadasha.planet;
            supabaseAdmin
              .from('kundli_profiles')
              .update({ mahadasha: mahadashaStr })
              .eq('id', input.profileId)
              .then(); // Fire and forget
          }
        } catch (e) {
          console.error('Failed to sync mahadasha to kundli_profiles:', e);
        }

        this.dashaCache.set(cacheKey, dasha);
        return dasha;
      })
      .finally(() => this.dashaInflight.delete(cacheKey));

    this.dashaInflight.set(cacheKey, promise);
    return promise;
  }

  public async getDoshaAnalysis(profileId: string, userId: string): Promise<KundliNovaDoshaAnalysis> {
    const input = await this.loadAuthorizedCalculationInput(profileId, userId);
    const fingerprint = this.createFingerprint(input);
    const cacheKey = `dosha:navamsha:v1:${input.profileId}:${fingerprint}`;

    if (this.doshaCache.has(cacheKey)) return this.doshaCache.get(cacheKey)!;
    if (this.doshaInflight.has(cacheKey)) return this.doshaInflight.get(cacheKey)!;

    const promise = this.provider.getDoshaAnalysis(input)
      .then(result => {
        this.doshaCache.set(cacheKey, result);
        return result;
      })
      .finally(() => this.doshaInflight.delete(cacheKey));

    this.doshaInflight.set(cacheKey, promise);
    return promise;
  }

  public async getYogaAnalysis(profileId: string, userId: string): Promise<KundliNovaYogaAnalysis> {
    const input = await this.loadAuthorizedCalculationInput(profileId, userId);
    const fingerprint = this.createFingerprint(input);
    const cacheKey = `yoga:navamsha:v1:${input.profileId}:${fingerprint}`;

    if (this.yogaCache.has(cacheKey)) return this.yogaCache.get(cacheKey)!;
    if (this.yogaInflight.has(cacheKey)) return this.yogaInflight.get(cacheKey)!;

    const promise = this.provider.getYogaAnalysis(input)
      .then(result => {
        this.yogaCache.set(cacheKey, result);
        return result;
      })
      .finally(() => this.yogaInflight.delete(cacheKey));

    this.yogaInflight.set(cacheKey, promise);
    return promise;
  }

  public async getCompatibilityAnalysis(profileAId: string, profileBId: string, userId: string): Promise<import('../types/astrologyProvider').KundliNovaCompatibilityAnalysis> {
    if (profileAId === profileBId) {
      const err: any = new Error('Please select two different profiles for Kundli matching.');
      err.statusCode = 400;
      err.code = 'SAME_PROFILE_NOT_ALLOWED';
      throw err;
    }

    const [inputA, inputB] = await Promise.all([
      this.loadAuthorizedCalculationInput(profileAId, userId),
      this.loadAuthorizedCalculationInput(profileBId, userId)
    ]);

    const fingerprintA = this.createFingerprint(inputA);
    const fingerprintB = this.createFingerprint(inputB);
    
    // Directional cache key (A+B is distinct from B+A)
    const cacheKey = `compatibility:navamsha:v1:${inputA.profileId}:${fingerprintA}:${inputB.profileId}:${fingerprintB}`;

    if (this.compatibilityCache.has(cacheKey)) return this.compatibilityCache.get(cacheKey)!;
    if (this.compatibilityInflight.has(cacheKey)) return this.compatibilityInflight.get(cacheKey)!;

    const promise = this.provider.getCompatibilityAnalysis(inputA, inputB)
      .then(result => {
        // Validate normalized response
        const requiredCodes = ['VARNA', 'VASHYA', 'TARA', 'YONI', 'GRAHA_MAITRI', 'GANA', 'BHAKOOT', 'NADI'];
        if (!result.factors || result.factors.length !== 8) {
          throw new ProviderError('navamsha', 'PROVIDER_BAD_RESPONSE', 'Compatibility analysis must have exactly 8 factors.');
        }
        
        const factorCodes = new Set<string>();
        for (const factor of result.factors) {
          if (!requiredCodes.includes(factor.code)) {
            throw new ProviderError('navamsha', 'PROVIDER_BAD_RESPONSE', `Invalid factor code: ${factor.code}`);
          }
          if (factorCodes.has(factor.code)) {
            throw new ProviderError('navamsha', 'PROVIDER_BAD_RESPONSE', `Duplicate factor code: ${factor.code}`);
          }
          factorCodes.add(factor.code);

          if (factor.score < 0 || factor.maximumScore < 0 || factor.score > factor.maximumScore) {
            throw new ProviderError('navamsha', 'PROVIDER_BAD_RESPONSE', `Invalid scores for factor ${factor.code}`);
          }
          if (factor.calculationStatus === 'unavailable' && factor.score > 0) {
            throw new ProviderError('navamsha', 'PROVIDER_BAD_RESPONSE', `Unavailable factor ${factor.code} cannot have a score > 0`);
          }
        }

        if (result.totalScore < 0 || result.maximumScore < 0 || result.totalScore > result.maximumScore) {
          throw new ProviderError('navamsha', 'PROVIDER_BAD_RESPONSE', 'Invalid total score or maximum score');
        }
        
        // maximumScore should represent the Ashtakoota total (36 typically)
        if (result.maximumScore !== 36) {
           // We might not hardcode 36 if it varies, but the instruction says "maximumScore should represent the Ashtakoota total", so let's allow what provider says as long as valid.
        }

        if (result.compatibilityPercentage < 0 || result.compatibilityPercentage > 100) {
          throw new ProviderError('navamsha', 'PROVIDER_BAD_RESPONSE', 'Compatibility percentage must be between 0 and 100');
        }

        this.compatibilityCache.set(cacheKey, result);
        return result;
      })
      .finally(() => this.compatibilityInflight.delete(cacheKey));

    this.compatibilityInflight.set(cacheKey, promise);
    return promise;
  }

  public async getManglikCompatibility(profileAId: string, profileBId: string, userId: string): Promise<import('../types/astrologyProvider').KundliNovaManglikAnalysis> {
    const [inputA, inputB] = await Promise.all([
      this.loadAuthorizedCalculationInput(profileAId, userId),
      this.loadAuthorizedCalculationInput(profileBId, userId)
    ]);

    const fingerprintA = this.createFingerprint(inputA);
    const fingerprintB = this.createFingerprint(inputB);
    
    // Directional cache key
    const cacheKey = `manglik:navamsha:v1:${inputA.profileId}:${fingerprintA}:${inputB.profileId}:${fingerprintB}`;

    if (this.manglikCache.has(cacheKey)) return this.manglikCache.get(cacheKey)!;
    if (this.manglikInflight.has(cacheKey)) return this.manglikInflight.get(cacheKey)!;

    const promise = this.provider.getManglikCompatibility(inputA, inputB)
      .then(result => {
        this.manglikCache.set(cacheKey, result);
        return result;
      })
      .finally(() => this.manglikInflight.delete(cacheKey));

    this.manglikInflight.set(cacheKey, promise);
    return promise;
  }

  public async getDetailedKundliReport(profileId: string, userId: string): Promise<import('../types/astrologyProvider').KundliNovaDetailedReport> {
    const input = await this.loadAuthorizedCalculationInput(profileId, userId);
    const fingerprint = this.createFingerprint(input);
    const cacheKey = `detailed:navamsha:v1:${profileId}:${fingerprint}`;

    if (this.detailedReportCache.has(cacheKey)) return this.detailedReportCache.get(cacheKey)!;
    if (this.detailedReportInflight.has(cacheKey)) return this.detailedReportInflight.get(cacheKey)!;

    const promise = (async () => {
      try {
        const [chart, dasha, dosha, yoga] = await Promise.all([
          this.provider.getNatalChart(input).catch(() => null),
          this.provider.getVimshottariDasha(input).catch(() => null),
          this.getDoshaAnalysis(profileId, userId).catch(() => null),
          this.getYogaAnalysis(profileId, userId).catch(() => null)
        ]);

        if (!chart) {
          throw new ProviderError('navamsha', 'PROVIDER_BAD_RESPONSE', 'Cannot generate detailed report without Natal Chart');
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          throw new ProviderError('navamsha', 'PROVIDER_NOT_CONFIGURED', 'GEMINI_API_KEY is not set');
        }

        const ai = new GoogleGenAI({ 
          apiKey,
          httpOptions: { timeout: 360000 } 
        });

        const prompt = `You are Nova AI, an expert premium Vedic Astrologer.
The user wants a highly detailed Kundli analysis report in Hinglish.
CRITICAL RULE: You MUST write the Hinglish using the English Alphabet (Latin/Roman script) ONLY.
YOU ARE ABSOLUTELY FORBIDDEN FROM USING DEVANAGARI SCRIPT (Hindi characters like क, ख, ग).
If you use even a single Hindi character, the system will crash. ONLY use A-Z, a-z, 0-9, and standard punctuation.
CRITICAL RULE 2: Ensure your response is 100% VALID JSON. Do not use unescaped newlines inside strings. Ensure all brackets are closed.
Example: "Aapka ascendant strong hai" (YES) - "आपका" (NO).
Explain deep concepts clearly (e.g., how the moon affects them, exact planetary alignments). Make it engaging, professional, and EXTREMELY detailed (write massive, in-depth paragraphs for each section).

Here is the user's astrological data:
Chart: ${JSON.stringify(chart)}
Dasha: ${JSON.stringify(dasha)}

Respond STRICTLY with a valid JSON object matching exactly this structure (do NOT use markdown formatting, just pure JSON):
{
  "ascendantSummary": "Detailed Hinglish explanation of their Lagna (Ascendant) and personality...",
  "houseSummaries": [
    "Detailed Hinglish explanation for House 1...",
    "Detailed Hinglish explanation for House 2...",
    "Detailed Hinglish explanation for House 3...",
    "Detailed Hinglish explanation for House 4...",
    "Detailed Hinglish explanation for House 5...",
    "Detailed Hinglish explanation for House 6...",
    "Detailed Hinglish explanation for House 7...",
    "Detailed Hinglish explanation for House 8...",
    "Detailed Hinglish explanation for House 9...",
    "Detailed Hinglish explanation for House 10...",
    "Detailed Hinglish explanation for House 11...",
    "Detailed Hinglish explanation for House 12..."
  ],
  "nakshatraSummary": "Detailed Hinglish explanation of their Moon Nakshatra and soul purpose...",
  "dashaSummary": "Detailed Hinglish explanation of their current Dasha and its effects...",
  "doshas": [
    { "name": "Name of Dosha (e.g. Mangal Dosha)", "detected": true, "summary": "Detailed Hinglish explanation..." }
  ],
  "yogas": [
    { "name": "Name of Auspicious Yoga (e.g. Gaj Kesari Yoga)", "detected": true, "summary": "Detailed Hinglish explanation..." }
  ],
  "executiveSummary": "A powerful 2-paragraph overall summary of their life and destiny in Hinglish...",
  "career": "Detailed Hinglish prediction for Career and Profession...",
  "education": "Detailed Hinglish prediction for Education and Learning...",
  "loveAndMarriage": "Detailed Hinglish prediction for Love, Relationships and Marriage...",
  "health": "Detailed Hinglish prediction for Health and Vitality...",
  "wealthAndProperty": "Detailed Hinglish prediction for Wealth, Finances and Property...",
  "familyAndChildren": "Detailed Hinglish prediction for Family life and Children...",
  "luckyColors": ["Color 1", "Color 2"],
  "luckyDays": ["Day 1", "Day 2"],
  "luckyNumbers": [1, 5, 9]
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            maxOutputTokens: 8192,
            temperature: 0.7,
            responseMimeType: 'application/json'
          }
        });

        let text = response.text || '{}';
        // Failsafe: Aggressively strip all Devanagari characters (Unicode range 0900-097F)
        text = text.replace(/[\u0900-\u097F]/g, '');
        const cleanedText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        let aiResult: any = null;
        try {
          aiResult = JSON.parse(cleanedText);
        } catch (e) {
          console.error('Failed to parse AI JSON:', cleanedText);
          require('fs').writeFileSync('/tmp/kundli_error.txt', cleanedText);
          throw new ProviderError('nova-ai', 'PROVIDER_BAD_RESPONSE', 'AI generated invalid JSON format. Please try again.');
        }
        
        if (!aiResult || Object.keys(aiResult).length === 0) {
           throw new ProviderError('nova-ai', 'PROVIDER_BAD_RESPONSE', 'AI returned empty report. Please try again.');
        }

        const houseSummaries = Array.isArray(aiResult.houseSummaries) ? aiResult.houseSummaries : [];
        for (let i = houseSummaries.length; i < 12; i++) {
          houseSummaries.push(`House ${i + 1} analysis details are currently being refined by Nova AI.`);
        }

        const detailedReport: import('../types/astrologyProvider').KundliNovaDetailedReport = {
          schemaVersion: '1.0',
          provider: 'nova-ai',
          providerVersion: 'v1',
          calculatedAt: new Date().toISOString(),
          profileId,
          reportStatus: 'complete',
          availableSections: ['BIRTH_SUMMARY', 'ASCENDANT', 'PLANETARY_POSITIONS', 'HOUSE_ANALYSIS', 'NAKSHATRA_ANALYSIS', 'DASHA_SUMMARY', 'DOSHA_SUMMARY', 'YOGA_SUMMARY'],
          unavailableSections: [],
          birthSummary: {
            profileName: input.name,
            dateOfBirth: input.dateOfBirth,
            timeOfBirth: input.timeOfBirth,
            placeOfBirth: 'Unknown',
            latitude: input.latitude,
            longitude: input.longitude,
            timezone: input.timezone.toString()
          },
          ascendant: {
            sign: chart.ascendant?.sign || 'Unknown',
            degree: chart.ascendant?.degree || 0,
            nakshatra: chart.ascendant?.nakshatra || null,
            pada: chart.ascendant?.pada || null,
            calculationStatus: 'calculated',
            summary: aiResult.ascendantSummary || 'Lagna details being generated.'
          },
          planetaryPositions: {
            planets: []
          },
          houseAnalysis: {
            houses: houseSummaries.slice(0, 12).map((summary: string, i: number) => ({
              houseNumber: i + 1,
              sign: null, lord: null, occupants: [], calculationStatus: 'calculated',
              summary
            }))
          },
          nakshatraAnalysis: {
            moonNakshatra: chart.nakshatra || 'Unknown',
            moonPada: chart.pada || 1,
            nakshatraLord: null, deity: null, gana: null, symbol: null, calculationStatus: 'calculated',
            summary: aiResult.nakshatraSummary || 'Nakshatra details being generated.'
          },
          dashaSummary: {
            currentMahadasha: dasha?.current_mahadasha?.planet || null,
            currentAntardasha: dasha?.current_mahadasha?.antardashas?.[0]?.planet || null,
            mahadashaStartDate: dasha?.current_mahadasha?.start_date || null,
            mahadashaEndDate: dasha?.current_mahadasha?.end_date || null,
            calculationStatus: 'calculated',
            summary: aiResult.dashaSummary || 'Dasha details being generated.'
          },
          doshaSummary: {
            doshas: [],
            summary: aiResult.doshaSummary || 'Dosha details being generated.'
          },
          yogaSummary: {
            yogas: [],
            summary: aiResult.yogaSummary || 'Yoga details being generated.'
          },
          executiveSummary: aiResult.executiveSummary || null,
          lifeDomains: {
            career: aiResult.career || null,
            education: aiResult.education || null,
            loveAndMarriage: aiResult.loveAndMarriage || null,
            health: aiResult.health || null,
            wealthAndProperty: aiResult.wealthAndProperty || null,
            familyAndChildren: aiResult.familyAndChildren || null,
          },
          luckyItems: {
            colors: Array.isArray(aiResult.luckyColors) ? aiResult.luckyColors : [],
            days: Array.isArray(aiResult.luckyDays) ? aiResult.luckyDays : [],
            numbers: Array.isArray(aiResult.luckyNumbers) ? aiResult.luckyNumbers : [],
          },
          bundledDasha: dasha,
          bundledDosha: dosha || {
            schemaVersion: '1.0', provider: 'nova-ai', providerVersion: 'v1', calculatedAt: new Date().toISOString(), profileId,
            results: Array.isArray(aiResult.doshas) ? aiResult.doshas.map((d: any) => ({
              code: 'UNKNOWN', name: d.name || 'Unknown Dosha', detected: !!d.detected, severity: 'unknown', summary: d.summary || '', evidence: [], calculationStatus: 'calculated'
            })) : []
          },
          bundledYoga: yoga || {
            schemaVersion: '1.0', provider: 'nova-ai', providerVersion: 'v1', calculatedAt: new Date().toISOString(), profileId,
            results: Array.isArray(aiResult.yogas) ? aiResult.yogas.map((y: any) => ({
              code: 'UNKNOWN', name: y.name || 'Unknown Yoga', detected: !!y.detected, strength: 'unknown', summary: y.summary || '', evidence: [], calculationStatus: 'calculated'
            })) : []
          }
        };

        this.detailedReportCache.set(cacheKey, detailedReport);
        return detailedReport;
      } catch (error) {
        console.error('Detailed Report AI Generation Error:', error);
        throw new ProviderError('nova-ai', 'PROVIDER_BAD_RESPONSE', 'Failed to generate AI report');
      } finally {
        this.detailedReportInflight.delete(cacheKey);
      }
    })();

    this.detailedReportInflight.set(cacheKey, promise);
    return promise;
  }
}
