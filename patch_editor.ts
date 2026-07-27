import * as fs from 'fs';

const filePath = 'src/features/astrologer/profile/screens/AstrologerProfileEditorScreen.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

const importsOld = `import { ArrowLeft, BadgeCheck, Camera, Eye, LoaderCircle, Save } from 'lucide-react';`;
const importsNew = `import { ArrowLeft, BadgeCheck, Camera, Eye, LoaderCircle, Save, CheckCircle2, AlertCircle, Languages, Sparkles } from 'lucide-react';`;
content = content.replace(importsOld, importsNew);

// Replace Field Component
const fieldOld = `function Field({ label, value, onChange, placeholder, multiline = false, maxLength, min, max }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; maxLength?: number; min?: number; max?: number }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-neutral-900">{label}</span>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} className="min-h-[100px] w-full rounded-[14px] border border-neutral-200 bg-neutral-50 px-4 py-3 text-[13px] font-semibold text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-[#FF8A00] focus:bg-white focus:ring-4 focus:ring-[#FF8A00]/10" />
      ) : (
        <input type={typeof min === 'number' ? 'number' : 'text'} min={min} max={max} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} className="h-11 w-full rounded-[14px] border border-neutral-200 bg-neutral-50 px-4 text-[13px] font-semibold text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-[#FF8A00] focus:bg-white focus:ring-4 focus:ring-[#FF8A00]/10" />
      )}
    </label>
  );
}`;

const fieldNew = `function Field({ label, value, onChange, placeholder, multiline = false, maxLength, min, max, icon }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; maxLength?: number; min?: number; max?: number; icon?: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[12px] font-extrabold text-neutral-900 flex items-center gap-1.5">{icon} {label}</span>
        {maxLength && <span className={\`text-[10px] font-bold \${value.length >= maxLength - 20 ? 'text-orange-500' : 'text-neutral-400'}\`}>{value.length}/{maxLength}</span>}
      </div>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} className="min-h-[120px] w-full rounded-[16px] border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-[14px] font-semibold text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-[#FF8A00] focus:bg-white focus:shadow-[0_0_0_4px_rgba(255,138,0,0.1)] transition-all resize-none" />
      ) : (
        <input type={typeof min === 'number' ? 'number' : 'text'} min={min} max={max} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} className="h-12 w-full rounded-[16px] border border-neutral-200 bg-neutral-50/50 px-4 text-[14px] font-semibold text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-[#FF8A00] focus:bg-white focus:shadow-[0_0_0_4px_rgba(255,138,0,0.1)] transition-all" />
      )}
    </label>
  );
}`;
content = content.replace(fieldOld, fieldNew);

// Replace Chips Old
const chipsOld = `function Chips({ label, options, selected, onToggle }: { label: string; options: string[]; selected: string[]; onToggle: (val: string) => void }) {
  return (
    <div>
      <span className="mb-2 block text-xs font-bold text-neutral-900">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map(option => {
          const active = selected.includes(option);
          return (
            <button key={option} type="button" onClick={() => onToggle(option)} className={\`rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors \${active ? 'border-[#FF8A00] bg-orange-50 text-[#FF8A00]' : 'border-neutral-200 bg-white text-neutral-600'}\`}>
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}`;

const chipsNew = `function Chips({ label, options, selected, onToggle, icon }: { label: string; options: string[]; selected: string[]; onToggle: (val: string) => void; icon?: React.ReactNode }) {
  return (
    <div>
      <span className="mb-2 flex items-center gap-1.5 text-[12px] font-extrabold text-neutral-900">{icon} {label}</span>
      <div className="flex flex-wrap gap-2 mt-1">
        {options.map(option => {
          const active = selected.includes(option);
          return (
            <button 
              key={option} 
              type="button" 
              onClick={() => onToggle(option)} 
              className={\`flex items-center gap-1 rounded-full border px-3.5 py-1.5 text-[11px] font-extrabold transition-all active:scale-95 \${
                active ? 'border-[#FF8A00] bg-[#FF8A00] text-white shadow-md shadow-orange-500/20' : 'border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50'
              }\`}
            >
              {active && <CheckCircle2 size={12} strokeWidth={3} />}
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}`;
content = content.replace(chipsOld, chipsNew);


