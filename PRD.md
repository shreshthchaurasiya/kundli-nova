# Product Requirement & Handover Document (PRD)

---

## 1. Project Overview

- **Project Name:** Kundli Nova
- **Aesthetic Identity & Core Goal:** A premium, modern, calm, and trustworthy Vedic astrology application that feels contemporary, clean, and elegant (like an Apple-designed spiritual workspace). The primary goal is to provide high-quality Vedic astrology calculations, birth charts, daily planetary summaries, direct astrologer consultations, and Gemini-powered artificial intelligence insights.
- **Target Users:** Individuals seeking personal growth, daily planetary guidance, direct astrology-based consultations, and Kundli/horoscope reports.
- **Framework & Infrastructure:** 
  - **Framework:** React 19 + Vite (Frontend SPA client) with an Express 4 backend proxy server.
  - **Type Stripping & TS Support:** Built with TypeScript, transpiled and bundled using `esbuild` and run with Node via `dist/server.cjs` in production and `tsx` in development.
  - **Styling:** Tailwind CSS (v4) with responsive viewport containment.
  - **Core Libraries:** `@google/genai` (v2.4.0) for server-side Gemini 3.5 Flash orchestration, `jspdf` for pristine client-side PDF document compilation, `motion/react` for smooth, responsive transitions, and `lucide-react` for system iconography.
  - **Package Manager:** NPM / Bun.

---

## 2. Current Project Structure

The project has been refactored into a highly modular layout to avoid single-file build limitations.

### Important Folders and Files:

- **`/package.json`**: Manages frontend and server-side dependencies. It contains scripts for building (`vite build && esbuild...`), running dev (`tsx server.ts`), and running prod (`node dist/server.cjs`).
- **`/server.ts`**: The backend Express server. It handles CORS, acts as a secure API proxy for Gemini interactions (`/api/chat` and `/api/explain`), and hosts Vite middleware in dev or serves static production builds of `dist/` in production.
- **`/src/main.tsx`**: React application mounting entry-point.
- **`/src/App.tsx`**: Main application state orchestrator. Governs viewport scaling, routing (`Screen` state), and global layout frames.
- **`/src/types.ts`**: Shared TypeScript types, including the `Screen` enum, `Tab` enum, `Astrologer` entity, `ChatThread`, `Message`, and `ConsultationRequest` definitions.
- **`/src/data.ts`**: Centralized repository of static metadata, including the premium astrologers array (`ASTROLOGERS` mock dataset), categories, reviews, and test profiles.
- **`/src/components/`**:
  - `BottomNav.tsx`: Shared custom responsive bottom navigation bar, synchronizing current tab highlights.
  - `KundliPreviewMessage.tsx`: Styled chat widget that allows downloading generated PDF reports from inside a consultation chat.
- **`/src/services/`**:
  - `kundliStorage.ts`: Defines interfaces for `BirthDetails`, `PlanetaryPosition`, and `KundliData`. Implements local storage read/write utilities for saving user profiles and customized Kundli charts.
  - `kundliService.ts`: Core deterministic calculation engine. Generates realistic planetary positions, nakshatras, moolank, bhagyank, and active Vimshottari dashas based on name, dob, and tob seed parameters.
  - `kundliPdfService.ts`: Premium client-side PDF generator using `jspdf`. Draws beautiful multi-section charts with custom orange dividers, astro badges, and layout coordinates.
  - `astrologyServices.ts`: Simulates full-scale network interactions for the astrologer consultation flows, active requests, wallet balances, message history streams, and IndexedDB attachment storage.
