import React, { useMemo, useState } from 'react';
import { ArrowLeft, BriefcaseBusiness, ChevronRight, CircleHelp, FileText, LoaderCircle, MessageCircleQuestion, Send, UserRoundCheck, Wallet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Screen } from '../types';

interface HelpSupportScreenProps {
  onNavigate: (screen: Screen, params?: unknown) => void;
  routeParams?: { topic?: string };
}

const SUPPORT_TOPICS = [
  { id: 'payment-wallet', label: 'Payment & Wallet', icon: Wallet },
  { id: 'consultation', label: 'Consultation', icon: MessageCircleQuestion },
  { id: 'account-profile', label: 'Account & Profile', icon: CircleHelp },
  { id: 'kundli-report', label: 'Kundli Report', icon: FileText },
  { id: 'become-astrologer', label: 'Become an Astrologer', icon: UserRoundCheck },
  { id: 'business-partnership', label: 'Business Partnership', icon: BriefcaseBusiness },
  { id: 'technical-problem', label: 'Technical Problem', icon: CircleHelp },
  { id: 'other', label: 'Other Query', icon: CircleHelp },
] as const;

export default function HelpSupportScreen({ onNavigate, routeParams }: HelpSupportScreenProps) {
  const initialTopic = SUPPORT_TOPICS.some(item => item.id === routeParams?.topic) ? routeParams?.topic ?? '' : '';
  const [topic, setTopic] = useState(initialTopic);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState('');
  const selectedTopic = useMemo(() => SUPPORT_TOPICS.find(item => item.id === topic), [topic]);

  const selectTopic = (id: string) => {
    if (id === 'become-astrologer') {
      onNavigate('partner-with-us');
      return;
    }
    setTopic(id);
    setFeedback('');
  };

  const submit = async () => {
    if (!topic || subject.trim().length < 3 || message.trim().length < 10) {
      setFeedback('Select a topic and provide a clear subject and message.');
      return;
    }
    setIsSending(true);
    setFeedback('');
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Please sign in again to contact support.');
      const { error } = await supabase.from('support_requests').insert({
        user_id: user.id,
        topic,
        subject: subject.trim(),
        message: message.trim(),
      });
      if (error) throw error;
      setSubject('');
      setMessage('');
      setFeedback('Your request has been submitted securely.');
    } catch (caught) {
      setFeedback(caught instanceof Error ? caught.message : 'Unable to submit your request.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <header className="flex items-center gap-3 border-b border-neutral-100 px-5 py-4">
        <button onClick={() => topic ? setTopic('') : onNavigate('home')} className="-ml-2 rounded-full p-2 text-neutral-700 active:bg-neutral-100"><ArrowLeft size={21} /></button>
        <div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-neutral-400">We are here to help</p><h1 className="text-lg font-black text-neutral-900">{selectedTopic?.label ?? 'Help & Support'}</h1></div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-6 no-scrollbar">
        {!topic ? (
          <section className="space-y-3">
            <div className="mb-5"><h2 className="text-xl font-black tracking-tight text-neutral-900">How can we help?</h2><p className="mt-1 text-xs font-medium text-neutral-500">Choose the topic closest to your question.</p></div>
            {SUPPORT_TOPICS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => selectTopic(id)} className={`flex w-full items-center gap-3 rounded-[16px] border p-4 text-left ${id === 'become-astrologer' ? 'border-orange-100 bg-orange-50/40' : 'border-neutral-100'}`}>
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${id === 'become-astrologer' ? 'bg-[#FF8A00] text-white' : 'bg-neutral-100 text-neutral-600'}`}><Icon size={19} /></span>
                <span className="flex-1 text-sm font-extrabold text-neutral-900">{label}</span><ChevronRight size={17} className="text-neutral-300" />
              </button>
            ))}
          </section>
        ) : (
          <section className="space-y-5">
            <div><h2 className="text-xl font-black tracking-tight text-neutral-900">Tell us what happened</h2><p className="mt-1 text-xs font-medium leading-relaxed text-neutral-500">Your request will be linked securely to your account.</p></div>
            <label className="block"><span className="mb-2 block text-[11px] font-extrabold uppercase tracking-wider text-neutral-500">Subject</span><input value={subject} maxLength={120} onChange={event => setSubject(event.target.value)} className="h-[50px] w-full rounded-[14px] border border-neutral-200 px-4 text-sm font-semibold outline-none focus:border-[#FF8A00]" /></label>
            <label className="block"><span className="mb-2 flex justify-between text-[11px] font-extrabold uppercase tracking-wider text-neutral-500"><span>Message</span><span>{message.length}/2000</span></span><textarea value={message} maxLength={2000} rows={8} onChange={event => setMessage(event.target.value)} className="w-full resize-none rounded-[14px] border border-neutral-200 p-4 text-sm font-medium leading-relaxed outline-none focus:border-[#FF8A00]" /></label>
            {feedback && <p className={`rounded-xl px-3 py-2.5 text-xs font-semibold ${feedback.startsWith('Your request') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{feedback}</p>}
            <button onClick={() => void submit()} disabled={isSending} className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#FF8A00] text-sm font-extrabold text-white disabled:opacity-60">{isSending ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={17} />} Submit request</button>
          </section>
        )}
      </main>
    </div>
  );
}

