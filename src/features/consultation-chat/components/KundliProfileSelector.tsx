import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Plus, ChevronRight, LoaderCircle, AlertCircle, Check } from 'lucide-react';
import { KundliProfile } from '../../../types/kundli';
import { Screen } from '../../../types';

interface KundliProfileSelectorProps {
  /** Called with the selected profile ID when the customer taps "Start Consultation". */
  onConfirm: (kundliProfileId: string) => void;
  /** Called when the customer taps Cancel. */
  onCancel: () => void;
  /**
   * Navigate to another screen.
   * Typed loosely to match App-level onNavigate signature; params are typed
   * internally before being passed.
   */
  onNavigate: (screen: Screen, params?: Record<string, unknown>) => void;
  /** Repository method to load profiles — injected to keep this component testable. */
  loadProfiles: () => Promise<KundliProfile[]>;
  /**
   * Repository method that calls POST /kundli-profiles/sync-self.
   * Returns the canonical self profile, or null when birth details are incomplete.
   * Injected for testability.
   */
  ensureSelfProfile: () => Promise<KundliProfile | null>;
  /** While true, the confirm button shows a spinner and is disabled. */
  isSubmitting: boolean;
  /**
   * The astrologer ID for the pending consultation.
   * Must be forwarded through any navigation so it is never lost.
   */
  astrologerId: string;
}

/**
 * Kundli profile selector displayed before starting a paid consultation.
 *
 * Consultation navigation flow:
 *   ConsultationChatScreen
 *   → KundliProfileSelector     (this component)
 *   → KundliProfileFormScreen   (profile creation — NOT nova-kundli)
 *   → KundliProfileSelector     (returns here via returnTo params)
 *   → Wallet verification
 *   → Consultation creation
 *
 * Load sequence:
 *   1. loadProfiles()
 *   2. If zero results → call ensureSelfProfile()
 *      a. Returns a profile → add to list, preselect
 *      b. Returns null (incomplete birth details) → show "Create Kundli Profile"
 *
 * Rules:
 *   - Exactly one profile  → preselect but still require explicit confirmation.
 *   - Multiple profiles    → no preselection; customer must tap to select.
 *   - Zero profiles (after sync attempt) → show "Create Kundli Profile".
 *   - Never call onConfirm automatically.
 *   - Never navigate through NovaKundliScreen for profile creation.
 */