- **`/src/screens/`**:
  - `SplashScreen.tsx`: Smooth entrance splash screen with logo and entry transitions.
  - `LoginScreen.tsx` & `OtpScreen.tsx`: Clean phone/OTP mock verification system.
  - `CreateProfileScreen.tsx` & `EditProfileScreen.tsx`: Welcoming user birth detail forms with geolocation autocomplete mock.
  - `WelcomeGiftScreen.tsx`: Onboarding interstitial offering a free first astrologer consultation.
  - `HomeScreen.tsx`: Core dashboard featuring active banners, live expert counts, countdown timers, category shortcuts, daily horoscopes, and top astrologers list.
  - `AstrologersScreen.tsx` & `CategoryDetailScreen.tsx`: Searchable directories of vetted experts filtered by skills and languages.
  - `AstrologerProfileScreen.tsx`: Beautiful high-fidelity details screen for astrologers showing experience, reviews, skills, and direct consultation request buttons.
  - `ConsultationChatScreen.tsx`: A robust real-time simulated workspace for live consultation sessions with minute-by-minute credit debits, a countdown timer, in-app chat bubble messaging, image uploading, and Kundli sharing.
  - `NovaAIScreen.tsx`: Elite spiritual portal containing daily guidance, interactive questions, "Today's Focus" insights, and past conversation threads.
  - `NovaAIChatScreen.tsx`: Immersive real-time chat workspace powered by Gemini 3.5 Flash via `/api/chat` with dynamic multi-bubble streaming and Hinglish dialogue.
  - `NovaKundliScreen.tsx`: Interactive 5-tab Kundli hub containing North Indian charts, planetary degrees, Vimshottari dashas, professional life insights, and live PDF generations with zoomable charts.
  - `ViewKundliScreen.tsx`: Profile summary card mapping user birth coordinates and planetary alignments.
  - `ChatListScreen.tsx` & `ChatHistoryScreen.tsx`: Historical directories tracking ongoing active streams and historical consult summaries.
  - `WalletScreen.tsx`: Responsive financial transaction ledger with quick recharge buttons.
  - `ProfileScreen.tsx`: Personal details overview with wallet summaries and logouts.

---

## 3. Completed Features

### 1. Authentication & Onboarding Flow
- **Working Status:** fully complete visual flows.
- **Files/Screens:** `SplashScreen.tsx`, `LoginScreen.tsx`, `OtpScreen.tsx`, `CreateProfileScreen.tsx`.
- **Data Source:** Written locally to `localStorage` under key `kundli_nova_profile`.
- **Limitations:** Phone verification is simulated without actual external gateway triggers.

### 2. Dashboard Hub (Home Screen)
- **Working Status:** Complete. Shows carousel banners, active live-count oscillations (315 to 345 users online), a real-time countdown timer for introductory offers, categories, and top recommended astrologers.
- **Files/Screens:** `HomeScreen.tsx`.
- **Data Source:** Read from static database `ASTROLOGERS` in `data.ts` and countdown timers in `localStorage`.

### 3. Consultation Directory (Astrologers Directory)
- **Working Status:** Complete. Allows searching, sorting, and filtering experts by language (Hindi, English, etc.) and skills (Vedic, Tarot, Numerology, Vastu).
- **Files/Screens:** `AstrologersScreen.tsx`, `CategoryDetailScreen.tsx`.
- **Data Source:** Compiled dataset in `data.ts`.

### 4. Expert Profile Screen
- **Working Status:** Complete. Shows comprehensive details of an astrologer, their language fluency, expertise rating, cumulative consultations, per-minute charges, reviews, and a chat trigger. Clicking the astrologer card now opens this detailed profile rather than initiating a chat directly.
- **Files/Screens:** `AstrologerProfileScreen.tsx`.

### 5. Simulated Live Consultation (Chat Consultation Workspace)
- **Working Status:** Complete and robust. Simulates a direct live connection to a selected expert. Includes wallet checking, a connection queue ("CHECKING_WALLET", "PREPARING_KUNDLI", "WAITING_FOR_ASTROLOGER"), an interactive live timer, active credit debits (deducting per-minute charges from the local wallet state), image sending, system prompts, Kundli sharing, and safe termination sequences.
- **Files/Screens:** `ConsultationChatScreen.tsx`, `astrologyServices.ts`.
- **Data Source:** Synchronized in `localStorage` and `IndexedDB` for media files.

### 6. Interactive Kundli Workspace (Nova Kundli Hub)
- **Working Status:** Complete. Interactive 5-tab interface (Basic Details, Birth Charts, Planetary Degrees, Vimshottari Dasha, Life Insights). Features an interactive SVG-drawn North Indian chart that can be tapped to trigger a fullscreen zoomable/pinchable view with scalings.
- **Files/Screens:** `NovaKundliScreen.tsx`, `kundliService.ts`, `kundliStorage.ts`.
- **Data Source:** Deterministic generation based on the active user profile name, birth date, and time.

