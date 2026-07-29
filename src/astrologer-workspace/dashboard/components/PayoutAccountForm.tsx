import React, { useState } from 'react';
import { astrologerDashboardService } from '../services/astrologerDashboardService';
import { AstrologerPayoutAccount } from '../types';

export function PayoutAccountForm({ 
  onSuccess, 
  onCancel 
}: { 
  onSuccess: (account: AstrologerPayoutAccount) => void;
  onCancel: () => void;
}) {
  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (accountNumber.length < 4) {
      setError('Account number must be at least 4 digits');
      return;
    }
    
    const uppercaseIfsc = ifscCode.toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(uppercaseIfsc)) {
      setError('Invalid IFSC code format (e.g. HDFC0001234)');
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedAccount = await astrologerDashboardService.savePayoutAccount({
        accountHolderName,
        bankName,
        accountNumber,
        ifscCode: uppercaseIfsc
      });
      onSuccess(updatedAccount);
    } catch (err: any) {
      setError(err.message || 'Failed to save payout account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-5 mt-6 shadow-sm">
      <h3 className="text-sm font-black text-neutral-900 mb-4">Add Bank Account</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Account Holder Name</label>
          <input
            type="text"
            required
            value={accountHolderName}
            onChange={e => setAccountHolderName(e.target.value)}
            className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium focus:outline-none focus:border-neutral-900 transition-colors"
            placeholder="As per bank records"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Bank Name</label>
          <input
            type="text"
            required
            value={bankName}
            onChange={e => setBankName(e.target.value)}
            className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium focus:outline-none focus:border-neutral-900 transition-colors"
            placeholder="e.g. HDFC Bank"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Account Number</label>
          <input
            type="text"
            required
            value={accountNumber}
            onChange={e => setAccountNumber(e.target.value)}
            className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium focus:outline-none focus:border-neutral-900 transition-colors"
            placeholder="Enter account number"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">IFSC Code</label>
          <input
            type="text"
            required
            value={ifscCode}
            onChange={e => setIfscCode(e.target.value.toUpperCase())}
            className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium focus:outline-none focus:border-neutral-900 transition-colors uppercase"
            placeholder="e.g. HDFC0001234"
          />
        </div>
        
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 bg-neutral-100 text-neutral-700 text-xs font-bold rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 bg-neutral-900 text-white text-xs font-bold rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center"
          >
            {isSubmitting ? 'Saving...' : 'Save Account'}
          </button>
        </div>
      </form>
    </div>
  );
}
