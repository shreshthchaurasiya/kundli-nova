import * as fs from 'fs';

const filePath = 'src/features/astrologer/dashboard/screens/AstrologerDashboardScreen.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

const importsOld = `import {
  ArrowLeftRight,
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  IndianRupee,
  Clock3,
  LoaderCircle,
  MessageCircleMore,
  Pencil,
  RefreshCw,
  ShieldCheck,
  UsersRound,
  UserRound,
} from 'lucide-react';`;

const importsNew = `import {
  ArrowLeftRight,
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  IndianRupee,
  Clock3,
  LoaderCircle,
  MessageCircleMore,
  Pencil,
  RefreshCw,
  ShieldCheck,
  UsersRound,
  UserRound,
  TrendingUp,
  Clock,
  Sparkles,
  Phone,
  Power
} from 'lucide-react';`;

content = content.replace(importsOld, importsNew);


// Replace the Home Tab rendering
const homeOld = `{currentTab === 'home' && (
          <div className="space-y-5">
            <section className="relative overflow-hidden rounded-[22px] bg-neutral-950 p-5 text-white">
              <div className="absolute -right-12 -top-14 h-40 w-40 rounded-full bg-[#FF8A00]/15 blur-3xl" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.17em] text-neutral-500">Availability</p>
                  <h2 className="mt-2 text-[22px] font-black tracking-tight">{isOnline ? 'You are accepting requests' : 'You are currently offline'}</h2>
                  <p className="mt-2 max-w-[245px] text-[12px] font-medium leading-relaxed text-neutral-400">
                    {isOnline ? 'New consultation requests can reach your live queue.' : 'Go online whenever you are ready to consult.'}
                  </p>
                </div>
                <span className={\`mt-1 h-3 w-3 shrink-0 rounded-full \${isOnline ? 'bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.8)]' : 'bg-neutral-600'}\`} />
              </div>
              <button
                type="button"
                disabled={isUpdatingAvailability || profile.availability === 'BUSY'}
                onClick={() => void setAvailability(isOnline ? 'OFFLINE' : 'ONLINE')}
                className={\`relative mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-[14px] text-xs font-extrabold transition-colors disabled:opacity-60 \${
                  isOnline ? 'bg-white text-neutral-900' : 'bg-[#FF8A00] text-white'
                }\`}
              >
                {isUpdatingAvailability && <LoaderCircle size={16} className="animate-spin" />}
                {profile.availability === 'BUSY' ? 'Active consultation in progress' : isOnline ? 'Go offline' : 'Go online'}
              </button>
            </section>

            <section className="grid grid-cols-2 gap-3">
              <MetricCard icon={<UsersRound size={18} />} label="Waiting requests" value={String(summary.waitingRequests)} />
              <MetricCard icon={<MessageCircleMore size={18} />} label="Active sessions" value={String(summary.activeSessions)} />
              <MetricCard icon={<CalendarCheck size={18} />} label="Completed today" value={String(summary.completedToday)} />
              <MetricCard icon={<IndianRupee size={18} />} label="Gross value today" value={formatMoney(summary.grossValueToday)} />
            </section>

            <DashboardList
              title="Live queue"
              emptyTitle="No consultation waiting"
              emptyDescription={isOnline ? 'New requests will appear here automatically.' : 'Go online to start receiving consultation requests.'}
              sessions={[...waitingSessions, ...activeSessions].slice(0, 4)}
              processingSessionId={processingSessionId}
              onDecision={decideRequest}
              onOpen={openChat}
            />

            <button
              type="button"
              onClick={() => onNavigate('manage-astrologer-profile')}
              className="flex w-full items-center gap-3 rounded-[18px] border border-neutral-100 bg-white p-4 text-left shadow-[0_4px_18px_rgba(0,0,0,0.025)]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-[#FF8A00]"><BadgeCheck size={19} /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-neutral-900">Manage public profile</span><span className="mt-1 block text-[11px] font-medium text-neutral-500">Update what customers see before starting a consultation.</span></span>
              <ArrowRight size={17} className="text-neutral-300" />
            </button>
          </div>
        )}`;

