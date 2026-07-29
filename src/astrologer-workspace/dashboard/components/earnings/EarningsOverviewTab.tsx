import React from 'react';
import { IndianRupee } from 'lucide-react';
import { AstrologerEarningsPayoutSummary } from '../../types';
import { formatMoney } from '../../../../utils/format';
import { AstrologerPayoutAccount } from '../../types';

interface EarningsOverviewTabProps {
  summary: AstrologerEarningsPayoutSummary;
  payoutAccount: AstrologerPayoutAccount | null;
  onNavigateWithdraw: () => void;
}

export function EarningsOverviewTab({ summary, payoutAccount, onNavigateWithdraw }: EarningsOverviewTabProps) {
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Actual Net Earnings Summary */}
      <div className="rounded-[24px] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-neutral-100">
        <h2 className="text-sm font-black text-neutral-900 mb-4">Your Earnings Summary</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-neutral-100/60 bg-[#FAFAFA] p-4 text-center">
            <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Yesterday</span>
            <div className="mt-1 text-lg font-black text-neutral-900">{formatMoney(summary.calculatedEarningsYesterday)}</div>
          </div>
          <div className="rounded-2xl border border-neutral-100/60 bg-[#FAFAFA] p-4 text-center">
            <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">This Week</span>
            <div className="mt-1 text-lg font-black text-neutral-900">{formatMoney(summary.calculatedEarningsWeek)}</div>
          </div>
          <div className="rounded-2xl border border-neutral-100/60 bg-[#FAFAFA] p-4 text-center">
            <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">This Month</span>
            <div className="mt-1 text-lg font-black text-neutral-900">{formatMoney(summary.calculatedEarningsMonth)}</div>
          </div>
          <div className="rounded-2xl border border-[#2ED986]/10 bg-[#2ED986]/[0.02] p-4 text-center">
            <span className="text-[10px] font-bold tracking-wider text-[#2ED986] uppercase">Lifetime</span>
            <div className="mt-1 text-lg font-black text-[#1FA664]">{formatMoney(summary.calculatedEarningsLifetime)}</div>
          </div>
        </div>
      </div>

      {/* Settlement & Payouts */}
      <div className="rounded-[24px] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-neutral-100">
        <h2 className="text-sm font-black text-neutral-900 mb-4">Settlement & Payouts</h2>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center py-3 border-b border-neutral-50 last:border-0">
            <span className="text-[13px] font-bold text-neutral-600">Withdrawable Balance</span>
            <span className="text-[13px] font-bold text-neutral-900">
              {summary.withdrawableBalance !== null ? formatMoney(summary.withdrawableBalance) : 'Not available'}
            </span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-neutral-50 last:border-0">
            <span className="text-[13px] font-bold text-neutral-600">Awaiting Commission</span>
            <span className="text-[13px] font-bold text-orange-600">
              {formatMoney(summary.awaitingCommission)}
            </span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-neutral-50 last:border-0">
            <span className="text-[13px] font-bold text-neutral-600">Pending Settlement</span>
            <span className="text-[13px] font-bold text-neutral-400">
              {summary.pendingSettlement !== null ? formatMoney(summary.pendingSettlement) : 'Not configured'}
            </span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-neutral-50 last:border-0">
            <span className="text-[13px] font-bold text-neutral-600">Processing Payout</span>
            <span className="text-[13px] font-bold text-neutral-900">
              {summary.processingPayout !== null ? formatMoney(summary.processingPayout) : '₹0.00'}
            </span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-neutral-50 last:border-0">
            <span className="text-[13px] font-bold text-neutral-600">Last Settlement</span>
            <span className="text-[13px] font-bold text-neutral-400">
              {summary.lastSettlementAmount !== null && summary.lastSettlementAt
                ? `${formatMoney(summary.lastSettlementAmount)} · ${new Date(summary.lastSettlementAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : 'No settlements yet'
              }
            </span>
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-neutral-50 p-4 border border-neutral-100">
          <p className="text-xs font-medium text-neutral-500 text-center leading-relaxed">
            Final earnings become withdrawable after commission and settlement processing.
          </p>
        </div>

        <button 
          onClick={onNavigateWithdraw}
          className="w-full mt-5 rounded-full bg-[#FF8A00] py-3.5 text-sm font-bold text-white transition-all hover:bg-[#E67A00] active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
        >
          Request Withdrawal
        </button>
      </div>

    </div>
  );
}
