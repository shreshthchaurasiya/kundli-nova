import React, { useEffect, useState } from 'react';
import { ArrowLeft, BadgeCheck, Camera, Eye, LoaderCircle, Save, CheckCircle2, AlertCircle, Languages, Sparkles } from 'lucide-react';
import { useAstrologerPartner } from '../../../features/astrologer/partner/AstrologerPartnerContext';
import { astrologerPartnerService } from '../../../features/astrologer/partner/astrologerPartnerService';
import { ASTROLOGER_LANGUAGES, ASTROLOGER_SKILLS } from '../../../features/astrologer/shared/constants';
import { Screen } from '../../../types';

interface AstrologerProfileEditorScreenProps {
  onNavigate: (screen: Screen, params?: unknown) => void;
}

export default function AstrologerProfileEditorScreen({ onNavigate }: AstrologerProfileEditorScreenProps) {
  const { publicProfile, updatePublicProfile } = useAstrologerPartner();
  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [experience, setExperience] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [about, setAbout] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!publicProfile) return;
    setName(publicProfile.name);
    setImage(publicProfile.image);
    setExperience(publicProfile.experience);
    setLanguages(publicProfile.languages);
    setSkills(publicProfile.skills);
    setAbout(publicProfile.about);
  }, [publicProfile]);

  if (!publicProfile) {
    return <div className="flex h-full flex-col items-center justify-center bg-white px-8 text-center"><BadgeCheck size={34} className="text-neutral-300" /><h1 className="mt-4 text-lg font-black text-neutral-900">Approved profile not available</h1><p className="mt-2 text-xs font-medium leading-relaxed text-neutral-500">Your profile becomes editable after the application is approved.</p><button onClick={() => onNavigate('partner-with-us')} className="mt-5 rounded-full bg-[#FF8A00] px-5 py-2.5 text-xs font-bold text-white">View application</button></div>;
  }

  const toggle = (values: string[], value: string, setter: (next: string[]) => void) => setter(values.includes(value) ? values.filter(item => item !== value) : [...values, value]);

  const uploadPhoto = async (file?: File) => {
    if (!file) return;
    setIsSaving(true);
    setMessage('');
    try { setImage(await astrologerPartnerService.uploadProfilePhoto(file)); }
    catch (caught) { setMessage(caught instanceof Error ? caught.message : 'Photo upload failed.'); }
    finally { setIsSaving(false); }
  };

  const save = async () => {
    if (!name.trim() || !image || !experience.trim() || !about.trim() || languages.length === 0 || skills.length === 0) {
      setMessage('Complete every public profile field before saving.');
      return;
    }
    setIsSaving(true);
    setMessage('');
    try {
      await updatePublicProfile({ name, image, experience, languages, skills, about });
      setMessage('Profile updated. Customers can now see the latest information.');
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Profile update failed.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <header className="flex items-center gap-3 border-b border-neutral-100 px-5 py-4">
        <button onClick={() => onNavigate('astrologer-dashboard')} className="-ml-2 rounded-full p-2 text-neutral-700 active:bg-neutral-100"><ArrowLeft size={21} /></button>
        <div className="min-w-0 flex-1"><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-600">Verified professional</p><h1 className="truncate text-lg font-black text-neutral-900">Manage public profile</h1></div>
        <button onClick={() => onNavigate('astrologer-profile', { astrologerId: publicProfile.id })} className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-2 text-[11px] font-bold text-neutral-700"><Eye size={14} /> Preview</button>
      </header>

      <main className="flex-1 space-y-5 overflow-y-auto px-5 py-6 no-scrollbar">
        <label className="flex cursor-pointer items-center gap-4 rounded-[18px] border border-dashed border-neutral-200 p-4">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100">{image ? <img src={image} alt="Profile" className="h-full w-full object-cover" /> : <Camera size={24} className="text-neutral-400" />}</span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-neutral-900">Update professional photo</span><span className="mt-1 block text-[11px] font-medium text-neutral-500">Changes appear in the user app after saving.</span></span>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => void uploadPhoto(event.target.files?.[0])} />
        </label>

        <Field label="Display name" value={name} onChange={setName} />
        <Field label="Experience" value={experience} onChange={setExperience} placeholder="Example: 8 Years" />
        <Area label="About" value={about} onChange={setAbout} />
        <Chips label="Languages" values={ASTROLOGER_LANGUAGES} selected={languages} onToggle={value => toggle(languages, value, setLanguages)} />
        <Chips label="Expertise" values={ASTROLOGER_SKILLS} selected={skills} onToggle={value => toggle(skills, value, setSkills)} />

        <div className="rounded-[16px] border border-neutral-100 bg-neutral-50 p-4">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">Approved consultation rate</p>
          <p className="mt-1 text-xl font-black text-neutral-900">₹{publicProfile.pricePerMinute}<span className="text-xs font-semibold text-neutral-400">/min</span></p>
          <p className="mt-1 text-[11px] font-medium text-neutral-500">Contact support to request a pricing review.</p>
        </div>

        {message && <p className={`rounded-xl px-3 py-2.5 text-xs font-semibold ${message.startsWith('Profile updated') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{message}</p>}
      </main>

      <footer className="border-t border-neutral-100 px-5 pb-[max(18px,env(safe-area-inset-bottom))] pt-4">
        <button onClick={() => void save()} disabled={isSaving} className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#FF8A00] text-sm font-extrabold text-white disabled:opacity-60">{isSaving ? <LoaderCircle size={18} className="animate-spin" /> : <Save size={17} />} Save public profile</button>
      </footer>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) { return <label className="block"><span className="mb-2 block text-[11px] font-extrabold uppercase tracking-wider text-neutral-500">{label}</span><input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="h-[50px] w-full rounded-[14px] border border-neutral-200 px-4 text-sm font-semibold outline-none focus:border-[#FF8A00]" /></label>; }
function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className="mb-2 block text-[11px] font-extrabold uppercase tracking-wider text-neutral-500">{label}</span><textarea value={value} onChange={event => onChange(event.target.value)} rows={6} maxLength={800} className="w-full resize-none rounded-[14px] border border-neutral-200 p-4 text-sm font-medium leading-relaxed outline-none focus:border-[#FF8A00]" /></label>; }
function Chips({ label, values, selected, onToggle }: { label: string; values: readonly string[]; selected: string[]; onToggle: (value: string) => void }) { return <div><span className="mb-2 block text-[11px] font-extrabold uppercase tracking-wider text-neutral-500">{label}</span><div className="flex flex-wrap gap-2">{values.map(value => <button key={value} onClick={() => onToggle(value)} className={`rounded-full border px-3.5 py-2 text-xs font-bold ${selected.includes(value) ? 'border-[#FF8A00] bg-[#FF8A00] text-white' : 'border-neutral-200 text-neutral-600'}`}>{value}</button>)}</div></div>; }
