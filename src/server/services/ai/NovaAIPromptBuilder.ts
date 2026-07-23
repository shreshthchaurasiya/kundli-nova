import { NovaAIContext } from '../../types/novaAiContext';

export class NovaAIPromptBuilder {
  public static readonly SYSTEM_INSTRUCTION = `You are Nova AI, an experienced, professional Vedic astrologer and intelligent astrology assistant in the Kundli Nova app.
Your tone must be calm, respectful, natural Hindi/Hinglish, and helpful. Do not claim absolute certainty, avoid absolute predictions, and phrase all guidance responsibly.

CRITICAL ASTROLOGY RULES:
1. You must USE ONLY the supplied Kundli context. All astrology data is ALREADY calculated.
2. NEVER invent astrology data. NEVER recalculate planetary positions, Dashas, Yogas, or Doshas.
3. If specific birth information or Kundli data is unavailable, clearly state it is unavailable and ask the user for the missing information. Do not fabricate it.
4. Naturally reference available data (such as Ascendant, Moon Sign, Nakshatra, Mahadasha, Yogas, Doshas) ONLY when it is directly relevant to the user's question. Do not force every answer to mention everything.

CONVERSATION RULES:
1. If this is the start of the conversation (you see no prior messages from yourself), greet the user with: "Radhe Radhe [User Name] ji." (replace [User Name] with the Name from the User Profile). Do not repeat the greeting in subsequent messages in the same session.
2. Keep your responses practical and supportive.
3. Do not make medical, legal, or guaranteed financial claims.
4. Ask one concise relevant follow-up question ONLY when it naturally helps clarify or continue the consultation. Do not ask unnecessary questions for: thank-you messages, greetings, goodbye messages, simple acknowledgements, or questions already answered completely.

Respond ONLY with a JSON array containing 2 to 4 short strings. Each string is a separate chat bubble.`;

  public buildPromptContext(context: NovaAIContext): string {
    let prompt = `User Profile:\n`;
    prompt += `Name: ${context.selectedProfile.name}\n`;
    prompt += `Gender: ${context.selectedProfile.gender}\n`;
    prompt += `DOB: ${context.selectedProfile.dob}\n`;
    prompt += `Time of Birth: ${context.selectedProfile.timeOfBirth}\n`;
    prompt += `Birth Place: ${context.selectedProfile.city}\n\n`;

    prompt += `Astrology Context:\n`;

    if (context.astrology.natalChart) {
      const chart = context.astrology.natalChart;
      prompt += `- Ascendant (Lagna): ${chart.ascendant.sign} (${chart.ascendant.degree}°)\n`;
      prompt += `- Moon Sign: ${chart.moonSign}\n`;
      prompt += `- Sun Sign: ${chart.sunSign}\n`;
      prompt += `- Nakshatra: ${chart.nakshatra} (Pada ${chart.pada})\n`;
      prompt += `- Planetary Positions:\n`;
      chart.planets.forEach(p => {
        prompt += `  * ${p.name}: ${p.sign} in House ${p.house} (${p.degree || p.degreeInSign || '-'}°)${p.isRetrograde ? ' [Retrograde]' : ''}\n`;
      });
      prompt += `\n`;
    } else {
      prompt += `- Natal Chart: UNAVAILABLE\n\n`;
    }

    if (context.astrology.dasha) {
      const dasha = context.astrology.dasha;
      prompt += `- Current Mahadasha: ${dasha.currentMahadasha.planet} (ends ${dasha.currentMahadasha.endDate})\n`;
      if (dasha.currentAntardasha) {
        prompt += `- Current Antardasha: ${dasha.currentAntardasha.planet} (ends ${dasha.currentAntardasha.endDate})\n`;
      }
      prompt += `\n`;
    } else {
      prompt += `- Vimshottari Dasha: UNAVAILABLE\n\n`;
    }

    if (context.astrology.dosha) {
      const doshas = context.astrology.dosha.results.filter(d => d.detected);
      prompt += `- Doshas Present: ${doshas.length > 0 ? doshas.map(d => d.name).join(', ') : 'None'}\n\n`;
    } else {
      prompt += `- Dosha Analysis: UNAVAILABLE\n\n`;
    }

    if (context.astrology.yoga) {
      const yogas = context.astrology.yoga.results.filter(y => y.detected);
      prompt += `- Yogas Present: ${yogas.length > 0 ? yogas.map(y => y.name).join(', ') : 'None'}\n\n`;
    } else {
      prompt += `- Yoga Analysis: UNAVAILABLE\n\n`;
    }

    if (context.astrology.detailedReport) {
      const report = context.astrology.detailedReport;
      prompt += `- Detailed Report Highlights:\n`;
      if (report.ascendant?.summary) prompt += `  * Ascendant: ${report.ascendant.summary}\n`;
      if (report.nakshatraAnalysis?.summary) prompt += `  * Nakshatra: ${report.nakshatraAnalysis.summary}\n`;
      prompt += `\n`;
    } else {
      prompt += `- Detailed Report: UNAVAILABLE\n\n`;
    }

    return prompt.trim();
  }
}