### 7. Premium Kundli PDF Compiler
- **Working Status:** Complete. Creates a beautiful, print-ready, high-resolution Vedic Horoscope report utilizing PDF coordinates, brand branding headers, structural table boundaries, and orange layout dividers.
- **Files/Screens:** `kundliPdfService.ts`.
- **Data Source:** Generated `KundliData` objects.

### 8. Gemini-Powered Chat (Nova AI Chat)
- **Working Status:** Complete. Connects the user directly with "Acharya Dev Sharma" (an elite Vedic astrologer avatar) via the backend Express endpoint `/api/chat`. Features multi-bubble chat streams, natural Hinglish conversation, curiosity-driven pauses, and daily guidance explanations.
- **Files/Screens:** `NovaAIScreen.tsx`, `NovaAIChatScreen.tsx`, `server.ts`.
- **Data Source:** Google Gemini 3.5 Flash server-side integration.

---

## 4. Local Storage & Storage Audit (Unified Storage Architecture)

The application utilizes an offline-first storage architecture governed by strict, atomic repositories. All direct local storage keys and conflicting behaviors have been resolved.

### Centralized Repository Mappings

All reads and writes are directed through specific repositories implementing TypeScript interfaces, shielding the UI components from direct local storage keys:

1. **`walletStorage` (`IWalletRepository`):**
   - Governing key: `kundli_nova_wallet`
   - Unified mathematical operations for balance tracking (`getBalance`, `recharge`, `debit`, `refund`) and transaction list updates.
   - Reactive Pub/Sub model supporting multi-tab state syncing via `subscribe`.

2. **`consultationStorage` (`IConsultationRepository`):**
   - Governing keys: `kundli_nova_active_request`, `kundli_nova_active_request_time`, `kundli_nova_session_history`
   - Encapsulates connection lifecycle states and historic records.
   - Restores sessions safely on app reloads.

3. **`chatStorage` (`IChatRepository`):**
   - Governing keys: `kundli_nova_chat_messages_${sessionId}`, `kundli_nova_chat_state_${sessionId}`
   - Manages live chat messages and saves images securely to IndexedDB under the prefix `idb://` to respect local storage constraints.

4. **`profileStorage` (`IProfileRepository`):**
   - Governing key: `kundli_nova_profile`
   - Handles the active session's user account details and birth coordinates.

5. **`kundliProfileStorage` (`IKundliProfileRepository`):**
   - Governing key: `kundli_nova_profiles_list`
   - Tracks a saved list of distinct user Kundlis mapped by unique IDs (UUIDs).

---

### Migration & Corruption Strategy (Centralized Storage Adapter)

A safe `storageAdapter` wraps all localStorage access with try-catch checks:
- **One-Time Idempotent Migrations (`migrations.ts`):** Upgrades version numbers. Migrates legacy wallet keys (`kundli_nova_wallet_balance`, `kundli_nova_transactions`) into the unified canonical `kundli_nova_wallet` key.
- **Deduplication:** Filters out duplicate legacy transactions using cryptographic fingerprints (`type_amount_timestamp_title`).
- **Corruption Fail-safe:** If standard parsing fails due to corrupted JSON strings, the system backups the corrupt data to `kundli_nova_corrupt_backup_*` and safely falls back/restores from legacy keys or initial defaults.

---

---

## 5. Current Data Models

These models are declared inside `/src/types.ts`, `/src/services/kundliStorage.ts`, and `/src/services/astrologyServices.ts`:

### 1. User Birth Details (`BirthDetails`)
```typescript
export interface BirthDetails {
  name: string;
  gender: string;      // 'male' | 'female'
  dob: string;         // 'YYYY-MM-DD'
  tob: string;         // 'HH:MM'
  state: string;
  district: string;
  city: string;
}
```

### 2. Astrologer Profile (`Astrologer`)
```typescript
export interface Astrologer {
  id: string;
  name: string;
  image: string;
  experience: string;
  languages: string[];
  skills: string[];
  rating: number;
  consultations: number;
  pricePerMinute: number;
  isOnline: boolean;
  about: string;
}
```