export default function KundliProfileSelector({
  onConfirm,
  onCancel,
  onNavigate,
  loadProfiles,
  ensureSelfProfile,
  isSubmitting,
  astrologerId,
}: KundliProfileSelectorProps) {
  const [profiles,   setProfiles]   = useState<KundliProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading,  setIsLoading]  = useState(true);
  const [loadError,  setLoadError]  = useState<string | null>(null);

  const fetchAndSync = useCallback(async (cancelled: { current: boolean }) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      // 1. Load existing profiles
      const list = await loadProfiles();
      if (cancelled.current) return;

      if (list.length > 0) {
        setProfiles(list);
        // Preselect when exactly one profile; customer must still confirm.
        if (list.length === 1) setSelectedId(list[0].id);
        return;
      }

      // 2. Zero profiles — attempt idempotent self-sync (uses onboarding data).
      const synced = await ensureSelfProfile();
      if (cancelled.current) return;

      if (synced) {
        // The RPC created or returned the canonical self profile.
        // Reload to get the full list (may now have exactly one row).
        const refreshed = await loadProfiles();
        if (cancelled.current) return;
        setProfiles(refreshed);
        if (refreshed.length === 1) setSelectedId(refreshed[0].id);
      } else {
        // ensureSelfProfile returned null → birth details are incomplete.
        // Show "Create Kundli Profile" button (no profiles in list).
        setProfiles([]);
      }
    } catch (error) {
      if (!cancelled.current) setLoadError(`Error: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    } finally {
      if (!cancelled.current) setIsLoading(false);
    }
  }, [loadProfiles, ensureSelfProfile]);

  useEffect(() => {
    const cancelled = { current: false };
    void fetchAndSync(cancelled);
    return () => { cancelled.current = true; };
  }, [fetchAndSync]);

  const handleConfirm = () => {
    if (!selectedId || isSubmitting) return;
    onConfirm(selectedId);
  };

  /** Navigate to the real profile creation form, preserving consultation context. */
  const handleCreateProfile = () => {
    onNavigate('kundli-profile-form', {
      fromScreen:  'consultation-chat',
      astrologerId,
      returnTo:    'consultation-chat',
      intent:      'select-kundli-for-consultation',
    });
  };

  const relationLabel: Record<string, string> = {
    self:    'Self',
    partner: 'Partner',
    family:  'Family',
    friend:  'Friend',
    other:   'Other',
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div id="kundli-selector-loading" className="flex flex-col h-full w-full bg-white items-center justify-center gap-3">
        <LoaderCircle className="animate-spin text-[#FF8A00]" size={28} />
        <p className="text-sm font-semibold text-neutral-500">Loading Kundli profiles…</p>
      </div>
    );
  }

  // ── Error loading profiles ─────────────────────────────────────────────────
  if (loadError) {
    const cancelled = { current: false };
    return (
      <div id="kundli-selector-error" className="flex flex-col h-full w-full bg-white items-center justify-center gap-4 px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
          <AlertCircle size={24} />
        </div>
        <p className="text-sm font-semibold text-neutral-700">{loadError}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="h-11 px-5 rounded-xl bg-neutral-100 text-neutral-700 text-xs font-bold"
          >
            Go Back
          </button>
          <button
            onClick={() => void fetchAndSync(cancelled)}
            className="h-11 px-5 rounded-xl bg-[#FF8A00] text-white text-xs font-black"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── No profiles (birth details incomplete after sync attempt) ─────────────
  if (profiles.length === 0) {
    return (
      <div id="kundli-selector-empty" className="flex flex-col h-full w-full bg-white items-center justify-center gap-6 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF8A00]">
          <User size={28} />
        </div>
        <div className="space-y-2 max-w-xs">
          <h2 className="text-lg font-[900] text-neutral-900 tracking-tight">No Kundli Profile Found</h2>
          <p className="text-neutral-500 text-xs font-semibold leading-relaxed">
            To start a paid consultation, you need at least one saved Kundli profile so the astrologer can
            prepare your chart before accepting.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <motion.button
            id="create-kundli-profile-button"
            whileTap={{ scale: 0.97 }}
            onClick={handleCreateProfile}
            className="h-12 w-full rounded-xl bg-[#FF8A00] text-white text-sm font-black flex items-center justify-center gap-2 border-none"
          >
            <Plus size={16} />
            Create Kundli Profile
          </motion.button>
          <button
            id="kundli-selector-cancel-button"
            onClick={onCancel}
            className="h-11 w-full rounded-xl bg-neutral-100 text-neutral-700 text-xs font-bold border-none"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── One or more profiles ───────────────────────────────────────────────────
  return (
    <div id="kundli-selector-root" className="flex flex-col h-full w-full bg-white">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 border-b border-neutral-100">
        <p className="text-[10px] font-bold text-[#FF8A00] uppercase tracking-widest mb-1">Step 1 of 1</p>
        <h2 className="text-lg font-[900] text-neutral-900 tracking-tight">Select Kundli Profile</h2>
        <p className="text-xs font-medium text-neutral-500 mt-1 leading-relaxed">
          {profiles.length === 1
            ? 'Your saved profile is ready. Confirm to share it with the astrologer.'
            : 'Choose the person whose chart the astrologer should prepare.'}
        </p>
      </div>

      {/* Profile list */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5 no-scrollbar">
        <AnimatePresence>
          {profiles.map((profile) => {
            const isSelected = selectedId === profile.id;
            // Support both the legacy nested birthDetails shape and the flat DB shape
            const dob: string | undefined =
              (profile as any).birthDetails?.dateOfBirth ??
              (profile as any).dob ??
              undefined;
            return (
              <motion.button
                key={profile.id}
                id={`kundli-profile-option-${profile.id}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedId(profile.id)}
                className={`w-full text-left rounded-2xl border transition-all duration-150 p-4 flex items-center gap-3 ${
                  isSelected
                    ? 'border-[#FF8A00]/40 bg-[#FFF5ED]'
                    : 'border-neutral-100 bg-white hover:bg-neutral-50'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                    isSelected ? 'bg-[#FF8A00] text-white' : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {profile.name.trim().charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-extrabold text-neutral-900 truncate">{profile.name}</p>
                  <p className="text-[11px] font-medium text-neutral-500 mt-0.5">
                    {relationLabel[profile.relation] ?? profile.relation}
                    {dob
                      ? ` · ${new Date(dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                      : ''}
                  </p>
                </div>

                {/* Selection indicator */}
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? 'border-[#FF8A00] bg-[#FF8A00]' : 'border-neutral-300 bg-white'
                  }`}
                >
                  {isSelected && <Check size={11} strokeWidth={3} className="text-white" />}
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer actions */}
      <div className="px-5 py-4 border-t border-neutral-100 bg-white space-y-2.5">
        <motion.button
          id="kundli-selector-confirm-button"
          whileTap={{ scale: selectedId && !isSubmitting ? 0.97 : 1 }}
          onClick={handleConfirm}
          disabled={!selectedId || isSubmitting}
          className="h-12 w-full rounded-xl bg-[#FF8A00] text-white text-sm font-black flex items-center justify-center gap-2 border-none disabled:opacity-50"
        >
          {isSubmitting ? (
            <><LoaderCircle size={16} className="animate-spin" /> Starting…</>
          ) : (
            <>Start Consultation <ChevronRight size={15} /></>
          )}
        </motion.button>
        <button
          id="kundli-selector-cancel-bottom-button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="h-11 w-full rounded-xl bg-neutral-100 text-neutral-700 text-xs font-bold border-none disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
