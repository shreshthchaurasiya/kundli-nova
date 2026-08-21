/**
 * Normalized compatibility context passed from the matching result screen
 * to the Nova AI chat screen.
 *
 * This is the stable, frontend-normalized representation used as the
 * structured handoff payload. It does NOT contain raw provider objects.
 * Provider keys such as "ashtakoot.varna.v1" must never appear here.
 */

export interface NormalizedKootaFactor {
  /** Canonical key e.g. "varna" */
  key: string;
  /** Sanskrit title e.g. "Varna" */
  title: string;
  /** Friendly label e.g. "Spiritual compatibility" */
  friendlyLabel: string;
  score: number;
  maximumScore: number;
  /** 0-1 normalized ratio */
  ratio: number;
  isUnavailable: boolean;
}

export interface NormalizedCompatibilityContext {
  profileAId: string;
  profileBId: string;
  totalScore: number;
  maximumScore: number;
  percentage: number;
  /** "Strong compatibility" | "Moderate compatibility" | "Lower compatibility" */
  category: string;
  factors: NormalizedKootaFactor[];
  manglikCompatibility: string;
  profileAManglik: boolean;
  profileBManglik: boolean;
}
