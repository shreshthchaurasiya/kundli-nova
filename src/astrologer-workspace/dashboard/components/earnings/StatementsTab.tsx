import React, { useEffect, useState, useMemo } from 'react';
import { FileText, LoaderCircle } from 'lucide-react';
import { AstrologerPaymentStatement, AstrologerPaymentStatementType } from '../../types';
import { astrologerDashboardService } from '../../services/astrologerDashboardService';
import { formatMoney } from '../../../../utils/format';
import { WithdrawalStatusBadge } from './WithdrawalStatusBadge';

type FilterType = 'ALL' | 'CONSULTATIONS' | 'WITHDRAWALS' | 'SETTLEMENTS';

export function StatementsTab() {
  const [statements, setStatements] = useState<AstrologerPaymentStatement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('ALL');

  useEffect(() => {
    loadStatements();
  }, []);

  const loadStatements = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await astrologerDashboardService.getPaymentStatements();
      setStatements(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statements.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStatements = useMemo(() => {
    if (filter === 'ALL') return statements;
    return statements.filter(s => {
      if (filter === 'CONSULTATIONS') return s.entryType === 'CONSULTATION_BILLING';
      if (filter === 'WITHDRAWALS') return s.entryType.startsWith('WITHDRAWAL');
      if (filter === 'SETTLEMENTS') return s.entryType === 'SETTLEMENT_CREDIT';
      return true;
    });
  }, [statements, filter]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <LoaderCircle size={24} className="animate-spin text-[#FF8A00]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
        <p className="text-sm font-bold text-red-900">{error}</p>
        <button onClick={loadStatements} className="mt-2 text-xs font-bold text-red-700 underline">Try again</button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-5 px-5 sm:mx-0 sm:px-0">
        {(['ALL', 'CONSULTATIONS', 'WITHDRAWALS', 'SETTLEMENTS'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-colors ${
              filter === f 
                ? 'bg-neutral-900 text-white' 
                : 'bg-white border border-neutral-200 text-neutral-500 hover:bg-neutral-50'
            }`}
          >
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filteredStatements.length === 0 ? (
          <div className="rounded-[24px] bg-white p-8 border border-neutral-100 flex flex-col items-center text-center">
            <FileText size={32} className="text-neutral-300 mb-3" />
            <h3 className="text-sm font-bold text-neutral-900">No statements found</h3>
            <p className="text-xs text-neutral-500 mt-1">There are no financial records matching this filter.</p>
          </div>
        ) : (
          filteredStatements.map((statement) => (
            <div key={statement.id} className="rounded-2xl bg-white p-4 border border-neutral-100 shadow-sm flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-neutral-900">{statement.title}</span>
                  <span className="text-xs font-medium text-neutral-500 mt-0.5">{statement.description}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`text-sm font-black ${
                    statement.entryType === 'CONSULTATION_BILLING' ? 'text-[#1FA664]' : 'text-neutral-900'
                  }`}>
                    {statement.entryType === 'CONSULTATION_BILLING' ? '+' : ''}{formatMoney(statement.entryType === 'CONSULTATION_BILLING' ? (statement.astrologerAmount ?? (statement.grossAmount * 0.60)) : statement.grossAmount)}
                  </span>
                  <div className="mt-1">
                    {statement.entryType === 'CONSULTATION_BILLING' ? (
                      <span className="px-2 py-1 rounded bg-[#2ED986]/10 text-[#1FA664] text-[10px] font-black uppercase tracking-wider">
                        {statement.status}
                      </span>
                    ) : (
                      <WithdrawalStatusBadge status={statement.status as any} />
                    )}
                  </div>
                </div>
              </div>
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-1">
                {new Date(statement.occurredAt).toLocaleString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
