import React from 'react';
import { ArrowLeft, BadgeCheck, BriefcaseBusiness, ChevronRight, Clock3, ShieldCheck, Sparkles, UserRoundCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { APPLICATION_STATUS_CONTENT, useAstrologerPartner } from '../features/astrologer';
import { Screen } from '../types';

interface PartnerWithUsScreenProps {
  onNavigate: (screen: Screen, params?: unknown) => void;
}

export default function PartnerWithUsScreen({ onNavigate }: PartnerWithUsScreenProps) {
  const { application, publicProfile, isLoading, error } = useAstrologerPartner();

  const openAstrologerFlow = () => {
    if (publicProfile) {
      onNavigate('manage-astrologer-profile');
      return;
    }
    if (application?.status === 'pending' || application?.status === 'suspended') return;
    onNavigate('astrologer-application');
  };

  const status = application?.status;
  const statusCopy = status ? APPLICATION_STATUS_CONTENT[status] : null;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <header className="flex items-center gap-3 border-b border-neutral-100 px-5 py-4">
        <button onClick={() => onNavigate('services')} className="-ml-2 rounded-full p-2 text-neutral-700 active:bg-neutral-100">
          <ArrowLeft size={21} />
        </button>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-400">Professional Network</p>
          <h1 className="text-lg font-extrabold tracking-tight text-neutral-900">Partner with Kundli Nova</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pb-8 pt-6 no-scrollbar">
        <section className="relative overflow-hidden rounded-[22px] bg-neutral-950 p-6 text-white">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#FF8A00]/15 blur-2xl" />
          <Sparkles size={20} className="mb-5 text-[#FF8A00]" />
          <h2 className="max-w-[290px] text-[25px] font-black leading-[1.12] tracking-tight">Build a trusted practice with us.</h2>
          <p className="mt-3 max-w-[320px] text-[13px] font-medium leading-relaxed text-neutral-400">
            One verified account, a professional profile and a clear review process designed for Kundli Nova experts.
          </p>
        </section>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
            {error}
          </div>
        )}

        {statusCopy && (
          <section className="mt-5 rounded-[20px] border border-neutral-100 bg-neutral-50/70 p-5">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                status === 'approved' ? 'bg-emerald-50 text-emerald-600' : status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-[#FF8A00]'
              }`}>
                {status === 'approved' ? <BadgeCheck size={20} /> : <Clock3 size={19} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-neutral-900">{statusCopy.title}</p>
                <p className="mt-1 text-xs font-medium leading-relaxed text-neutral-500">{statusCopy.description}</p>
                {application?.rejectionReason && (
                  <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-red-600">{application.rejectionReason}</p>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="mt-6 space-y-3">
          <p className="px-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-neutral-400">Choose a partnership</p>

          <PartnerCard
            icon={<UserRoundCheck size={22} />}
            title={publicProfile ? 'Manage Astrologer Profile' : status === 'draft' || status === 'rejected' ? 'Continue Astrologer Application' : 'Become a Verified Astrologer'}
            description={publicProfile ? 'Preview and update the profile customers see in the app.' : 'Create your professional profile and submit verification details.'}
            onClick={openAstrologerFlow}
            disabled={isLoading || status === 'pending' || status === 'suspended'}
            accent
          />

          <PartnerCard
            icon={<BriefcaseBusiness size={22} />}
            title="Business Partnership"
            description="Brand, content, institutional and strategic partnership enquiries."
            onClick={() => onNavigate('help-support', { topic: 'business-partnership' })}
          />
        </section>

        <section className="mt-6 grid grid-cols-3 gap-2 rounded-[20px] border border-neutral-100 p-4 text-center">
          {[
            { icon: <ShieldCheck size={16} />, label: 'Secure review' },
            { icon: <BadgeCheck size={16} />, label: 'Verified badge' },
            { icon: <Sparkles size={16} />, label: 'Public profile' },
          ].map(item => (
            <div key={item.label} className="flex flex-col items-center gap-2 text-neutral-500">
              <span className="text-[#FF8A00]">{item.icon}</span>
              <span className="text-[10px] font-bold">{item.label}</span>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

function PartnerCard({ icon, title, description, onClick, disabled, accent }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
}) {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.985 }}
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-4 rounded-[18px] border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
        accent ? 'border-orange-100 bg-orange-50/40' : 'border-neutral-100 bg-white'
      }`}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${accent ? 'bg-[#FF8A00] text-white' : 'bg-neutral-100 text-neutral-700'}`}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold text-neutral-900">{title}</span>
        <span className="mt-1 block text-[11px] font-medium leading-relaxed text-neutral-500">{description}</span>
      </span>
      <ChevronRight size={17} className="shrink-0 text-neutral-300" />
    </motion.button>
  );
}

