import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, Check, FileCheck2, LoaderCircle, Save, ShieldCheck, Upload } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../auth';
import { useProfile } from '../contexts/ProfileContext';
import {
  ASTROLOGER_LANGUAGES,
  ASTROLOGER_SKILLS,
  AstrologerApplicationDraft,
  CONSULTATION_MODES,
  astrologerPartnerService,
  useAstrologerPartner,
} from '../features/astrologer';
import { Screen } from '../types';

interface AstrologerApplicationScreenProps {
  onNavigate: (screen: Screen) => void;
}

const STEPS = ['Identity', 'Expertise', 'Public profile', 'Verification'] as const;

const emptyDraft: AstrologerApplicationDraft = {
  legalName: '', displayName: '', email: '', phone: '', panNumber: '',
  experienceYears: null, languages: [], skills: [], qualification: '',
  consultationModes: [], about: '', requestedPricePerMinute: null,
  profilePhotoUrl: '', panDocumentPath: '', certificatePaths: [],
};

export default function AstrologerApplicationScreen({ onNavigate }: AstrologerApplicationScreenProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { application, saveDraft, submit } = useAstrologerPartner();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<AstrologerApplicationDraft>(emptyDraft);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (application?.status === 'pending' || application?.status === 'approved' || application?.status === 'suspended') {
      onNavigate('partner-with-us');
      return;
    }

    setDraft({
      ...emptyDraft,
      legalName: application?.legalName || profile?.name || '',
      displayName: application?.displayName || profile?.name || '',
      email: application?.email || profile?.email || user?.email || '',
      phone: application?.phone || profile?.phone || user?.phone || '',
      panNumber: application?.panNumber || '',
      experienceYears: application?.experienceYears ?? null,
      languages: application?.languages ?? [],
      skills: application?.skills ?? [],
      qualification: application?.qualification || '',
      consultationModes: application?.consultationModes ?? [],
      about: application?.about || '',
      requestedPricePerMinute: application?.requestedPricePerMinute ?? null,
      profilePhotoUrl: application?.profilePhotoUrl || '',
      panDocumentPath: application?.panDocumentPath || '',
      certificatePaths: application?.certificatePaths ?? [],
    });
  }, [application, onNavigate, profile, user]);

  const progress = useMemo(() => ((step + 1) / STEPS.length) * 100, [step]);

  const update = <K extends keyof AstrologerApplicationDraft>(key: K, value: AstrologerApplicationDraft[K]) => {
    setDraft(current => ({ ...current, [key]: value }));
    setError('');
  };

  const toggle = (key: 'languages' | 'skills' | 'consultationModes', value: string) => {
    const values = draft[key];
    update(key, values.includes(value) ? values.filter(item => item !== value) : [...values, value]);
  };

  const validateStep = (): string | null => {
    if (step === 0 && (!draft.legalName.trim() || !draft.displayName.trim() || !draft.email.trim() || !draft.phone.trim())) {
      return 'Please complete all identity fields.';
    }
    if (step === 1 && (draft.experienceYears === null || draft.languages.length === 0 || draft.skills.length === 0 || draft.consultationModes.length === 0)) {
      return 'Add experience, at least one language, expertise and consultation mode.';
    }
    if (step === 2 && (!draft.profilePhotoUrl || draft.about.trim().length < 80 || draft.requestedPricePerMinute === null)) {
      return 'Add a profile photo, an introduction of at least 80 characters and your requested rate.';
    }
    if (step === 3 && (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(draft.panNumber) || !draft.panDocumentPath)) {
      return 'Enter a valid PAN and upload the PAN verification document.';
    }
    return null;
  };

  const handleNext = async () => {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      if (step === STEPS.length - 1) {
        await submit(draft);
        onNavigate('partner-with-us');
      } else {
        await saveDraft(draft);
        setStep(current => current + 1);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save your application.');
    } finally {
      setIsSaving(false);
    }
  };

  const uploadPhoto = async (file?: File) => {
    if (!file) return;
    setIsSaving(true);
    setError('');
    try {
      update('profilePhotoUrl', await astrologerPartnerService.uploadProfilePhoto(file));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Photo upload failed.');
    } finally {
      setIsSaving(false);
    }
  };

  const uploadDocument = async (file?: File, certificate = false) => {
    if (!file) return;
    setIsSaving(true);
    setError('');
    try {
      const path = await astrologerPartnerService.uploadVerificationDocument(file);
      if (certificate) update('certificatePaths', [...draft.certificatePaths, path]);
      else update('panDocumentPath', path);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Document upload failed.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <header className="border-b border-neutral-100 px-5 pb-4 pt-4">
        <div className="flex items-center gap-3">
          <button onClick={() => step > 0 ? setStep(step - 1) : onNavigate('partner-with-us')} className="-ml-2 rounded-full p-2 text-neutral-700 active:bg-neutral-100">
            <ArrowLeft size={21} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#FF8A00]">Step {step + 1} of {STEPS.length}</p>
            <h1 className="truncate text-lg font-black text-neutral-900">{STEPS[step]}</h1>
          </div>
          <ShieldCheck size={20} className="text-emerald-500" />
        </div>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-neutral-100">
          <motion.div animate={{ width: `${progress}%` }} className="h-full rounded-full bg-[#FF8A00]" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-6 no-scrollbar">
        {step === 0 && (
          <FormSection title="Account & identity" subtitle="Use your legal information for verification. Your public name can be different.">
            <TextField label="Legal name (as on PAN)" value={draft.legalName} onChange={value => update('legalName', value)} />
            <TextField label="Public display name" value={draft.displayName} onChange={value => update('displayName', value)} />
            <TextField label="Email" type="email" value={draft.email} onChange={value => update('email', value)} disabled={Boolean(user?.email)} />
            <TextField label="Phone number" type="tel" value={draft.phone} onChange={value => update('phone', value)} />
            <p className="rounded-xl bg-neutral-50 px-3 py-2.5 text-[11px] font-medium leading-relaxed text-neutral-500">
              This application stays linked to your current Kundli Nova account. A separate login is not created.
            </p>
          </FormSection>
        )}

        {step === 1 && (
          <FormSection title="Professional experience" subtitle="Select information that accurately represents your practice.">
            <NumberField label="Years of experience" value={draft.experienceYears} onChange={value => update('experienceYears', value)} />
            <TextField label="Qualification / certification" value={draft.qualification} onChange={value => update('qualification', value)} placeholder="Example: Jyotish Acharya" />
            <ChipField label="Languages" values={ASTROLOGER_LANGUAGES} selected={draft.languages} onToggle={value => toggle('languages', value)} />
            <ChipField label="Expertise" values={ASTROLOGER_SKILLS} selected={draft.skills} onToggle={value => toggle('skills', value)} />
            <ChipField label="Consultation modes" values={CONSULTATION_MODES} selected={draft.consultationModes} onToggle={value => toggle('consultationModes', value)} />
          </FormSection>
        )}

        {step === 2 && (
          <FormSection title="Public profile" subtitle="This is how customers will discover you after approval.">
            <label className="flex cursor-pointer items-center gap-4 rounded-[18px] border border-dashed border-neutral-200 p-4 active:bg-neutral-50">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-neutral-400">
                {draft.profilePhotoUrl ? <img src={draft.profilePhotoUrl} alt="Profile preview" className="h-full w-full object-cover" /> : <Camera size={23} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold text-neutral-900">Professional photo</span>
                <span className="mt-1 block text-[11px] font-medium text-neutral-500">JPG, PNG or WebP · maximum 5 MB</span>
              </span>
              <Upload size={18} className="text-[#FF8A00]" />
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => void uploadPhoto(event.target.files?.[0])} />
            </label>
            <TextArea label="Professional introduction" value={draft.about} onChange={value => update('about', value)} maxLength={800} />
            <NumberField label="Requested price per minute (₹)" value={draft.requestedPricePerMinute} onChange={value => update('requestedPricePerMinute', value)} />
            <p className="rounded-xl bg-orange-50/60 px-3 py-2.5 text-[11px] font-medium leading-relaxed text-neutral-600">
              The final customer rate is confirmed by Kundli Nova during approval. Ratings and consultation count cannot be edited manually.
            </p>
          </FormSection>
        )}

        {step === 3 && (
          <FormSection title="Verification" subtitle="Documents stay private and are never shown on your public profile.">
            <TextField label="PAN number" value={draft.panNumber} onChange={value => update('panNumber', value.toUpperCase().replace(/\s/g, ''))} maxLength={10} placeholder="ABCDE1234F" />
            <DocumentUpload
              title="PAN document"
              description="Clear image or PDF · maximum 10 MB"
              complete={Boolean(draft.panDocumentPath)}
              onChange={file => void uploadDocument(file)}
            />
            <DocumentUpload
              title="Professional certificate (optional)"
              description={`${draft.certificatePaths.length} file(s) added`}
              complete={draft.certificatePaths.length > 0}
              onChange={file => void uploadDocument(file, true)}
            />
            <div className="rounded-[18px] border border-neutral-100 bg-neutral-50/70 p-4">
              <p className="text-xs font-extrabold text-neutral-900">Before you submit</p>
              <ul className="mt-2 space-y-2 text-[11px] font-medium leading-relaxed text-neutral-500">
                <li className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-emerald-500" /> Information and documents are accurate.</li>
                <li className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-emerald-500" /> Submission cannot be edited while it is under review.</li>
                <li className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-emerald-500" /> Approval is required before your profile appears to customers.</li>
              </ul>
            </div>
          </FormSection>
        )}

        {error && <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700">{error}</p>}
      </main>

      <footer className="border-t border-neutral-100 bg-white px-5 pb-[max(18px,env(safe-area-inset-bottom))] pt-4">
        <button
          onClick={() => void handleNext()}
          disabled={isSaving}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#FF8A00] text-sm font-extrabold text-white shadow-lg shadow-orange-500/15 disabled:opacity-60"
        >
          {isSaving ? <LoaderCircle size={18} className="animate-spin" /> : step === STEPS.length - 1 ? <FileCheck2 size={18} /> : <Save size={17} />}
          <span>{isSaving ? 'Saving securely...' : step === STEPS.length - 1 ? 'Submit for review' : 'Save & continue'}</span>
          {!isSaving && step < STEPS.length - 1 && <ArrowRight size={17} />}
        </button>
      </footer>
    </div>
  );
}

function FormSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <section className="space-y-5"><div><h2 className="text-xl font-black tracking-tight text-neutral-900">{title}</h2><p className="mt-1 text-xs font-medium leading-relaxed text-neutral-500">{subtitle}</p></div>{children}</section>;
}