### 3. Wallet Transaction (`WalletTransaction`)
- **Version A (Used in `astrologyServices.ts`):**
```typescript
export interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  timestamp: string; // locale string
}
```
- **Version B (Used in `WalletScreen.tsx`):**
```typescript
export interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  title: string;
  date: string;
  amt: string; // formatted e.g. "+₹500" or "-₹15"
  status: 'completed' | 'failed' | 'pending';
  timestamp: number;
}
```

### 4. Consultation Request / Session Record (`ConsultationRequest`)
```typescript
export interface ConsultationRequest {
  id: string;
  astrologerId: string;
  userId: string;
  status: ConsultationState;
  createdAt: string; // ISO String
  acceptedAt?: string; // ISO String
  endedAt?: string; // ISO String
  elapsedSeconds: number;
  billingMode: 'wallet' | 'subscription';
  ratePerMin: number;
  totalCharged: number;
}
```

### 5. Chat Message (`Message`)
```typescript
export interface Message {
  id: string;
  text?: string;
  sender: 'astrologer' | 'user' | 'system';
  time: string; // formatted time e.g. '10:45 AM'
  type: 'text' | 'image' | 'pdf' | 'voice' | 'system';
  attachmentUrl?: string; // e.g. "idb://chat-img-12345" or blob reference
  attachmentName?: string;
  attachmentSize?: string;
  duration?: string;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
}
```

### 6. Kundli Report Data Mismatch (Double Schemas)
- **Vedic Calculation Engine Schema (`src/services/kundliStorage.ts`):**
```typescript
export interface KundliData {
  profileId: string;
  kundliId: string;
  birthDetails: BirthDetails;
  chartData: string[]; // North Indian 12 houses planetary texts
  planetaryPositions: PlanetaryPosition[];
  astrologySummary: {
    lagna: string;
    sunSign: string;
    moonSign: string;
    nakshatra: string;
    moolank: number;
    bhagyank: number;
  };
  currentDasha: {
    mahadasha: string;
    antardasha: string;
  };
  lifeInsights: {
    career: string;
    marriage: string;
    finance: string;
    health: string;
    family: string;
  };
  generatedAt: string;
}
```
- **Consultation Simulation Schema (`src/services/astrologyServices.ts`):**
```typescript
export interface KundliData {
  lagna: string;
  moonSign: string;
  sunSign: string;
  nakshatra: string;
  mahadasha: string;
  antardasha: string;
  planetPositions: Array<{
    name: string;
    longitude: string;
    house: number;
    status: string; // Exalted, Debilitated, Own, Enemy, etc.
  }>;
  northIndianChart: string[]; // House configurations
  navamsaChart: string[];
}
```
*Note: The model discrepancy requires careful merging or field adaptors before mapping to unified backend columns.*

---

## 6. Current Consultation and Chat Flow

```
[ User Profile Card ] ──> [ Click Chat on Expert Profile ]
                                │
                                ▼
                     [ Check Wallet Balance ] ──( < Price/Min × 5 )──> [ Redirect to Wallet ]
                                │
                     ( Balance >= Price/Min × 5 )
                                │
                                ▼
                     [ Create Consultation Request ] ──( Status: CHECKING_WALLET )
                                │
                                ▼
                     [ Generate Birth Kundli ] ──( Status: PREPARING_KUNDLI )
                                │
                                ▼
                     [ Wait for Astrologer Accept ] ──( Status: WAITING_FOR_ASTROLOGER )
                                │
                                ▼
                      [ Session Connected ] ──( Status: ACTIVE )
                                │
               ┌────────────────┴────────────────┐
               ▼                                 ▼
       [ Chat Interfaces ]             [ Live Deductions Clock ]
       - Send/Receive Text             - Decrements balance per minute
       - Upload Image Attachments      - Exits automatically if balance runs out
       - Direct Kundli Sharing
               │
               ▼
       [ Terminate Chat ] ──> [ Move Active Req to Session History ] ──> [ Clear Active Request ]
```

