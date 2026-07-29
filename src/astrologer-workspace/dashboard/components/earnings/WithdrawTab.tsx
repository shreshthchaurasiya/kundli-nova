import React, { useState } from 'react';
import { ShieldAlert, AlertCircle, Building, CheckCircle2, ChevronRight, IndianRupee } from 'lucide-react';
import { AstrologerEarningsPayoutSummary, AstrologerPayoutAccount } from '../../types';
import { formatMoney } from '../../../../utils/format';
import { astrologerDashboardService } from '../../services/astrologerDashboardService';

interface WithdrawTabProps {
  summary: AstrologerEarningsPayoutSummary;
  payoutAccount: AstrologerPayoutAccount | null;
  onSuccess: () => void;
}

export function WithdrawTab({ summary, payoutAccount, onSuccess }: WithdrawTabProps) {
  const [amount, setAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const disabledReason = summary.withdrawalDisabledReason;
  const isFormDisabled = summary.canRequestWithdrawal === false || isSubmitting;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9.]/g, '');
    if (val.split('.').length > 2) return;
    if (val.includes('.') && val.split('.')[1].length > 2) return;
    setAmount(val);
    setError(null);
  };

  const handleQuickAmount = (val: number | 'max') => {
    if (val === 'max') {
      setAmount(summary.withdrawableBalance ? summary.withdrawableBalance.toString() : '');
    } else {
      setAmount(val.toString());
    }
    setError(null);
  };

  const handleRequest = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < summary.minimumWithdrawalAmount) {
      setError(`Minimum withdrawal amount is ${formatMoney(summary.minimumWithdrawalAmount)}.`);
      return;
    }
    if (summary.withdrawableBalance !== null && numAmount > summary.withdrawableBalance) {
      setError('You cannot withdraw more than your available balance.');
      return;
    }
    setShowConfirmation(true);
  };

  const confirmWithdrawal = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await astrologerDashboardService.requestWithdrawal(parseFloat(amount));
      setShowConfirmation(false);
      setAmount('');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request withdrawal.');
      setShowConfirmation(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* Available Balance Card */}
      <div className="rounded-[24px] bg-neutral-900 p-6 shadow-lg text-white">
        <h2 className="text-sm font-bold text-neutral-400 mb-1">Available to Withdraw</h2>
        <div className="text-3xl font-black mb-4">
          {summary.withdrawableBalance !== null ? formatMoney(summary.withdrawableBalance) : 'Not available'}
        </div>
        
        <div className="flex items-center space-x-2 text-xs font-bold text-neutral-400">
          <ShieldAlert size={14} />
          <span>Minimum Withdrawal {formatMoney(summary.minimumWithdrawalAmount)}</span>
        </div>
      </div>

      {/* Disabled State Messaging */}
      {!summary.canRequestWithdrawal && disabledReason && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 flex gap-3">
          <AlertCircle size={20} className="text-red-500 shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-red-900">Withdrawal Disabled</h3>
            <p className="text-xs font-medium text-red-700 mt-1">
              {disabledReason === 'SETTLEMENT_NOT_CONFIGURED' && 'Withdrawal is not available yet because commission and settlement processing has not been configured.'}
              {disabledReason === 'PAYOUT_ACCOUNT_MISSING' && 'Add payout account first.'}
              {disabledReason === 'PAYOUT_ACCOUNT_PENDING' && 'Payout account is awaiting verification.'}
              {disabledReason === 'PAYOUT_ACCOUNT_REJECTED' && 'Payout account was rejected. Please update your details.'}
              {disabledReason === 'PAYOUT_ACCOUNT_NOT_VERIFIED' && 'Verify your payout account before requesting a withdrawal.'}
              {disabledReason === 'ACTIVE_WITHDRAWAL_EXISTS' && 'A withdrawal request is already being processed.'}
              {disabledReason === 'INSUFFICIENT_BALANCE' && 'Insufficient balance.'}
            </p>
          </div>
        </div>
      )}

      {/* Bank Account Overview */}
      {payoutAccount && (
        <div className="rounded-[20px] bg-white p-4 border border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${payoutAccount.status === 'VERIFIED' ? 'bg-[#2ED986]/10 text-[#1FA664]' : 'bg-neutral-100 text-neutral-400'}`}>
              <Building size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-900">{payoutAccount.bankName}</p>
              <p className="text-xs font-medium text-neutral-500">•••• {payoutAccount.accountNumberLast4}</p>
            </div>
          </div>
          {payoutAccount.status === 'VERIFIED' && (
            <div className="flex items-center gap-1.5 bg-[#2ED986]/10 px-2.5 py-1 rounded-full text-[#1FA664]">
              <CheckCircle2 size={12} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Verified</span>
            </div>
          )}
        </div>
      )}

      {/* Withdrawal Form */}
      <div className="space-y-4 pt-2">
        <div>
          <label className="text-[13px] font-bold text-neutral-900 mb-2 block">Withdrawal Amount</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
              <IndianRupee size={20} />
            </div>
            <input
              type="text"
              value={amount}
              onChange={handleAmountChange}
              disabled={isFormDisabled}
              placeholder="0.00"
              className="w-full rounded-2xl bg-white border border-neutral-200 py-4 pl-11 pr-4 text-lg font-bold text-neutral-900 outline-none transition-all focus:border-[#FF8A00] focus:ring-4 focus:ring-[#FF8A00]/10 disabled:bg-neutral-50 disabled:text-neutral-400"
            />
          </div>
          {error && <p className="text-xs font-bold text-red-500 mt-2">{error}</p>}
        </div>

        <div className="flex gap-2">
          {[200, 500, 1000].map(val => (
            <button
              key={val}
              onClick={() => handleQuickAmount(val)}
              disabled={isFormDisabled}
              className="flex-1 py-2.5 rounded-xl border border-neutral-200 bg-white text-xs font-bold text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors disabled:opacity-50"
            >
              ₹{val}
            </button>
          ))}
          <button
            onClick={() => handleQuickAmount('max')}
            disabled={isFormDisabled || !summary.withdrawableBalance}
            className="flex-1 py-2.5 rounded-xl border border-neutral-200 bg-white text-xs font-bold text-[#FF8A00] hover:bg-neutral-50 hover:border-[#FF8A00]/30 transition-colors disabled:opacity-50"
          >
            Max
          </button>
        </div>

        <button
          onClick={handleRequest}
          disabled={isFormDisabled || !amount}
          className="w-full mt-6 rounded-full bg-[#FF8A00] py-4 text-sm font-bold text-white transition-all hover:bg-[#E67A00] active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
        >
          {isSubmitting ? 'Processing...' : 'Request Withdrawal'}
          {!isSubmitting && <ChevronRight size={16} />}
        </button>
      </div>

      {/* Confirmation Sheet Overlay */}
      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-900/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-[32px] bg-white p-6 shadow-2xl animate-in slide-in-from-bottom-8">
            <h2 className="text-xl font-black text-neutral-900 text-center mb-6">Confirm Request</h2>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center py-3 border-b border-neutral-100">
                <span className="text-sm font-bold text-neutral-500">Amount</span>
                <span className="text-lg font-black text-neutral-900">₹{parseFloat(amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-neutral-100">
                <span className="text-sm font-bold text-neutral-500">Bank</span>
                <span className="text-sm font-bold text-neutral-900">{payoutAccount?.bankName} •••• {payoutAccount?.accountNumberLast4}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-neutral-100">
                <span className="text-sm font-bold text-neutral-500">Status after submission</span>
                <span className="text-sm font-bold text-[#FF8A00]">Requested</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={confirmWithdrawal}
                disabled={isSubmitting}
                className="w-full rounded-full bg-[#FF8A00] py-3.5 text-sm font-bold text-white hover:bg-[#E67A00]"
              >
                {isSubmitting ? 'Confirming...' : 'Confirm Request'}
              </button>
              <button
                onClick={() => setShowConfirmation(false)}
                disabled={isSubmitting}
                className="w-full rounded-full bg-neutral-100 py-3.5 text-sm font-bold text-neutral-700 hover:bg-neutral-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
