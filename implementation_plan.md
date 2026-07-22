# Stage 5B: Vimshottari Dasha Backend & UI Integration

This document outlines the final implementation plan for Stage 5B, reflecting user feedback and constraints.

## Proposed Changes

### Backend Contracts (`src/server/types/astrologyProvider.ts`)
- Redefine `KundliNovaDasha` as `KundliNovaVimshottariDasha` with the explicit structure:
  ```typescript
  interface DashaPeriod {
    planet: 'Ketu' | 'Venus' | 'Sun' | 'Moon' | 'Mars' | 'Rahu' | 'Jupiter' | 'Saturn' | 'Mercury';
    startDate: string; // ISO date
    endDate: string; // ISO date
    isCurrent: boolean;
    remainingDays?: number;
  }
  interface KundliNovaVimshottariDasha {
    schemaVersion: '1.0';
    provider: string;
    providerVersion: string;
    calculatedAt: string; // ISO date
    currentMahadasha: DashaPeriod;
    currentAntardasha: DashaPeriod | null;
    mahadashaTimeline: DashaPeriod[];
  }
  ```
- Rename `getDasha` to `getVimshottariDasha` in `AstrologyCalculationProvider`.

### Provider Implementation (`src/server/providers/navamshaProvider.ts`)
- Implement `getVimshottariDasha(input: KundliNovaCalcInput)`.
- **Do not invent or assume a live Navamsha endpoint**. Safely throw `PROVIDER_NOT_CONFIGURED` to allow the rest of the system to be tested using mocked providers.
- Maintain isolation of the HTTP adapter. The actual endpoint integration can be done later when API documentation/keys are available.

### Service Layer (`src/server/services/kundliCalculationService.ts`)
- Extract `loadAuthorizedCalculationInput(profileId, userId)` as a private helper to handle profile lookup, ownership checks, and birth details validation without triggering API calls. Both Natal and Dasha methods will reuse this.
- Add `getVimshottariDasha(profileId: string, userId: string)` using single-flight caching.
- Cache key format: `vimshottari-dasha:${provider}:${providerVersion}:${profileId}:${normalized_dob}:${normalized_tob}:${lat}:${lng}:${timezone}`.
- Calculate `remainingDays` reliably on the backend using ISO dates (clamping past periods to 0).

### Routing & Controller
- Add `getDasha` in `src/server/controllers/astrology.ts` mirroring `getKundli` error handling (503/502).
- Add `GET /api/v1/astrology/dasha/:profileId` in `src/server/routes/v1/astrology.ts`.

### Frontend API
- Add `ENDPOINTS.ASTROLOGY.GET_DASHA`.
- Add `AstrologyApi.getDasha(profileId: string)`.

### Frontend UI (`src/screens/NovaKundliScreen.tsx`)
- **Lazy Fetching**: Fetch Dasha data ONLY when the "Dasha" tab is active. Reopening the tab reuses state. Profile switching clears stale Dasha state. If switching while on the Dasha tab, fetch for the new profile.
- Implement request identity guard (`dashaRequestIdRef`) specifically for Dasha fetches to prevent out-of-order responses from overwriting the currently selected profile.
- Render clean UI for `Current Mahadasha`, `Current Antardasha` (handling nulls gracefully), and `mahadashaTimeline`.
- Ensure accessible, keyboard-friendly timeline UI.

### Testing
- **Provider**: Mock testing the contract (no assumed live endpoints), missing Antardasha, unknown planets.
- **Backend**: Shared authorized input loader (no extra API calls), cache separation, cache invalidation, safe public error mapping.
- **Frontend**: Lazy fetching (no initial request), profile switching behavior (inactive vs active Dasha tab), out-of-order resolution protection, proper loading/error states, and strict absence of Dosha/Yoga/Predictions/AI.

### Stage 5C: Dosha Analysis Backend and UI Integration
- **Contract**: Replaced the ambiguous legacy Dosha contract with `KundliNovaDoshaAnalysis` mapping exactly four Doshas: `MANGAL_DOSHA`, `KAAL_SARP_DOSHA`, `PITRU_DOSHA`, `GRAHAN_DOSHA`. Sade Sati is removed.
- **Provider**: `AstrologyCalculationProvider` requires `getDoshaAnalysis(input: KundliNovaCalcInput): Promise<KundliNovaDoshaAnalysis>`. The `NavamshaProvider` implementation correctly throws `PROVIDER_NOT_CONFIGURED` without assuming endpoint details. Legacy `getDoshas()` is kept for backward compatibility only.
- **Service**: `KundliCalculationService.getDoshaAnalysis` uses an isolated `doshaCache` and `doshaInflight` mechanism, returning the normalized `KundliNovaDoshaAnalysis`.
- **UI**: `NovaKundliScreen` renders exactly four cards for the specific doshas using normalized fields (`code`, `name`, `detected`, `severity`, `summary`, `evidence`, `calculationStatus`), and correctly handles `unavailable` state vs `not detected` state.

### Stage 5D: Yoga Analysis Backend and UI Integration
- **Contract**: Replaced legacy `KundliNovaYogaResult` with `KundliNovaYogaAnalysis` and `KundliNovaYogaResult` that maps exactly five Yogas: `GAJ_KESARI_YOGA`, `BUDHA_ADITYA_YOGA`, `DHAN_YOGA`, `RAJ_YOGA`, `NEECH_BHANG_RAJ_YOGA`. 
- **Provider**: `AstrologyCalculationProvider` requires `getYogaAnalysis(input: KundliNovaCalcInput): Promise<KundliNovaYogaAnalysis>`. `NavamshaProvider` correctly throws `PROVIDER_NOT_CONFIGURED` without assuming endpoint details. Legacy `getYogas()` is kept for backward compatibility.
- **Service**: `KundliCalculationService.getYogaAnalysis` uses isolated `yogaCache` and `yogaInflight` structures, returning the normalized analysis.
- **UI**: Added `YogaAnalysisPanel` and `YogaResultCard` components. `NovaKundliScreen` dynamically lazy-loads Yoga data when the Yoga tab is selected, properly protecting against out-of-order race conditions. Shows factual details without any predictive or remedy text.

### Stage 5E: Kundli Matching (Ashtakoota / Gun Milan)
- **Contract**: Introduced `KundliNovaCompatibilityAnalysis` tracking 8 Ashtakoota factors (`VARNA`, `VASHYA`, `TARA`, `YONI`, `GRAHA_MAITRI`, `GANA`, `BHAKOOT`, `NADI`), `totalScore`, `maximumScore`, and `compatibilityPercentage`.
- **Provider**: `AstrologyCalculationProvider` extended with `getCompatibilityAnalysis(inputA, inputB)`. The `NavamshaProvider` correctly throws `PROVIDER_NOT_CONFIGURED` without assigning an HTTP status.
- **Service**: `KundliCalculationService.getCompatibilityAnalysis` handles caching (`compatibilityCache`, `compatibilityInflight`) using a directional cache key `provider:version:profileAId:fingerprintA:profileBId:fingerprintB` to preserve A/B identities distinctively. Throws `SAME_PROFILE_NOT_ALLOWED` if `profileAId === profileBId`. Enforces normalized response payload integrity (exactly 8 factors, unique codes, valid scores/percentages). Loads authorized input for both profiles.
- **UI**: Added `CompatibilityPanel` component and factor cards. Lazy-loads only when the Compatibility tab is active and both primary and partner profiles are selected. Uses a separate request guard for the compatibility fetch. Prevents a user from selecting the same profile twice.