### Flow Details:
1. **Init:** The user selects an astrologer and clicks "Chat".
2. **Validation:** The system checks if `wallet_balance` contains enough funds for at least a **5-minute consultation** (`balance >= pricePerMinute * 5`). If insufficient, it routes the user to `WalletScreen` with an alert.
3. **Queue States:** It generates a new active request with ID (`session-kn-[timestamp]`) and loops states:
   - `CHECKING_WALLET` (1.2s delay)
   - `PREPARING_KUNDLI` (1.5s delay)
   - `WAITING_FOR_ASTROLOGER` (1.5s delay)
4. **Active Connection:** Transition to `ACTIVE`. A background clock begins counting seconds. 
5. **Debiting Engine:** Every 60 seconds of elapsed duration, the astrologer's `pricePerMinute` is deducted from the wallet balance. If the balance falls below 1 minute of consultation charge, a low balance warning is displayed. If the balance reaches 0, the session is terminated as `ENDED` automatically.
6. **Persistence:** When ended, active requests are moved to the historic catalog `kundli_nova_session_history` and deleted from `kundli_nova_active_request` to clear the active portal.

---

## 7. Wallet System

- **Wallet Storage:** State is read and written using key `kundli_nova_wallet_balance` for currency numbers, and transactions are stored under `kundli_nova_transactions`.
- **Default Baseline:** Users are initialized with a complimentary **$150** free demo balance on their first app launch.
- **Deduction Frequency:** Balance deductions occur **per minute** (`60-second intervals`) during active consultations.
- **Recharge Ledger:** Transaction objects are appended to the transactions array with parameters `{ id, type: 'credit'|'debit', amount, description, timestamp }`.

---

## 8. Kundli Nova Product Requirements

The fully realized application requires integrating these components:

1. **Saved Kundli Multi-Profiles:** Users should be able to create, save, update, and delete multiple horoscope profiles (for themselves, spouses, children, friends).
2. **Kundli Comparison / Matchmaking:** A comprehensive matchmaking / Gun Milan engine where the user can pick two saved profiles and retrieve compatibility percentages, Guna counts (out of 36), Bhakoot, Nadi, and customized relationship breakdowns.
3. **AI Interpretation Engine:** Integrating the Gemini engine directly with calculation tables to interpret dasha transits and planetary strengths with practical spiritual guidance.
4. **Vast Astrology Engine:** Full calculations including Panchang details, detailed planetary subdivisions (D9 Navamsa, D10 Dashamsha charts), dynamic Kundli matching, and complete Vimshottari dasha trees.

---

## 9. UI and Design Context

- **Palette & Contrast:** Dominated by pristine whites, warm off-white neutral panels, and dark charcoal text. **Primary orange (`#FF8A00` / `#D97706`)** is strictly reserved for primary triggers, selection indicators, and call-to-actions.
- **Typography:** Uses a clean sans-serif layout paired with elegant serif styling for primary display headers to invoke an elite spiritual vibe.
- **Visual Restraint:** Simple layout elevations, fine boundaries (`border-neutral-100`), spacious grid gutters, and minimal ambient star or constellation patterns. Completely avoids telemetry panels, diagnostic terminal output lines, or neon grid layouts.
- **Interactive Experience:** Smooth card expansions, micro-interactive hover behaviors, responsive tabs, and spring animations.

---

## 10. Known Problems and Technical Debt

1. **Client-Side Storage Capacity:** While IndexedDB has successfully mitigated the storage limit for chat images, any large-scale session history or message payload will ultimately slow down browser parsing of LocalStorage.
2. **Polling for Messages:** The simulation of live messaging relies on `setInterval` polls inside `subscribeToMessages` every 1500ms. This should be replaced with real-time push subscriptions (Supabase Realtime or WebSockets) in future database integrations.
3. **Simulated State Persistence:** If the user closes the tab mid-onboarding or during payment, partial steps may fall out of sync since state machines are maintained within React hooks.
4. **Mocked Locations:** City and district dropdown selections in birth detail forms currently use hardcoded mock entries instead of a full geographical geolocation database.
5. **Split Wallet State Storage:** The app runs on two parallel, unsynchronized wallet state stores: `kundli_nova_wallet` (used for the user-facing Wallet screen) and `kundli_nova_wallet_balance` / `kundli_nova_transactions` (used by background consultation chat services). Integrating or recharging via the UI does not currently affect the consultation debit loop. They must be merged into a single state/query repository.
6. **Diverged KundliData Schemas:** The `KundliData` type has two distinct structure declarations across `src/services/kundliStorage.ts` and `src/services/astrologyServices.ts`. The former maps to detailed multi-attribute insights, summaries, and birth details, while the latter represents a simpler, flat structural list of degrees and positions for chat session caching. These models should be unified.

