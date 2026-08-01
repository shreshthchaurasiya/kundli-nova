import { supabaseAdmin } from '../../config/supabase';
import { KundliCalculationService } from '../kundliCalculationService';
import { NumerologyService } from '../numerologyService';
import { DailyInsightsService } from '../dailyInsightsService';
import { Type, FunctionDeclaration } from '@google/genai';

export class NovaAIToolRegistry {
  private numerologyService = new NumerologyService();
  private dailyInsightsService = new DailyInsightsService();

  constructor(private kundliService: KundliCalculationService) {}

  public getToolDeclarations(): FunctionDeclaration[] {
    return [
      {
        name: 'get_user_dashboard',
        description: 'Retrieves the user\'s wallet balance, active AI subscription status, and a list of all their saved astrology profiles (self, partner, family members). Call this to understand the user\'s current state in the app.',
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      {
        name: 'get_kundli_summary',
        description: 'Retrieves the basic Kundli summary (Rashi, Nakshatra, Ascendant) for a specific profile ID.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            profileId: {
              type: Type.STRING,
              description: 'The UUID of the profile to fetch data for. You can get this from get_user_dashboard().',
            },
          },
          required: ['profileId'],
        },
      },
      {
        name: 'get_dasha_analysis',
        description: 'Retrieves the current Mahadasha and Antardasha for a specific profile ID to predict timing of life events.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            profileId: {
              type: Type.STRING,
              description: 'The UUID of the profile.',
            },
          },
          required: ['profileId'],
        },
      },
      {
        name: 'get_dosha_analysis',
        description: 'Retrieves Dosha details (Manglik, Kalsarp, Sadhesati) for a specific profile ID.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            profileId: {
              type: Type.STRING,
              description: 'The UUID of the profile.',
            },
          },
          required: ['profileId'],
        },
      },
      {
        name: 'get_daily_transit',
        description: 'Retrieves the current daily astrological transits (Gochar) for a profile. Used to make daily predictions.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            profileId: {
              type: Type.STRING,
              description: 'The UUID of the profile.',
            },
          },
          required: ['profileId'],
        },
      },
      {
        name: 'get_compatibility_score',
        description: 'Retrieves compatibility (Kundli Matching) between two profiles.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            profileAId: {
              type: Type.STRING,
              description: 'The UUID of the first profile.',
            },
            profileBId: {
              type: Type.STRING,
              description: 'The UUID of the second profile.',
            },
          },
          required: ['profileAId', 'profileBId'],
        },
      },
      {
        name: 'get_numerology_report',
        description: 'Calculates the Mulank (Root Number) and Bhagyank (Destiny Number) for a specific profile ID using their Date of Birth.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            profileId: {
              type: Type.STRING,
              description: 'The UUID of the profile.',
            },
          },
          required: ['profileId'],
        },
      },
      {
        name: 'get_daily_insights',
        description: 'Gets the daily astrological insights (Love, Career, Wealth, Energy) including Panchang impacts (Tithi, Vara) for today.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            profileId: {
              type: Type.STRING,
              description: 'The UUID of the profile.',
            },
          },
          required: ['profileId'],
        },
      },
      {
        name: 'get_full_natal_chart',
        description: 'Retrieves the complete Janam Kundli (Natal Chart) including all planets, their degrees, houses, signs, retrogrades, and lagna for deep astrology analysis.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            profileId: {
              type: Type.STRING,
              description: 'The UUID of the profile.',
            },
          },
          required: ['profileId'],
        },
      }
    ];
  }

  public async executeTool(name: string, args: Record<string, any>, userId: string): Promise<any> {
    try {
      switch (name) {
        case 'get_user_dashboard':
          return await this.getUserDashboard(userId);
        case 'get_kundli_summary':
          return await this.getKundliSummary(args.profileId, userId);
        case 'get_dasha_analysis':
          return await this.getDashaAnalysis(args.profileId, userId);
        case 'get_dosha_analysis':
          return await this.getDoshaAnalysis(args.profileId, userId);
        case 'get_daily_transit':
          return await this.getDailyTransit(args.profileId, userId);
        case 'get_compatibility_score':
          return await this.getCompatibilityScore(args.profileAId, args.profileBId, userId);
        case 'get_numerology_report':
          return await this.getNumerologyReport(args.profileId, userId);
        case 'get_daily_insights':
          return await this.getDailyInsights(args.profileId, userId);
        case 'get_full_natal_chart':
          return await this.getFullNatalChart(args.profileId, userId);
        default:
          throw new Error(`Tool ${name} not found.`);
      }
    } catch (err: any) {
      console.error(`Error executing tool ${name}:`, err);
      return { error: err.message || 'An unknown error occurred while accessing the database.' };
    }
  }

  private async getUserDashboard(userId: string) {
    const [{ data: wallet }, { data: profiles }, { data: subs }] = await Promise.all([
      supabaseAdmin.from('wallets').select('balance').eq('user_id', userId).single(),
      supabaseAdmin.from('kundli_profiles').select('id, name, relation, gender, is_default').eq('owner_id', userId),
      supabaseAdmin.from('subscriptions').select('plan, status, expires_at').eq('user_id', userId).eq('status', 'ACTIVE').maybeSingle()
    ]);

    return {
      walletBalance: wallet?.balance || 0,
      subscription: subs || { plan: 'FREE', status: 'INACTIVE' },
      savedProfiles: profiles || []
    };
  }

  private async getKundliSummary(profileId: string, userId: string) {
    if (!profileId) throw new Error('profileId is required');
    const chart = await this.kundliService.getKundli(profileId, userId);
    return {
      ascendant: chart.ascendant?.sign,
      moonSign: chart.moonSign,
      sunSign: chart.sunSign,
      nakshatra: chart.nakshatra,
      planetaryPositions: chart.planets.map(p => ({ planet: p.name, sign: p.sign, house: p.house, isRetrograde: p.isRetrograde }))
    };
  }

  private async getDashaAnalysis(profileId: string, userId: string) {
    if (!profileId) throw new Error('profileId is required');
    return await this.kundliService.getVimshottariDasha(profileId, userId);
  }

  private async getDoshaAnalysis(profileId: string, userId: string) {
    if (!profileId) throw new Error('profileId is required');
    const dosha = await this.kundliService.getDoshaAnalysis(profileId, userId);
    return {
      detectedDoshas: dosha.results.filter(d => d.detected).map(d => ({
        name: d.name,
        severity: d.severity
      }))
    };
  }

  private async getDailyTransit(profileId: string, userId: string) {
    if (!profileId) throw new Error('profileId is required');
    // Using Dosha analysis as a placeholder for transit logic for now, until provider supports real Gochar
    const chart = await this.kundliService.getKundli(profileId, userId);
    return {
      note: "Gochar calculation is in progress. Describe the general effect of current planetary positions relative to the ascendant: " + chart.ascendant?.sign
    };
  }

  private async getCompatibilityScore(profileAId: string, profileBId: string, userId: string) {
    if (!profileAId || !profileBId) throw new Error('profileAId and profileBId are required');
    return await this.kundliService.getCompatibilityAnalysis(profileAId, profileBId, userId);
  }

  private async getNumerologyReport(profileId: string, userId: string) {
    if (!profileId) throw new Error('profileId is required');
    const { data: profile } = await supabaseAdmin.from('kundli_profiles').select('dob').eq('id', profileId).eq('owner_id', userId).single();
    if (!profile || !profile.dob) throw new Error('Profile DOB not found for numerology');
    return this.numerologyService.getNumerology(profile.dob);
  }

  private async getDailyInsights(profileId: string, userId: string) {
    if (!profileId) throw new Error('profileId is required');
    return await this.dailyInsightsService.getDailyInsights(userId, profileId);
  }

  private async getFullNatalChart(profileId: string, userId: string) {
    if (!profileId) throw new Error('profileId is required');
    const kundli = await this.kundliService.getKundli(profileId, userId);
    return {
      ascendant: kundli.ascendant,
      planets: kundli.planets.map(p => ({
        name: p.name,
        isRetrograde: p.isRetrograde,
        sign: p.sign,
        house: p.house,
        nakshatra: p.nakshatra
      }))
    };
  }
}