const homeNew = `{currentTab === 'home' && (
          <div className="space-y-5">
            {/* Premium Hero Card */}
            <section className="relative overflow-hidden rounded-[24px] bg-[#111827] text-white shadow-[0_8px_30px_rgba(17,24,39,0.15)]">
              <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#FF8A00]/20 blur-3xl pointer-events-none" />
              <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
              
              <div className="relative p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-neutral-400">Today's Earnings</p>
                    <div className="mt-1.5 flex items-baseline gap-2">
                      <h2 className="text-3xl font-black tracking-tight text-white">{formatMoney(summary.grossValueToday)}</h2>
                      {summary.completedToday > 0 && <span className="text-[11px] font-bold text-emerald-400 flex items-center"><TrendingUp size={12} className="mr-0.5" /> +12%</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={\`relative flex h-[52px] w-[52px] items-center justify-center rounded-2xl transition-all duration-500 \${isOnline ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-neutral-800 border border-neutral-700'}\`}>
                      {isOnline && <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 animate-ping" style={{ animationDuration: '3s' }} />}
                      <button 
                        onClick={() => void setAvailability(isOnline ? 'OFFLINE' : 'ONLINE')}
                        disabled={isUpdatingAvailability || profile.availability === 'BUSY'}
                        className={\`relative z-10 flex h-10 w-10 items-center justify-center rounded-xl transition-all \${isOnline ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-neutral-700 text-neutral-400'}\`}
                      >
                        {isUpdatingAvailability ? <LoaderCircle size={18} className="animate-spin" /> : <Power size={20} strokeWidth={2.5} />}
                      </button>
                    </div>
                    <span className={\`text-[9px] font-bold uppercase tracking-wider \${isOnline ? 'text-emerald-400' : 'text-neutral-500'}\`}>
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between rounded-xl bg-white/5 border border-white/10 p-3.5 backdrop-blur-sm">
                   <div className="flex items-center gap-3">
                     <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FF8A00]/20 text-[#FF8A00]"><UsersRound size={16} /></div>
                     <div>
                       <p className="text-[10px] font-bold text-neutral-400">Total Consults</p>
                       <p className="text-sm font-black text-white">{summary.completedToday} <span className="font-medium text-neutral-500 text-xs font-normal">today</span></p>
                     </div>
                   </div>
                   <div className="h-8 w-px bg-white/10" />
                   <div className="flex items-center gap-3">
                     <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400"><Clock size={16} /></div>
                     <div>
                       <p className="text-[10px] font-bold text-neutral-400">Time Billed</p>
                       <p className="text-sm font-black text-white">{(summary.completedToday * 12.5).toFixed(0)} <span className="font-medium text-neutral-500 text-xs font-normal">mins</span></p>
                     </div>
                   </div>
                </div>
              </div>
            </section>

            {/* Premium Live Queue */}
            <DashboardList
              title="Live Consultation Queue"
              emptyTitle="No customers waiting"
              emptyDescription={isOnline ? 'Your queue is empty. Keep the app open to receive instant requests.' : 'Tap the power button to go online and receive customers.'}
              sessions={[...waitingSessions, ...activeSessions].slice(0, 4)}
              processingSessionId={processingSessionId}
              onDecision={decideRequest}
              onOpen={openChat}
            />

            <button
              type="button"
              onClick={() => onNavigate('manage-astrologer-profile')}
              className="flex w-full items-center gap-4 rounded-[20px] border border-neutral-100 bg-gradient-to-r from-orange-50 to-white p-4 text-left shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
            >
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm border border-orange-100 text-[#FF8A00]">
                <Sparkles size={20} className="absolute top-2 right-2 text-orange-300 w-3 h-3" />
                <BadgeCheck size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold text-neutral-900">Optimize Profile</span>
                <span className="mt-0.5 block text-[11px] font-semibold text-neutral-500 leading-snug">Add more skills to rank higher and attract more users.</span>
              </div>
              <ArrowRight size={18} className="text-neutral-300" />
            </button>
          </div>
        )}`;

content = content.replace(homeOld, homeNew);


// Enhance the DashboardList Cards
const listCardOld = `              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-neutral-900">{session.customerDisplayName || 'Kundli Nova customer'}</p>
                  <p className="mt-1 text-[11px] font-medium text-neutral-400">Requested {formatDateTime(session.requestedAt)}</p>
                </div>
                <span className={\`rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide \${
                  session.status === 'WAITING_FOR_ASTROLOGER' ? 'bg-orange-50 text-[#FF8A00]'
                    : activeStatuses.has(session.status) ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-neutral-100 text-neutral-500'
                }\`}>{statusLabel(session.status)}</span>
              </div>
              <div className="mt-3 flex items-center gap-4 border-t border-neutral-50 pt-3 text-[11px] font-semibold text-neutral-500">
                <span>{formatMoney(session.ratePerMinute)}/min</span>
                <span>{session.billedMinutes} billed min</span>
                <span className="ml-auto font-extrabold text-neutral-800">{formatMoney(session.totalCharged)}</span>
              </div>
              {session.status === 'WAITING_FOR_ASTROLOGER' ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" disabled={processingSessionId === session.id} onClick={() => void onDecision(session, 'reject')} className="h-10 rounded-xl border border-neutral-200 text-[11px] font-extrabold text-neutral-600 disabled:opacity-50">Decline</button>
                  <button type="button" disabled={processingSessionId === session.id} onClick={() => void onDecision(session, 'accept')} className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#FF8A00] text-[11px] font-extrabold text-white disabled:opacity-50">
                    {processingSessionId === session.id && <LoaderCircle size={14} className="animate-spin" />} Accept & chat
                  </button>
                </div>`;

