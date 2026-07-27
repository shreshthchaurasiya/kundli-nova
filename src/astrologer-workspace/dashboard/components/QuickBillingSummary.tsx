import React from 'react';
import { AstrologerDashboardSummary } from '../types';
import { formatMoney } from '../../../utils/format';

interface QuickBillingSummaryProps {
  summary: AstrologerDashboardSummary | null;
  isLoading: boolean;
  error: string | null;
}

export default function QuickBillingSummary({ summary, isLoading, error }: QuickBillingSummaryProps) {
  if (isLoading || error || !summary) {
    return null; // The main Today Overview handles the error/loading state for billing. We keep this compact and hidden if unavailable.
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-xl border border-neutral-100 bg-white p-3 text-center shadow-sm">
        <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">Yesterday</p>
        <p className="mt-1 text-sm font-black text-neutral-900 truncate" title={formatMoney(summary.yesterdayGrossBilling)}>{formatMoney(summary.yesterdayGrossBilling)}</p>
      </div>
      <div className="rounded-xl border border-neutral-100 bg-white p-3 text-center shadow-sm">
        <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">This Week</p>
        <p className="mt-1 text-sm font-black text-neutral-900 truncate" title={formatMoney(summary.weekGrossBilling)}>{formatMoney(summary.weekGrossBilling)}</p>
      </div>
      <div className="rounded-xl border border-neutral-100 bg-white p-3 text-center shadow-sm">
        <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">This Month</p>
        <p className="mt-1 text-sm font-black text-neutral-900 truncate" title={formatMoney(summary.monthGrossBilling)}>{formatMoney(summary.monthGrossBilling)}</p>
      </div>
      <div className="rounded-xl border border-emerald-50 bg-emerald-50/50 p-3 text-center shadow-sm">
        <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600/70">Lifetime</p>
        <p className="mt-1 text-sm font-black text-emerald-600 truncate" title={formatMoney(summary.lifetimeGrossBilling)}>{formatMoney(summary.lifetimeGrossBilling)}</p>
      </div>
    </div>
  );
}
