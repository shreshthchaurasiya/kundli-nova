import React, { useState, useCallback } from 'react';
import { ChevronDown, User, Calendar, Clock, MapPin, Check } from 'lucide-react';
import { KundliProfile } from '../../types/kundli';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands',
  'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
  'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

export interface NewPartnerFields {
  name: string;
  gender: string;
  dob: string;
  tob: string;
  city: string;
  district: string;
  state: string;
}

interface KundliMatchingFormPanelProps {
  profiles: KundliProfile[];
  selectedProfileId: string;
  selectedProfileBId: string | null;
  onSelectProfileB: (profileId: string) => void;
  onChangeProfileA: () => void;
  /** Called when user hits Match with an existing saved profile B */
  onMatchExisting: () => void;
  /**
   * Called when user hits "Save Partner & Match".
   * Parent is responsible for creating the profile, geocoding, then triggering the API.
   */
  onSavePartnerAndMatch: (fields: NewPartnerFields) => Promise<void>;
  loading: boolean;
  /** Field-level or geocode error to surface inline */
  formError?: string | null;
}

const inputBase =
  'w-full bg-[#FCFBF8] border border-[#EBE8E0] text-[14px] font-semibold text-[#111827] rounded-xl px-4 py-3 outline-none focus:border-[#FF8A00] focus:ring-1 focus:ring-[#FF8A00]/20 transition-colors placeholder:text-neutral-400';

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export const KundliMatchingFormPanel: React.FC<KundliMatchingFormPanelProps> = ({
  profiles,
  selectedProfileId,
  selectedProfileBId,
  onSelectProfileB,
  onChangeProfileA,
  onMatchExisting,
  onSavePartnerAndMatch,
  loading,
  formError,
}) => {
  const profileA = profiles.find(p => p.id === selectedProfileId);
  const availableProfilesForB = profiles.filter(p => p.id !== selectedProfileId);

  // "new" | "saved"
  const [partnerMode, setPartnerMode] = useState<'saved' | 'new'>(
    availableProfilesForB.length > 0 ? 'saved' : 'new'
  );

  // Inline new-partner form state
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [tob, setTob] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [localError, setLocalError] = useState('');

  const getBirthDetails = (p: KundliProfile | undefined) => {
    if (!p) return null;
    return (p as any).birthDetails || p;
  };

  const birthDetailsA = getBirthDetails(profileA);

  const isExistingValid = !!selectedProfileId && !!selectedProfileBId;
  const isNewValid =
    !!name.trim() && !!gender && !!dob && !!tob && !!city.trim() && !!state.trim();

  const handleSaveAndMatch = useCallback(async () => {
    if (loading) return;
    setLocalError('');

    if (!name.trim() || !gender || !dob || !tob || !city.trim() || !state.trim()) {
      setLocalError('Please fill in all required fields before matching.');
      return;
    }

    try {
      await onSavePartnerAndMatch({ name, gender, dob, tob, city, district, state });
    } catch {
      // Parent surfaces the error via formError prop
    }
  }, [loading, name, gender, dob, tob, city, district, state, onSavePartnerAndMatch]);

  const displayError = formError || localError;

  return (
    <div className="space-y-5 pb-8 pt-2 max-w-md mx-auto w-full">
      {/* Header */}
      <div className="text-center max-w-xs mx-auto">
        <span className="text-[#FF8A00] text-[10.5px] font-[850] uppercase tracking-wider block">
          Astrology Match
        </span>
        <h3 className="text-[17px] font-[850] text-[#111827] tracking-tight mt-0.5">
          Enter Birth Details
        </h3>
        <p className="text-[11.5px] text-neutral-400 font-semibold leading-relaxed mt-1">
          Select or enter profiles to calculate Ashtakoota and Manglik compatibility.
        </p>
      </div>

      {/* ── CARD A: Your Details ── */}
      <div className="bg-white border border-[#EBE8E0] rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">
            Your Details
          </span>
          <button
            onClick={onChangeProfileA}
            className="text-[#FF8A00] text-[11px] font-[800] uppercase tracking-wider"
          >
            Change Profile
          </button>
        </div>

        {birthDetailsA ? (
          <div className="flex items-center space-x-3 w-full">
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#FF8A00] to-[#FFB74D] text-white flex items-center justify-center font-[800] text-[18px] shrink-0 shadow-sm">
              {(birthDetailsA.name as string).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-[14.5px] font-[850] text-[#111827] leading-tight truncate">
                  {birthDetailsA.name}
                </span>
                {profileA?.isDefault && (
                  <span className="text-[9px] bg-[#111827] text-white px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">
                    Default
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-1.5 text-neutral-500 text-[11px] font-semibold mt-1">
                <span>{birthDetailsA.dob}</span>
                <span className="text-neutral-300">•</span>
                <span>{birthDetailsA.tob}</span>
                <span className="text-neutral-300">•</span>
                <span className="truncate">{birthDetailsA.city || birthDetailsA.birth_city}</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[12px] text-neutral-400 font-semibold">Loading your profile…</p>
        )}
      </div>

      {/* ── CARD B: Partner Details ── */}
      <div className="bg-white border border-[#EBE8E0] rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">
            Partner Details
          </span>
          {/* Toggle */}
          <div className="flex rounded-lg overflow-hidden border border-[#EBE8E0] text-[10.5px] font-[800]">
            <button
              onClick={() => setPartnerMode('saved')}
              className={`px-3 py-1.5 transition-colors ${
                partnerMode === 'saved'
                  ? 'bg-[#FF8A00] text-white'
                  : 'bg-white text-neutral-500 hover:bg-[#FFFDF9]'
              }`}
            >
              Saved
            </button>
            <button
              onClick={() => setPartnerMode('new')}
              className={`px-3 py-1.5 transition-colors ${
                partnerMode === 'new'
                  ? 'bg-[#FF8A00] text-white'
                  : 'bg-white text-neutral-500 hover:bg-[#FFFDF9]'
              }`}
            >
              New
            </button>
          </div>
        </div>

        {/* ── Saved Profile Mode ── */}
        {partnerMode === 'saved' && (
          <div className="space-y-3">
            {availableProfilesForB.length === 0 ? (
              <div className="text-center py-4 bg-[#FCFBF8] border border-[#EBE8E0] rounded-xl">
                <p className="text-[12px] text-neutral-500 font-semibold px-4">
                  No other saved profiles. Switch to "New" to add a partner.
                </p>
              </div>
            ) : (
              <div className="relative">
                <select
                  id="partner-profile-select"
                  className={`${inputBase} appearance-none pr-10`}
                  value={selectedProfileBId || ''}
                  onChange={e => onSelectProfileB(e.target.value)}
                >
                  <option value="" disabled>
                    Select partner profile…
                  </option>
                  {availableProfilesForB.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.relation})
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-neutral-400">
                  <ChevronDown size={16} strokeWidth={2.5} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── New Partner Mode ── */}
        {partnerMode === 'new' && (
          <div className="space-y-3">
            <p className="text-[10.5px] text-neutral-400 font-semibold leading-snug bg-[#FFF9F0] border border-[#F5E6D3] rounded-lg px-3 py-2">
              Partner details will be saved to your Kundli profiles before matching.
            </p>

            {/* Name */}
            <div className="relative flex items-center">
              <User size={15} className="absolute left-3.5 text-neutral-400 pointer-events-none" />
              <input
                id="partner-name"
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setLocalError(''); }}
                placeholder="Partner's full name"
                className={`${inputBase} pl-9`}
              />
            </div>

            {/* Gender */}
            <div className="grid grid-cols-3 gap-2">
              {GENDER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  id={`partner-gender-${opt.value}`}
                  onClick={() => { setGender(opt.value); setLocalError(''); }}
                  className={`py-2.5 rounded-xl border text-[12.5px] font-[800] transition-colors flex items-center justify-center space-x-1 ${
                    gender === opt.value
                      ? 'bg-[#FF8A00] text-white border-[#FF8A00]'
                      : 'bg-[#FCFBF8] text-neutral-600 border-[#EBE8E0] hover:border-[#FF8A00]/40'
                  }`}
                >
                  {gender === opt.value && <Check size={12} strokeWidth={3} />}
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>

            {/* DOB */}
            <div className="relative flex items-center">
              <Calendar size={15} className="absolute left-3.5 text-neutral-400 pointer-events-none" />
              <input
                id="partner-dob"
                type="date"
                value={dob}
                onChange={e => { setDob(e.target.value); setLocalError(''); }}
                max={new Date().toISOString().split('T')[0]}
                className={`${inputBase} pl-9`}
              />
            </div>

            {/* TOB */}
            <div className="relative flex items-center">
              <Clock size={15} className="absolute left-3.5 text-neutral-400 pointer-events-none" />
              <input
                id="partner-tob"
                type="time"
                value={tob}
                onChange={e => { setTob(e.target.value); setLocalError(''); }}
                className={`${inputBase} pl-9`}
              />
            </div>

            {/* City */}
            <div className="relative flex items-center">
              <MapPin size={15} className="absolute left-3.5 text-neutral-400 pointer-events-none" />
              <input
                id="partner-city"
                type="text"
                value={city}
                onChange={e => { setCity(e.target.value); setLocalError(''); }}
                placeholder="Birth city / town"
                className={`${inputBase} pl-9`}
              />
            </div>

            {/* District (optional) */}
            <input
              id="partner-district"
              type="text"
              value={district}
              onChange={e => { setDistrict(e.target.value); }}
              placeholder="District (optional)"
              className={inputBase}
            />

            {/* State */}
            <div className="relative">
              <select
                id="partner-state"
                value={state}
                onChange={e => { setState(e.target.value); setLocalError(''); }}
                className={`${inputBase} appearance-none pr-10`}
              >
                <option value="" disabled>
                  Select state…
                </option>
                {INDIAN_STATES.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-neutral-400">
                <ChevronDown size={16} strokeWidth={2.5} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {displayError && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <p className="text-[12px] text-red-600 font-semibold leading-snug">{displayError}</p>
        </div>
      )}

      {/* Action Button */}
      <button
        id="matching-action-btn"
        onClick={partnerMode === 'new' ? handleSaveAndMatch : onMatchExisting}
        disabled={loading || (partnerMode === 'saved' ? !isExistingValid : !isNewValid)}
        className="w-full py-4 bg-[#FF8A00] text-white rounded-2xl text-[14px] font-[850] shadow-[0_4px_14px_rgba(255,138,0,0.3)] active:scale-[0.98] transition-all flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#E07A00]"
      >
        {loading ? (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>
              {partnerMode === 'new' ? 'Saving Partner & Calculating…' : 'Calculating Compatibility…'}
            </span>
          </div>
        ) : partnerMode === 'new' ? (
          'Save Partner & Match'
        ) : (
          'Match Profiles'
        )}
      </button>
    </div>
  );
};
