import React, { useEffect, useState } from 'react';
import { Clock, Clock3, LoaderCircle, Phone } from 'lucide-react';
import { AstrologerDashboardSession } from '../types';

interface QueuePreviewProps {
  requests: AstrologerDashboardSession[];
  isOnline: boolean;
  onViewAll: () => void;
  processingSessionId: string | null;
  onDecision: (session: AstrologerDashboardSession, decision: 'accept' | 'reject') => Promise<void>;
}

function WaitTimer({ requestedAt }: { requestedAt: string }) {
  const [waitText, setWaitText] = useState('');

  useEffect(() => {
    const update = () => {
      const ms = Math.max(0, Date.now() - new Date(requestedAt).getTime());
      const mins = Math.floor(ms / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      setWaitText(`${mins}m ${secs}s wait`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [requestedAt]);

  return (
    <span className="mt-1.5 text-[9px] font-bold text-neutral-400 flex items-center">
      <Clock size={10} className="mr-0.5" /> {waitText}
    </span>
  );
}

export default function QueuePreview({
  requests,
  isOnline,
  onViewAll,
  processingSessionId,
  onDecision,
}: QueuePreviewProps) {
  const previewRequests = requests.slice(0, 3);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-black text-neutral-900">Consultation Requests</h2>
        {requests.length > 3 && (
          <button onClick={onViewAll} className="text-[11px] font-bold text-[#FF8A00]">
            View all {requests.length}
          </button>
        )}
      </div>

      {previewRequests.length === 0 ? (
      <div className="rounded-[18px] border border-dashed border-neutral-200 bg-white px-6 py-6 text-center">
          <Clock3 size={20} className="mx-auto text-neutral-300" />
          <p className="mt-2 text-[13px] font-extrabold text-neutral-800">No requests waiting</p>
          <p className="mx-auto mt-1 max-w-[270px] text-[10px] font-medium leading-relaxed text-neutral-400">
            {isOnline
              ? "You're online and ready to receive new consultation requests."
              : 'Go online to start receiving consultation requests.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {previewRequests.map(session => {
            const customerName = session.customerDisplayName || 'Customer';
            return (
              <article key={session.id} className="rounded-[17px] border border-neutral-100 bg-white p-4 shadow-[0_3px_14px_rgba(0,0,0,0.02)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 flex items-center justify-center rounded-full bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 text-[#FF8A00] font-black text-sm">
                      {customerName[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[14.5px] font-black text-neutral-900 tracking-tight">{customerName}</p>
                      <p className="mt-0.5 text-[11px] font-bold text-neutral-400">Consultation Request</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="rounded-md bg-orange-100 text-orange-700 px-2 py-1 text-[9px] font-black uppercase tracking-wider animate-pulse">
                      Waiting
                    </span>
                    <WaitTimer requestedAt={session.requestedAt} />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-[1fr_2fr] gap-2">
                  <button
                    type="button"
                    disabled={processingSessionId === session.id}
                    onClick={() => void onDecision(session, 'reject')}
                    className="h-11 rounded-xl bg-neutral-50 text-[12px] font-black text-neutral-500 disabled:opacity-50 active:bg-neutral-100 transition-colors"
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    disabled={processingSessionId === session.id}
                    onClick={() => void onDecision(session, 'accept')}
                    className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#FF8A00] text-[13px] font-black text-white shadow-[0_4px_12px_rgba(255,138,0,0.3)] disabled:opacity-50 active:scale-[0.98] transition-transform"
                  >
                    {processingSessionId === session.id && <LoaderCircle size={15} className="animate-spin" />}
                    <Phone size={15} className="mr-0.5" /> Accept Request
                  </button>
                </div>
              </article>
            );
          })}
          {requests.length > 3 && (
            <button
              onClick={onViewAll}
              className="mt-2 w-full rounded-xl bg-neutral-50 py-3 text-[12px] font-black text-neutral-600 active:bg-neutral-100"
            >
              View {requests.length - 3} more requests
            </button>
          )}
        </div>
      )}
    </section>
  );
}