---

## 11. Supabase Migration Plan

To upgrade the application from client-side simulation to a secure cloud platform, we recommend migrating the current state entities to these Postgres schemas:

```
                  ┌─────────────────┐
                  │    profiles     │
                  └────────┬────────┘
                           │ 1
                           │
             ┌─────────────┼──────────────┐
           1 │           1 │            1 │
             ▼             ▼              ▼
   ┌───────────┐   ┌──────────────┐   ┌──────────────┐
   │  wallets  │   │ consultations│   │ conversation │
   └─────┬─────┘   └───────┬──────┘   └──────┬───────┘
         │ 1               │ 1               │ 1
         │                 │                 │
         ▼ *               ▼ *               ▼ *
   ┌───────────┐   ┌──────────────┐   ┌──────────────┐
   │transactions│  │   messages   │   │ messages     │
   └───────────┘   └──────────────┘   └──────────────┘
```

### Proposed Table Definitions

#### 1. `profiles`
- **Purpose:** Stores user records and birth details.
- **Fields:** `id` (UUID, PK), `full_name` (Text), `gender` (Text), `dob` (Date), `tob` (Time), `state` (Text), `district` (Text), `city` (Text), `created_at` (Timestamp).

#### 2. `astrologers`
- **Purpose:** Central expert directory.
- **Fields:** `id` (UUID, PK), `name` (Text), `image_url` (Text), `experience` (Text), `languages` (Array), `skills` (Array), `rating` (Numeric), `price_per_minute` (Numeric), `is_online` (Boolean), `about` (Text).

#### 3. `wallet_accounts`
- **Purpose:** Tracks active user balances.
- **Fields:** `id` (UUID, PK), `profile_id` (UUID, FK -> `profiles.id`), `balance` (Numeric), `updated_at` (Timestamp).

#### 4. `wallet_transactions`
- **Purpose:** Financial ledger of recharges and consult debits.
- **Fields:** `id` (UUID, PK), `wallet_id` (UUID, FK), `type` (Text, 'credit'|'debit'), `amount` (Numeric), `description` (Text), `created_at` (Timestamp).

#### 5. `consultations`
- **Purpose:** Consultation historical details.
- **Fields:** `id` (UUID, PK), `user_id` (UUID, FK), `astrologer_id` (UUID, FK), `status` (Text), `elapsed_seconds` (Integer), `total_charged` (Numeric), `created_at` (Timestamp), `ended_at` (Timestamp).

#### 6. `messages`
- **Purpose:** Stores chat dialogue.
- **Fields:** `id` (UUID, PK), `consultation_id` (UUID, FK), `sender_type` (Text, 'user'|'astrologer'|'system'), `content` (Text), `type` (Text, 'text'|'image'|'pdf'), `attachment_url` (Text), `created_at` (Timestamp).

#### 7. `kundli_profiles`
- **Purpose:** Multiple saved Kundlis for self/friends/family.
- **Fields:** `id` (UUID, PK), `creator_profile_id` (UUID, FK), `name` (Text), `gender` (Text), `dob` (Date), `tob` (Time), `city` (Text), `state` (Text), `created_at` (Timestamp).

---

## 12. Astrology Engine Integration Context

To maintain performance, reliability, and security, the application should adhere to a strict **full-stack proxy architecture**:

```
[ React SPA Client ] ──> [ Custom Express /api Backend ] ──> [ Open-Source Astrology Engine ]
                                                                        │
                                                                        ▼
                                                             [ Database & AI Interpretations ]
```

### Core Architecture Guidelines:
1. **No Direct Client API Calls:** The React client MUST NOT connect directly to any third-party astrology calculation API. All requests must go through the backend Express route proxy to protect API tokens and easily switch computation providers in the future.
2. **Calculation Source:** The calculations are currently deterministic. In the future, these can be replaced in the backend with a standardized open-source astrology calculation engine such as **VedAstro**, **Swiss Ephemeris**, or another secure ephemeris microservice.
3. **Response Schema Caching:** Standard calculations (planetary longitudes, house boundaries, panchang charts) should be stored in the database cache so that repeat profile inspections do not trigger redundant API calculations.

