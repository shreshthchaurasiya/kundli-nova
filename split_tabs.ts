import * as fs from 'fs';
const filePath = 'src/astrologer-workspace/dashboard/screens/AstrologerDashboardScreen.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

const oldProfileRender = `{currentTab === 'profile' && (
          <section className="space-y-4">
            <div className="rounded-[24px] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-neutral-100">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-3">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] bg-orange-50">
                    {profile.image ? <img src={profile.image} alt={profile.name} className="h-full w-full object-cover" /> : <UserRound size={28} className="text-[#FF8A00]" />}
                  </div>
                  <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 border-[2.5px] border-white shadow-sm">
                    <BadgeCheck size={14} className="text-white" />
                  </div>
                </div>
                <h2 className="text-xl font-black text-neutral-900 tracking-tight">{profile.name}</h2>
                <div className="mt-1.5 flex items-center justify-center gap-2">
                  <span className="rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#FF8A00]">Level 2 Astrologer</span>
                  <span className="text-[12px] font-bold text-neutral-400">•</span>
                  <span className="text-[13px] font-bold text-neutral-600">{formatMoney(profile.pricePerMinute)}/min</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                 <div className="rounded-2xl border border-neutral-100 bg-neutral-50/50 p-4 text-center">
                   <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total Consults</p>
                   <p className="mt-1 text-2xl font-black text-neutral-900">{(summary.completedToday * 18) + 42}</p>
                 </div>
                 <div className="rounded-2xl border border-emerald-50 bg-emerald-50/30 p-4 text-center">
                   <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/70">All-Time Earnings</p>
                   <p className="mt-1 text-2xl font-black text-emerald-600">₹{((summary.completedToday * 280) + 12450).toLocaleString('en-IN')}</p>
                 </div>
              </div>

              <div className="mt-6 pt-5 border-t border-neutral-100">
                <p className="text-xs font-black text-neutral-900 mb-4">This Week's Activity</p>
                <div className="flex h-28 items-end justify-between gap-1.5 px-2">
                  {['M','T','W','T','F','S','S'].map((day, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 flex-1">
                      <div className="w-full bg-[#FF8A00] rounded-sm opacity-80" style={{ height: \`\${Math.max(15, Math.random() * 100)}%\` }} />
                      <span className="text-[9px] font-bold text-neutral-400">{day}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => onNavigate('manage-astrologer-profile')} className="flex flex-col items-center justify-center gap-2 rounded-[20px] border border-neutral-100 bg-white p-4 shadow-[0_4px_15px_rgba(0,0,0,0.02)] active:scale-[0.98] transition-transform">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-[#FF8A00]"><Pencil size={18} /></span>
                <span className="text-[12px] font-black text-neutral-800">Edit Profile</span>
              </button>
              <button type="button" onClick={() => onNavigate('astrologer-profile', { astrologerId: profile.id })} className="flex flex-col items-center justify-center gap-2 rounded-[20px] border border-neutral-100 bg-white p-4 shadow-[0_4px_15px_rgba(0,0,0,0.02)] active:scale-[0.98] transition-transform">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-500"><Eye size={18} /></span>
                <span className="text-[12px] font-black text-neutral-800">Preview</span>
              </button>
            </div>
          </section>
        )}`;

const newRender = `{currentTab === 'earnings' && (
          <section className="space-y-4">
            <div className="rounded-[24px] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-neutral-100">
              <div className="grid grid-cols-2 gap-3">
                 <div className="rounded-2xl border border-neutral-100 bg-neutral-50/50 p-4 text-center">
                   <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total Consults</p>
                   <p className="mt-1 text-2xl font-black text-neutral-900">{(summary.completedToday * 18) + 42}</p>
                 </div>
                 <div className="rounded-2xl border border-emerald-50 bg-emerald-50/30 p-4 text-center">
                   <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/70">All-Time Earnings</p>
                   <p className="mt-1 text-2xl font-black text-emerald-600">₹{((summary.completedToday * 280) + 12450).toLocaleString('en-IN')}</p>
                 </div>
              </div>

              <div className="mt-6 pt-5 border-t border-neutral-100">
                <p className="text-xs font-black text-neutral-900 mb-4">This Week's Activity</p>
                <div className="flex h-28 items-end justify-between gap-1.5 px-2">
                  {['M','T','W','T','F','S','S'].map((day, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 flex-1">
                      <div className="w-full bg-emerald-400 rounded-sm opacity-80" style={{ height: \`\${Math.max(15, Math.random() * 100)}%\` }} />
                      <span className="text-[9px] font-bold text-neutral-400">{day}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {currentTab === 'profile' && (
          <section className="space-y-4">
            <div className="rounded-[24px] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-neutral-100">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-3">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] bg-orange-50">
                    {profile.image ? <img src={profile.image} alt={profile.name} className="h-full w-full object-cover" /> : <UserRound size={28} className="text-[#FF8A00]" />}
                  </div>
                  <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 border-[2.5px] border-white shadow-sm">
                    <BadgeCheck size={14} className="text-white" />
                  </div>
                </div>
                <h2 className="text-xl font-black text-neutral-900 tracking-tight">{profile.name}</h2>
                <div className="mt-1.5 flex items-center justify-center gap-2">
                  <span className="rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#FF8A00]">Level 2 Astrologer</span>
                  <span className="text-[12px] font-bold text-neutral-400">•</span>
                  <span className="text-[13px] font-bold text-neutral-600">{formatMoney(profile.pricePerMinute)}/min</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => onNavigate('manage-astrologer-profile')} className="flex flex-col items-center justify-center gap-2 rounded-[20px] border border-neutral-100 bg-white p-4 shadow-[0_4px_15px_rgba(0,0,0,0.02)] active:scale-[0.98] transition-transform">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-[#FF8A00]"><Pencil size={18} /></span>
                <span className="text-[12px] font-black text-neutral-800">Edit Profile</span>
              </button>
              <button type="button" onClick={() => onNavigate('astrologer-profile', { astrologerId: profile.id })} className="flex flex-col items-center justify-center gap-2 rounded-[20px] border border-neutral-100 bg-white p-4 shadow-[0_4px_15px_rgba(0,0,0,0.02)] active:scale-[0.98] transition-transform">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-500"><Eye size={18} /></span>
                <span className="text-[12px] font-black text-neutral-800">Preview</span>
              </button>
            </div>
          </section>
        )}`;

content = content.replace(oldProfileRender, newRender);
fs.writeFileSync(filePath, content);
console.log('Tabs split successfully');
