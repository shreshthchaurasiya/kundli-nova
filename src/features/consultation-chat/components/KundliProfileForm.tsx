import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Calendar, Clock, MapPin, ChevronDown, Search, Check, Loader2, ShieldCheck } from 'lucide-react';
import { ApiKundliProfileRepository } from '../../../repositories/api/apiKundliProfileRepository';
import { KundliProfile } from '../../../types';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands',
  'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
  'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

const RELATION_OPTIONS = [
  { value: 'self',    label: 'Self' },
  { value: 'partner', label: 'Partner' },
  { value: 'family',  label: 'Family' },
  { value: 'friend',  label: 'Friend' },
  { value: 'other',   label: 'Other' },
];

const GENDER_OPTIONS = [
  { value: 'male',   label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other',  label: 'Other' },
];

const Field = ({ label, children, delay = 0 }: { label: string; children: React.ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay }}
    className="flex flex-col mb-5"
  >
    <label className="text-[13px] text-[#374151] font-semibold mb-2 ml-1">{label}</label>
    {children}
  </motion.div>
);

const kundliProfileRepository = new ApiKundliProfileRepository();

interface KundliProfileFormProps {
  onSuccess: (profile: KundliProfile) => void;
  onCancel?: () => void;
}

export function KundliProfileForm({ onSuccess, onCancel }: KundliProfileFormProps) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [relation, setRelation] = useState('self');
  const [dob, setDob] = useState('');
  const [tob, setTob] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [showStatePicker, setShowStatePicker] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const filteredStates = INDIAN_STATES.filter(s =>
    s.toLowerCase().includes(stateSearch.toLowerCase())
  );

  const handleSubmit = async () => {
    const trimmed = {
      name: name.trim(),
      gender,
      relation,
      dob,
      tob,
      birth_state: state.trim(),
      birth_district: district.trim(),
      birth_city: city.trim(),
    };

    if (!trimmed.name || !trimmed.gender || !trimmed.dob || !trimmed.tob || !trimmed.birth_state || !trimmed.birth_district || !trimmed.birth_city) {
      setError('Please fill in all fields before saving.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const profile = await kundliProfileRepository.createProfile({
        name: trimmed.name,
        gender: trimmed.gender as any,
        relation: trimmed.relation as any,
        ...({ dob: trimmed.dob, tob: trimmed.tob, birth_state: trimmed.birth_state, birth_district: trimmed.birth_district, birth_city: trimmed.birth_city } as any),
      });
      onSuccess(profile);
    } catch (err: any) {
      setError(err?.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#FCFBF8] font-sans antialiased relative">
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-36 pt-6">
        <Field label="Full Name" delay={0}>
          <div className="relative h-[52px] w-full bg-white rounded-2xl border border-[#E5E7EB] flex items-center px-4 gap-2.5 focus-within:border-[#FF8A00] focus-within:ring-1 focus-within:ring-[#FF8A00]/20 transition-all shadow-sm">
            <User size={16} className="text-neutral-400 shrink-0" />
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              placeholder="Enter full name"
              className="flex-1 bg-transparent border-none focus:outline-none text-[15px] text-[#111827] font-medium placeholder:text-[#9CA3AF]"
            />
          </div>
        </Field>

        <Field label="Relation" delay={0.04}>
          <div className="grid grid-cols-5 gap-2">
            {RELATION_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRelation(opt.value)}
                className={`h-[42px] rounded-xl border text-[12px] font-bold transition-all ${
                  relation === opt.value ? 'bg-[#FF8A00] text-white border-[#FF8A00]' : 'bg-white text-neutral-600 border-[#E5E7EB] hover:border-[#FF8A00]/40'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Gender" delay={0.07}>
          <div className="grid grid-cols-3 gap-2">
            {GENDER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setGender(opt.value); setError(''); }}
                className={`h-[52px] rounded-2xl border text-[13px] font-bold transition-all ${
                  gender === opt.value ? 'bg-[#FF8A00] text-white border-[#FF8A00] shadow-sm shadow-[#FF8A00]/20' : 'bg-white text-neutral-600 border-[#E5E7EB] hover:border-[#FF8A00]/40'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Date of Birth" delay={0.10}>
          <div className="relative h-[52px] w-full bg-white rounded-2xl border border-[#E5E7EB] flex items-center px-4 gap-2.5 focus-within:border-[#FF8A00] focus-within:ring-1 focus-within:ring-[#FF8A00]/20 transition-all shadow-sm">
            <Calendar size={16} className="text-neutral-400 shrink-0" />
            <input
              type="date"
              value={dob}
              max={new Date().toISOString().split('T')[0]}
              onChange={e => { setDob(e.target.value); setError(''); }}
              className="flex-1 bg-transparent border-none focus:outline-none text-[15px] text-[#111827] font-medium"
            />
          </div>
        </Field>

        <Field label="Time of Birth" delay={0.13}>
          <div className="relative h-[52px] w-full bg-white rounded-2xl border border-[#E5E7EB] flex items-center px-4 gap-2.5 focus-within:border-[#FF8A00] focus-within:ring-1 focus-within:ring-[#FF8A00]/20 transition-all shadow-sm">
            <Clock size={16} className="text-neutral-400 shrink-0" />
            <input
              type="time"
              value={tob}
              onChange={e => { setTob(e.target.value); setError(''); }}
              className="flex-1 bg-transparent border-none focus:outline-none text-[15px] text-[#111827] font-medium"
            />
          </div>
        </Field>

        <Field label="State" delay={0.16}>
          <button
            type="button"
            onClick={() => setShowStatePicker(true)}
            className="h-[52px] w-full bg-white rounded-2xl border border-[#E5E7EB] px-4 flex items-center justify-between text-[15px] font-medium shadow-sm hover:border-[#FF8A00]/40 transition-all"
          >
            <span className={state ? 'text-[#111827]' : 'text-[#9CA3AF]'}>{state || 'Select state'}</span>
            <ChevronDown size={16} className="text-neutral-400" />
          </button>
        </Field>

        <Field label="District" delay={0.19}>
          <div className="relative h-[52px] w-full bg-white rounded-2xl border border-[#E5E7EB] flex items-center px-4 gap-2.5 focus-within:border-[#FF8A00] focus-within:ring-1 focus-within:ring-[#FF8A00]/20 transition-all shadow-sm">
            <MapPin size={16} className="text-neutral-400 shrink-0" />
            <input
              type="text"
              value={district}
              onChange={e => { setDistrict(e.target.value); setError(''); }}
              placeholder="Enter district"
              className="flex-1 bg-transparent border-none focus:outline-none text-[15px] text-[#111827] font-medium placeholder:text-[#9CA3AF]"
            />
          </div>
        </Field>

        <Field label="City / Town / Village" delay={0.22}>
          <div className="relative h-[52px] w-full bg-white rounded-2xl border border-[#E5E7EB] flex items-center px-4 gap-2.5 focus-within:border-[#FF8A00] focus-within:ring-1 focus-within:ring-[#FF8A00]/20 transition-all shadow-sm">
            <MapPin size={16} className="text-neutral-400 shrink-0" />
            <input
              type="text"
              value={city}
              onChange={e => { setCity(e.target.value); setError(''); }}
              placeholder="Enter city, town or village"
              className="flex-1 bg-transparent border-none focus:outline-none text-[15px] text-[#111827] font-medium placeholder:text-[#9CA3AF]"
            />
          </div>
        </Field>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#F1EFE9] px-5 pt-4 pb-[max(20px,env(safe-area-inset-bottom))] space-y-3 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-red-600 text-[13px] font-semibold text-center bg-red-50 rounded-xl px-4 py-2.5 border border-red-100"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={saving}
              className="flex-1 h-[54px] bg-neutral-100 rounded-2xl text-neutral-700 text-[15px] font-bold border-none disabled:opacity-60 transition-all"
            >
              Cancel
            </button>
          )}
          <motion.button
            whileTap={{ scale: saving ? 1 : 0.97 }}
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 h-[54px] bg-[#FF8A00] rounded-2xl text-white text-[15px] font-black flex items-center justify-center gap-2 border-none shadow-md shadow-[#FF8A00]/20 disabled:opacity-60 transition-all"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : 'Save Profile'}
          </motion.button>
        </div>

        <div className="flex items-center justify-center gap-2 text-[11.5px] text-neutral-400 font-semibold mt-2">
          <ShieldCheck size={13} className="text-green-500 shrink-0" />
          <span>Birth details are stored securely.</span>
        </div>
      </div>

      <AnimatePresence>
        {showStatePicker && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-neutral-900/40 z-40 backdrop-blur-sm rounded-t-3xl"
              onClick={() => setShowStatePicker(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 h-[85%] bg-white rounded-t-3xl z-50 flex flex-col overflow-hidden"
            >
              <div className="px-5 pt-5 pb-3 border-b border-neutral-100">
                <h3 className="text-[16px] font-[900] text-neutral-900 mb-3">Select State</h3>
                <div className="flex items-center gap-2 h-10 bg-neutral-50 rounded-xl border border-neutral-200 px-3">
                  <Search size={15} className="text-neutral-400 shrink-0" />
                  <input
                    type="text"
                    value={stateSearch}
                    onChange={e => setStateSearch(e.target.value)}
                    placeholder="Search state…"
                    className="flex-1 bg-transparent border-none focus:outline-none text-sm text-neutral-800 font-medium placeholder:text-neutral-400"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar py-2">
                {filteredStates.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setState(s);
                      setDistrict('');
                      setCity('');
                      setShowStatePicker(false);
                      setStateSearch('');
                      setError('');
                    }}
                    className="w-full text-left px-5 py-3 flex items-center justify-between hover:bg-neutral-50 active:bg-neutral-100 transition-colors"
                  >
                    <span className="text-[14px] font-semibold text-neutral-800">{s}</span>
                    {state === s && <Check size={15} className="text-[#FF8A00]" strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
