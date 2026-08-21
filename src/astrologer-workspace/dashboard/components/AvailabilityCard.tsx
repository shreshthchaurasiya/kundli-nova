import React from 'react';
import { LoaderCircle, Power } from 'lucide-react';
import { AstrologerAvailability } from '../types';

interface AvailabilityCardProps {
  isOnline: boolean;
  isUpdatingAvailability: boolean;
  availabilityStatus: AstrologerAvailability;
  setAvailability: (availability: Extract<AstrologerAvailability, 'ONLINE' | 'OFFLINE'>) => Promise<void>;
}

export default function AvailabilityCard({
  isOnline,
  isUpdatingAvailability,
  availabilityStatus,
  setAvailability,
}: AvailabilityCardProps) {
  const isBusy = availabilityStatus === 'BUSY';

  return (
    <div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-[0_4px_18px_rgba(0,0,0,0.02)] border border-neutral-100">
      <div>
        <h2 className="text-[13px] font-black text-neutral-900">
          {isOnline ? 'You are Online' : isBusy ? 'You are Busy' : 'You are Offline'}
        </h2>
        <p className="mt-0.5 max-w-[180px] text-[10px] font-medium text-neutral-500 leading-snug">
          {isOnline
            ? 'You can receive new consultation requests.'
            : isBusy
            ? 'Finish your active consultation first.'
            : 'New consultation requests are currently paused.'}
        </p>
      </div>
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <div className={`relative flex h-[52px] w-[52px] items-center justify-center rounded-2xl transition-all duration-500 ${isOnline ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-neutral-100 border border-neutral-200'}`}>
          {isOnline && <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 animate-ping" style={{ animationDuration: '3s' }} />}
          <button
            type="button"
            onClick={() => void setAvailability(isOnline ? 'OFFLINE' : 'ONLINE')}
            disabled={isUpdatingAvailability || isBusy}
            className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
              isOnline
                ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'bg-neutral-800 text-white shadow-md'
            } disabled:opacity-60`}
          >
            {isUpdatingAvailability ? <LoaderCircle size={18} className="animate-spin" /> : <Power size={20} strokeWidth={2.5} />}
          </button>
        </div>
      </div>
    </div>
  );
}