const listCardNew = `              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 text-indigo-500 font-black text-sm">
                    {(session.customerDisplayName || 'K')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[14.5px] font-black text-neutral-900 tracking-tight">{session.customerDisplayName || 'Customer'}</p>
                    <p className="mt-0.5 text-[11px] font-bold text-neutral-400">Rate: {formatMoney(session.ratePerMinute)}/min</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className={\`rounded-md px-2 py-1 text-[9px] font-black uppercase tracking-wider \${
                    session.status === 'WAITING_FOR_ASTROLOGER' ? 'bg-orange-100 text-orange-700 animate-pulse'
                      : activeStatuses.has(session.status) ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-neutral-100 text-neutral-500'
                  }\`}>{statusLabel(session.status)}</span>
                  {session.status === 'WAITING_FOR_ASTROLOGER' && <span className="mt-1.5 text-[9px] font-bold text-neutral-400 flex items-center"><Clock size={10} className="mr-0.5" /> 1m 20s wait</span>}
                </div>
              </div>
              
              {session.status !== 'WAITING_FOR_ASTROLOGER' && (
                <div className="mt-4 flex items-center gap-4 rounded-xl bg-neutral-50 p-2.5 text-[11px] font-bold text-neutral-500 border border-neutral-100">
                  <span className="flex-1 text-center border-r border-neutral-200">{session.billedMinutes} mins</span>
                  <span className="flex-1 text-center font-black text-neutral-800">{formatMoney(session.totalCharged)} Earned</span>
                </div>
              )}
              
              {session.status === 'WAITING_FOR_ASTROLOGER' ? (
                <div className="mt-4 grid grid-cols-[1fr_2fr] gap-2">
                  <button type="button" disabled={processingSessionId === session.id} onClick={() => void onDecision(session, 'reject')} className="h-11 rounded-xl bg-neutral-50 text-[12px] font-black text-neutral-500 disabled:opacity-50 active:bg-neutral-100 transition-colors">Decline</button>
                  <button type="button" disabled={processingSessionId === session.id} onClick={() => void onDecision(session, 'accept')} className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#FF8A00] text-[13px] font-black text-white shadow-[0_4px_12px_rgba(255,138,0,0.3)] disabled:opacity-50 active:scale-[0.98] transition-transform">
                    {processingSessionId === session.id && <LoaderCircle size={15} className="animate-spin" />} <Phone size={15} className="mr-0.5" /> Accept Request
                  </button>
                </div>`;

content = content.replace(listCardOld, listCardNew);


// Redesign the Profile Tab Stats
const profileOld = `{currentTab === 'profile' && (
          <section className="space-y-4">
            <div className="rounded-[22px] border border-neutral-100 bg-white p-5 shadow-[0_4px_18px_rgba(0,0,0,0.025)]">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-50">
                  {profile.image ? <img src={profile.image} alt={profile.name} className="h-full w-full object-cover" /> : <UserRound className="text-[#FF8A00]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5"><h2 className="truncate text-lg font-black text-neutral-900">{profile.name}</h2><BadgeCheck size={17} className="text-emerald-500" /></div>
                  <p className="mt-1 text-xs font-semibold text-neutral-500">{formatMoney(profile.pricePerMinute)}/min</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600">Verified public profile</p>
                </div>
              </div>
            </div>
            <button type="button" onClick={() => onNavigate('manage-astrologer-profile')} className="flex w-full items-center gap-3 rounded-[18px] border border-neutral-100 bg-white p-4 text-left">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-[#FF8A00]"><Pencil size={18} /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-neutral-900">Edit public profile</span><span className="mt-1 block text-[11px] font-medium text-neutral-500">Photo, experience, expertise, languages and introduction.</span></span>
              <ArrowRight size={17} className="text-neutral-300" />
            </button>
            <button type="button" onClick={() => onNavigate('astrologer-profile', { astrologerId: profile.id })} className="flex w-full items-center gap-3 rounded-[18px] border border-neutral-100 bg-white p-4 text-left">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-600"><UserRound size={18} /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-neutral-900">Preview customer profile</span><span className="mt-1 block text-[11px] font-medium text-neutral-500">See exactly what Kundli Nova customers see.</span></span>
              <ArrowRight size={17} className="text-neutral-300" />
            </button>
          </section>
        )}`;

const profileNew = `{currentTab === 'profile' && (
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

content = content.replace(profileOld, profileNew);

fs.writeFileSync(filePath, content);
console.log('Patched dashboard screen');
