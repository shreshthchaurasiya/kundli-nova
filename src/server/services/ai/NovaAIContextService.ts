import crypto from 'crypto';
import { supabaseAdmin } from '../../config/supabase';
import { KundliCalculationService } from '../kundliCalculationService';
import { NovaAIContext, NovaAIConversationMemory } from '../../types/novaAiContext';

export class NovaAIContextService {
  constructor(private kundliService: KundliCalculationService) {}

  private createFingerprint(profile: any): string {
    const data = `${profile.dob}|${profile.tob}|${profile.latitude}|${profile.longitude}|${profile.timezone}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  public async loadContext(
    userId: string,
    profileId: string,
    memory: NovaAIConversationMemory
  ): Promise<NovaAIContext> {
    // 1. Load profile securely
    const { data: profile, error } = await supabaseAdmin
      .from('kundli_profiles')
      .select('*')
      .eq('id', profileId)
      .eq('owner_id', userId)
      .single();

    if (error || !profile) {
      throw new Error('Profile not found or unauthorized');
    }

    const currentFingerprint = this.createFingerprint(profile);
    let astrologyContext = {
      natalChart: null,
      dasha: null,
      dosha: null,
      yoga: null,
      detailedReport: null
    };

    // 2. Try loading cached report from kundli_reports
    const { data: cachedReport } = await supabaseAdmin
      .from('kundli_reports')
      .select('id, report_json, generated_at')
      .eq('profile_id', profileId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cachedReport && cachedReport.report_json?.fingerprint === currentFingerprint) {
      // Valid cache hit
      astrologyContext = cachedReport.report_json.data;
    } else {
      // 3. Cache miss or invalidated -> Generate fresh normalized data via real provider
      try {
        const natalChart = await this.kundliService.getKundli(profileId, userId).catch(() => null);
        if (natalChart) {
          const [dasha, dosha, yoga, detailedReport] = await Promise.all([
            this.kundliService.getVimshottariDasha(profileId, userId).catch(() => null),
            this.kundliService.getDoshaAnalysis(profileId, userId).catch(() => null),
            this.kundliService.getYogaAnalysis(profileId, userId).catch(() => null),
            this.kundliService.getDetailedKundliReport(profileId, userId).catch(() => null)
          ]);
          
          astrologyContext = { natalChart, dasha, dosha, yoga, detailedReport };

          // 4. Invalidate old cache and persist fresh Kundli
          await supabaseAdmin
            .from('kundli_reports')
            .delete()
            .eq('profile_id', profileId);

          await supabaseAdmin
            .from('kundli_reports')
            .insert({
              profile_id: profileId,
              engine: 'NavamshaProvider',
              version: 'v1',
              report_json: {
                fingerprint: currentFingerprint,
                data: astrologyContext
              }
            });
        }
      } catch (err) {
        console.warn('[NovaAIContextService] Failed to load fresh astrology context', err);
      }
    }

    return {
      user: { id: userId },
      selectedProfile: {
        id: profile.id,
        name: profile.name,
        gender: profile.gender,
        dob: profile.dob,
        timeOfBirth: profile.tob,
        city: profile.birth_city || 'Unknown',
        latitude: profile.latitude,
        longitude: profile.longitude,
        timezone: profile.timezone,
      },
      astrology: astrologyContext,
      memory
    };
  }
}
