import React from 'react';
import { AstrologerWithdrawalStatus } from '../../types';

export function WithdrawalStatusBadge({ status }: { status: AstrologerWithdrawalStatus }) {
  const getBadgeStyle = () => {
    switch (status) {
      case 'REQUESTED': return 'bg-amber-100 text-amber-700';
      case 'APPROVED': return 'bg-blue-100 text-blue-700';
      case 'PROCESSING': return 'bg-purple-100 text-purple-700';
      case 'PAID': return 'bg-[#2ED986]/10 text-[#1FA664]';
      case 'REJECTED': 
      case 'FAILED': return 'bg-red-100 text-red-700';
      case 'CANCELLED': return 'bg-neutral-100 text-neutral-600';
      default: return 'bg-neutral-100 text-neutral-600';
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'REQUESTED': return 'Requested';
      case 'APPROVED': return 'Approved';
      case 'PROCESSING': return 'Processing';
      case 'PAID': return 'Paid';
      case 'REJECTED': return 'Rejected';
      case 'FAILED': return 'Failed';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  };

  return (
    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${getBadgeStyle()}`}>
      {getLabel()}
    </span>
  );
}