---

## 13. Recommended Next Development Order

For a smooth development continuation, implement features in this sequence:

1. **State Cleanups & Refinements:** Resolve any remaining layout glitches or connection state loops in the current frontend code.
2. **Configure Environment Variables:** Ensure secure keys are mapped out in the development `.env` context.
3. **Set Up Supabase Base Project:** Provision the Supabase dashboard and map the relational schemas outlined in Section 11.
4. **Implement User Registration & JWT Auth:** Integrate Supabase Authentication and update the splash routing.
5. **Database Service Migration:** Rewrite `astrologyServices.ts` methods to call secure Supabase client RPCs or API proxy queries, migrating data gradually from `localStorage` store-by-store.
6. **Live Realtime Chat Sync:** Replace the messages interval poll logic with Supabase Realtime client push-subscriptions for immediate message deliveries.
7. **Astrology Calculation Proxy:** Update the backend Express server with secure ephemeris proxies to deliver live planetary grids.
8. **Multi-Profile Saved Lists:** Build the saved Kundli directory and profile selection dialogs.
9. **Matchmaking Engine:** Code the compatibility comparison screen using the calculation layers.

---

## 14. Rules for the Next AI Agent

To maintain pristine code quality and alignment with the Kundli Nova brand:

- **Read Before Modifying:** You MUST call `view_file` on files before editing them. Never assume layout or state schemas.
- **Vibe & Design Consistency:** Adhere strictly to the frozen **Kundli Nova Design System** specified in `AGENTS.md`. Primary orange (`#FF8A00`) is reserved for primary actions, selected states, and active highlights. White and soft neutral tones dominate.
- **Architectural Integrity:** Never implement direct third-party API calls inside React screens. All calculations, Gemini calls, and database operations must go through the Express backend proxy layer or services.
- **Durable Persistence Over Sandbox Mocking:** Maintain secure state engines. If adding features that collect critical inputs, integrate them with `localStorage` (or Supabase if active) so user progress is fully protected.
- **Refinement Over Redesign:** Do not perform unsolicited visual overhauls of completed, polished screens. Execute the required scope with layout balance, fine-grained margin precision, and elegant typography.

---

## 15. Environment Variables

- **`GEMINI_API_KEY`**: 
  - *Purpose:* Used on the server-side to initialize the Google Gen AI client.
  - *Frontend Safe:* **No!** Must never be exposed to Vite client-side code.
  - *Status:* Loaded successfully.
- **`APP_URL`**: 
  - *Purpose:* Stores the active domain URL of the app container. Used for callback setups, self-referential links, and CORS headers.
  - *Frontend Safe:* Yes.
  - *Status:* Loaded.

---

## 16. Final Project Status

### Status Ledger:

- **Fully Complete (Production-Ready Client Flows):**
  - Authentication (Login/Otp UI flow)
  - Profile Creation & Editing Forms
  - Home Screen Dashboard & Countdown Utilities
  - Astrologers Directory & Profile Screens
  - Fully Simulated Live Consultation Chat with real-time Per-Minute Credit Debiting
  - Interactive North Indian Kundli Chart with Fullscreen Pinch-to-Zoom Capabilities
  - Premium High-Resolution PDF Kundli Report Compiler
  - Multi-Bubble Gemini-powered Vedic AI Astrologer Chat Screen

- **Partially Mocked / Interactive Simulation:**
  - Phone OTP code verification gateway
  - Geolocation latitude/longitude city autocompletes
  - Expert replies during consultation chats (utilizes simulated intervals)

- **Not Started / Upcoming Backend Integrations:**
  - Live Supabase Database Migration
  - Relational Table Structures
  - Actual Ephemeris Epoc calculations
  - Multi-profile saved lists comparisons and Kundli matchmaking panels

- **Immediate Recommended Next Task:** Set up the Supabase database and schema migrations using the relational mapping outlined in Section 11 to persist user accounts, wallets, and chat histories securely in the cloud.
