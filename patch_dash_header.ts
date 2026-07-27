import * as fs from 'fs';

const filePath = 'src/features/astrologer/dashboard/screens/AstrologerDashboardScreen.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add Menu to imports
const importsOld = `import {
  ArrowLeftRight,
  ArrowRight,
  BadgeCheck,`;
const importsNew = `import {
  Menu,
  ArrowLeftRight,
  ArrowRight,
  BadgeCheck,`;
content = content.replace(importsOld, importsNew);

// 2. Update Interface
const intOld = `interface AstrologerDashboardScreenProps {
  onNavigate: (screen: Screen, params?: unknown) => void;
}`;
const intNew = `interface AstrologerDashboardScreenProps {
  onNavigate: (screen: Screen, params?: unknown) => void;
  onOpenDrawer?: () => void;
}`;
content = content.replace(intOld, intNew);

// 3. Update Component signature
const sigOld = `export default function AstrologerDashboardScreen({ onNavigate }: AstrologerDashboardScreenProps) {`;
const sigNew = `export default function AstrologerDashboardScreen({ onNavigate, onOpenDrawer }: AstrologerDashboardScreenProps) {`;
content = content.replace(sigOld, sigNew);

// 4. Update Header JSX
const headerOld = `      <header className="flex items-center gap-3 border-b border-neutral-100 bg-white px-5 py-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100">
          {profile.image ? <img src={profile.image} alt="" className="h-full w-full object-cover" /> : <UsersRound size={20} className="text-neutral-400" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="truncate text-[16px] font-black text-neutral-900">{profile.name}</h1>
            <BadgeCheck size={16} className="shrink-0 text-emerald-500" />
          </div>
          <p className="mt-0.5 text-[11px] font-semibold text-neutral-400">Astrologer workspace</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-2 text-[10px] font-bold text-neutral-600 active:bg-neutral-50"
        >
          <ArrowLeftRight size={14} /> Customer mode
        </button>
      </header>`;

const headerNew = `      <header className="flex items-center gap-3 border-b border-neutral-100 bg-white px-5 py-4">
        <button type="button" onClick={onOpenDrawer} className="mr-1 text-neutral-800 p-1 -ml-2 rounded-full active:bg-neutral-100">
          <Menu size={24} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="truncate text-[16px] font-black text-neutral-900">{profile.name}</h1>
            <BadgeCheck size={16} className="shrink-0 text-emerald-500" />
          </div>
          <p className="mt-0.5 text-[11px] font-semibold text-neutral-400">Astrologer workspace</p>
        </div>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem('kundli_nova_workspace', 'customer');
            onNavigate('home');
          }}
          className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-2 text-[10px] font-bold text-neutral-600 active:bg-neutral-50"
        >
          <ArrowLeftRight size={14} /> Switch
        </button>
      </header>`;
content = content.replace(headerOld, headerNew);

fs.writeFileSync(filePath, content);
console.log('Patched dashboard header');
