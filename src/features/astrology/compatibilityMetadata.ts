/**
 * Shared Kundli Matching metadata for Ashtakoota factors.
 *
 * This is the single source of truth for user-facing labels and descriptions.
 * Used by:
 *  - KundliMatchingFormPanel / CompatibilityPanel (UI)
 *  - generateKundliMatchingPdf (PDF)
 *  - NovaAIPromptBuilder (AI context)
 *
 * Provider keys such as "ashtakoot.varna.v1" must NEVER reach the user.
 * Always call `normalizeKootaKey(factor.name || factor.code)` before rendering.
 */

export interface KootaMetadata {
  /** Canonical key used internally, e.g. "varna" */
  key: string;
  /** Sanskrit title shown in headings */
  title: string;
  /** Short friendly label */
  friendlyLabel: string;
  /** One-sentence explanation shown below the score */
  description: string;
}

const KOOTA_MAP: Record<string, KootaMetadata> = {
  varna: {
    key: 'varna',
    title: 'Varna',
    friendlyLabel: 'Spiritual compatibility',
    description:
      'Reflects traditional compatibility of values, temperament and ego expression.',
  },
  vashya: {
    key: 'vashya',
    title: 'Vashya',
    friendlyLabel: 'Mutual influence',
    description:
      'Reflects attraction, cooperation and influence between both partners.',
  },
  tara: {
    key: 'tara',
    title: 'Tara',
    friendlyLabel: 'Well-being and destiny',
    description:
      'Traditionally evaluates harmony related to birth stars and mutual well-being.',
  },
  yoni: {
    key: 'yoni',
    title: 'Yoni',
    friendlyLabel: 'Physical compatibility',
    description:
      'Traditionally represents physical nature, attraction and instinctive compatibility.',
  },
  graha_maitri: {
    key: 'graha_maitri',
    title: 'Graha Maitri',
    friendlyLabel: 'Mental compatibility',
    description:
      'Reflects emotional understanding and friendship through the rulers of the Moon signs.',
  },
  gana: {
    key: 'gana',
    title: 'Gana',
    friendlyLabel: 'Temperament',
    description: 'Compares general nature, behavior and temperament.',
  },
  bhakoot: {
    key: 'bhakoot',
    title: 'Bhakoot',
    friendlyLabel: 'Emotional compatibility',
    description:
      'Traditionally examines emotional harmony and the relationship between Moon signs.',
  },
  nadi: {
    key: 'nadi',
    title: 'Nadi',
    friendlyLabel: 'Health and hereditary compatibility',
    description:
      'Traditionally considers constitutional and hereditary compatibility.',
  },
};

/**
 * Normalize a provider ID such as "ashtakoot.varna.v1" or "VARNA" to its
 * canonical lowercase key "varna", then return the metadata entry.
 *
 * Falls back gracefully if the key is unknown.
 */
export function getKootaMetadata(rawKey: string): KootaMetadata {
  // Strip provider prefix (e.g. "ashtakoot.") and version suffix (e.g. ".v1")
  let normalized = rawKey.toLowerCase();

  // Remove "ashtakoot." prefix
  if (normalized.startsWith('ashtakoot.')) {
    normalized = normalized.slice('ashtakoot.'.length);
  }

  // Remove trailing version like ".v1", ".v2"
  normalized = normalized.replace(/\.v\d+$/, '');

  const found = KOOTA_MAP[normalized];
  if (found) return found;

  // Fallback: clean display name without exposing the internal key
  const displayTitle = normalized
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return {
    key: normalized,
    title: displayTitle,
    friendlyLabel: displayTitle,
    description: 'Traditional Vedic compatibility factor.',
  };
}

/**
 * Given a list of factors, return the top N strongest and weakest by
 * normalized ratio (score / maximumScore).
 */
export interface RankedFactor {
  title: string;
  ratio: number;
}

export function rankFactors(
  factors: Array<{ name: string; code: string; score: number; maximumScore: number; calculationStatus?: string }>
): { strongest: RankedFactor[]; weakest: RankedFactor[] } {
  const available = factors
    .filter((f) => f.calculationStatus !== 'unavailable' && f.maximumScore > 0)
    .map((f) => ({
      title: getKootaMetadata(f.name || f.code).title,
      ratio: f.score / f.maximumScore,
    }))
    .sort((a, b) => b.ratio - a.ratio);

  return {
    strongest: available.slice(0, 3),
    weakest: available.slice(-3).reverse(),
  };
}

/**
 * Deterministic compatibility category based on total score (out of 36).
 */
export function getCompatibilityCategory(totalScore: number): string {
  if (totalScore >= 25) return 'Strong compatibility';
  if (totalScore >= 18) return 'Moderate compatibility';
  return 'Lower compatibility';
}

/**
 * Build a deterministic human-readable match summary paragraph.
 * Does NOT invent remedies, doshas, or guarantees.
 */
export function buildMatchSummary(
  profileAName: string,
  profileBName: string,
  totalScore: number,
  maximumScore: number,
  factors: Array<{ name: string; code: string; score: number; maximumScore: number; calculationStatus?: string }>,
  manglikCompatibility: string
): string {
  const category = getCompatibilityCategory(totalScore);
  const { strongest, weakest } = rankFactors(factors);

  const strongestNames = strongest.map((f) => f.title).join(', ');
  const weakestNames = weakest.map((f) => f.title).join(', ');

  let summary = `The overall Ashtakoota score for ${profileAName} and ${profileBName} is ${totalScore.toFixed(1)} out of ${maximumScore}, which falls in the ${category} range.`;

  if (strongestNames) {
    summary += ` The strongest areas are ${strongestNames}.`;
  }

  if (weakestNames && weakest.some((f) => f.ratio < 0.5)) {
    summary += ` ${weakestNames} received lower scores and may benefit from mutual understanding and open communication.`;
  }

  if (manglikCompatibility && manglikCompatibility !== 'not_evaluated') {
    const manglikDisplay =
      manglikCompatibility === 'both_manglik'
        ? 'Both profiles are Manglik.'
        : manglikCompatibility === 'neither_manglik'
        ? 'Neither profile is Manglik.'
        : manglikCompatibility === 'manglik_non_manglik'
        ? 'Manglik status differs between the profiles.'
        : manglikCompatibility
            .split('_')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ') + '.';
    summary += ` Manglik match: ${manglikDisplay}`;
  }

  summary +=
    ' This traditional matching analysis is one consideration and does not guarantee relationship or marriage outcomes.';

  return summary;
}