function TextField({ label, value, onChange, type = 'text', placeholder, disabled, maxLength }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; disabled?: boolean; maxLength?: number }) {
  return <label className="block"><span className="mb-2 block text-[11px] font-extrabold uppercase tracking-wider text-neutral-500">{label}</span><input type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} disabled={disabled} maxLength={maxLength} className="h-[50px] w-full rounded-[14px] border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#FF8A00] disabled:bg-neutral-50 disabled:text-neutral-500" /></label>;
}

function NumberField({ label, value, onChange }: { label: string; value: number | null; onChange: (value: number | null) => void }) {
  return <label className="block"><span className="mb-2 block text-[11px] font-extrabold uppercase tracking-wider text-neutral-500">{label}</span><input type="number" min="0" value={value ?? ''} onChange={event => onChange(event.target.value === '' ? null : Number(event.target.value))} className="h-[50px] w-full rounded-[14px] border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-900 outline-none focus:border-[#FF8A00]" /></label>;
}

function TextArea({ label, value, onChange, maxLength }: { label: string; value: string; onChange: (value: string) => void; maxLength: number }) {
  return <label className="block"><span className="mb-2 flex justify-between text-[11px] font-extrabold uppercase tracking-wider text-neutral-500"><span>{label}</span><span>{value.length}/{maxLength}</span></span><textarea value={value} onChange={event => onChange(event.target.value)} maxLength={maxLength} rows={6} className="w-full resize-none rounded-[14px] border border-neutral-200 bg-white p-4 text-sm font-medium leading-relaxed text-neutral-900 outline-none focus:border-[#FF8A00]" /></label>;
}

function ChipField({ label, values, selected, onToggle }: { label: string; values: readonly string[]; selected: string[]; onToggle: (value: string) => void }) {
  return <div><span className="mb-2 block text-[11px] font-extrabold uppercase tracking-wider text-neutral-500">{label}</span><div className="flex flex-wrap gap-2">{values.map(value => <button type="button" key={value} onClick={() => onToggle(value)} className={`rounded-full border px-3.5 py-2 text-xs font-bold transition ${selected.includes(value) ? 'border-[#FF8A00] bg-[#FF8A00] text-white' : 'border-neutral-200 bg-white text-neutral-600'}`}>{value}</button>)}</div></div>;
}

function DocumentUpload({ title, description, complete, onChange }: { title: string; description: string; complete: boolean; onChange: (file?: File) => void }) {
  return <label className="flex cursor-pointer items-center gap-3 rounded-[16px] border border-neutral-200 p-4 active:bg-neutral-50"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${complete ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-100 text-neutral-500'}`}>{complete ? <FileCheck2 size={19} /> : <Upload size={18} />}</span><span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-neutral-900">{title}</span><span className="mt-0.5 block text-[11px] font-medium text-neutral-500">{description}</span></span><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={event => onChange(event.target.files?.[0])} /></label>;
}