// Enhance the main render
const mainRenderOld = `        <label className="flex cursor-pointer items-center gap-4 rounded-[18px] border border-dashed border-neutral-200 p-4">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100">{image ? <img src={image} alt="Profile" className="h-full w-full object-cover" /> : <Camera size={24} className="text-neutral-400" />}</span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-neutral-900">Update professional photo</span><span className="mt-1 block text-[11px] font-medium text-neutral-500">Changes appear in the user app after saving.</span></span>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => void uploadPhoto(event.target.files?.[0])} />
        </label>

        <Field label="Display name" value={name} onChange={setName} />
        <Field label="Years of experience" value={experience} onChange={setExperience} placeholder="e.g. 5, 10, 15+" />
        
        <Chips label="Languages spoken" options={ASTROLOGER_LANGUAGES} selected={languages} onToggle={v => toggle(languages, v, setLanguages)} />
        <Chips label="Areas of expertise" options={ASTROLOGER_SKILLS} selected={skills} onToggle={v => toggle(skills, v, setSkills)} />
        
        <Field label="Professional bio" value={about} onChange={setAbout} placeholder="Introduce yourself to customers..." multiline />
        
        {message && <p className={\`rounded-xl px-4 py-3 text-xs font-bold \${message.includes('failed') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}\`}>{message}</p>}
      </main>

      <footer className="border-t border-neutral-100 bg-white p-5 pb-[max(20px,env(safe-area-inset-bottom))]">
        <button disabled={isSaving} onClick={() => void save()} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FF8A00] text-sm font-bold text-white shadow-lg shadow-[#FF8A00]/25 disabled:opacity-50">
          {isSaving ? <LoaderCircle size={18} className="animate-spin" /> : <Save size={18} />} Save Changes
        </button>
      </footer>`;

const mainRenderNew = `        <div className="relative mb-4 flex flex-col items-center pt-2">
          <label className="relative flex cursor-pointer group">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-orange-50 border-4 border-white shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
              {image ? <img src={image} alt="Profile" className="h-full w-full object-cover transition-transform group-hover:scale-105" /> : <Camera size={32} className="text-[#FF8A00]/50" />}
            </div>
            <div className="absolute bottom-0 right-0 rounded-full bg-white p-1.5 shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF8A00] text-white">
                <Camera size={16} />
              </div>
            </div>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => void uploadPhoto(event.target.files?.[0])} />
          </label>
          <div className="mt-4 text-center">
             <p className="text-[14px] font-black text-neutral-900">Professional Photo</p>
             <p className="mt-0.5 text-[11px] font-semibold text-neutral-400">High quality images get 40% more bookings</p>
          </div>
        </div>

        <div className="space-y-6 bg-white rounded-3xl p-5 shadow-[0_2px_20px_rgba(0,0,0,0.03)] border border-neutral-100">
          <Field label="Display Name" value={name} onChange={setName} />
          <Field label="Years of Experience" value={experience} onChange={setExperience} placeholder="e.g. 5, 10, 15+" />
        </div>
        
        <div className="space-y-6 bg-white rounded-3xl p-5 shadow-[0_2px_20px_rgba(0,0,0,0.03)] border border-neutral-100">
          <Chips label="Languages Spoken" icon={<Languages size={14} className="text-indigo-500" />} options={ASTROLOGER_LANGUAGES} selected={languages} onToggle={v => toggle(languages, v, setLanguages)} />
          <hr className="border-neutral-100" />
          <Chips label="Areas of Expertise" icon={<Sparkles size={14} className="text-orange-500" />} options={ASTROLOGER_SKILLS} selected={skills} onToggle={v => toggle(skills, v, setSkills)} />
        </div>
        
        <div className="bg-white rounded-3xl p-5 shadow-[0_2px_20px_rgba(0,0,0,0.03)] border border-neutral-100">
          <Field label="Professional Bio" value={about} onChange={setAbout} placeholder="Introduce yourself... e.g. I am a Vedic astrologer with 10 years of experience helping people find clarity..." multiline maxLength={500} />
        </div>
        
        {message && (
          <div className={\`flex items-start gap-3 rounded-2xl px-4 py-3 \${message.includes('failed') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}\`}>
             {message.includes('failed') ? <AlertCircle size={18} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={18} className="shrink-0 mt-0.5" />}
             <p className="text-[12px] font-bold leading-relaxed">{message}</p>
          </div>
        )}
      </main>

      <footer className="border-t border-neutral-100 bg-white p-5 pb-[max(20px,env(safe-area-inset-bottom))]">
        <button disabled={isSaving} onClick={() => void save()} className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-neutral-950 text-[14px] font-black text-white shadow-[0_8px_20px_rgba(0,0,0,0.15)] disabled:opacity-50 active:scale-[0.98] transition-transform">
          {isSaving ? <LoaderCircle size={20} className="animate-spin" /> : <Save size={20} />} Update Public Profile
        </button>
      </footer>`;
content = content.replace(mainRenderOld, mainRenderNew);

fs.writeFileSync(filePath, content);
console.log('Patched profile editor screen');
