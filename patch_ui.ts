import * as fs from 'fs';
const filePath = 'src/astrologer-workspace/dashboard/screens/AstrologerDashboardScreen.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Replace "Today's Earnings" with "Today's Gross Billing" and map todayGrossBilling
content = content.replace(
  /<p className="text-\[11px\] font-bold uppercase tracking-wider text-orange-200\/80">Today's Earnings<\/p>\s*<p className="mt-1 text-4xl font-black tracking-tight text-white">\s*₹\{summary\.grossValueToday\.toLocaleString\('en-IN'\)\}\s*<\/p>/,
  `<p className="text-[11px] font-bold uppercase tracking-wider text-orange-200/80">Today's Gross Billing</p>
            <p className="mt-1 text-4xl font-black tracking-tight text-white">
              ₹{summary.todayGrossBilling.toLocaleString('en-IN')}
            </p>`
);

content = content.replace("summary.waitingRequests", "(sessions.filter(s => s.status === 'WAITING_FOR_ASTROLOGER').length)");

const newEarningsTab = `{currentTab === 'earnings' && (
          <section className="space-y-4">
            <div className="rounded-[24px] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-neutral-100">
              <h2 className="text-sm font-black text-neutral-900 mb-4">Gross Billing Summary</h2>
              <div className="grid grid-cols-2 gap-3 mb-6">
                 <div className="rounded-2xl border border-neutral-100 bg-neutral-50/50 p-4 text-center">
                   <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Yesterday</p>
                   <p className="mt-1 text-xl font-black text-neutral-900">₹{summary.yesterdayGrossBilling.toLocaleString('en-IN')}</p>
                 </div>
                 <div className="rounded-2xl border border-neutral-100 bg-neutral-50/50 p-4 text-center">
                   <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">This Week</p>
                   <p className="mt-1 text-xl font-black text-neutral-900">₹{summary.weekGrossBilling.toLocaleString('en-IN')}</p>
                 </div>
                 <div className="rounded-2xl border border-neutral-100 bg-neutral-50/50 p-4 text-center">
                   <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">This Month</p>
                   <p className="mt-1 text-xl font-black text-neutral-900">₹{summary.monthGrossBilling.toLocaleString('en-IN')}</p>
                 </div>
                 <div className="rounded-2xl border border-emerald-50 bg-emerald-50/30 p-4 text-center">
                   <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/70">Lifetime</p>
                   <p className="mt-1 text-xl font-black text-emerald-600">₹{summary.lifetimeGrossBilling.toLocaleString('en-IN')}</p>
                 </div>
              </div>

              <h2 className="text-sm font-black text-neutral-900 mb-4 border-t border-neutral-100 pt-5">Settlement & Payouts</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                  <span className="text-[11px] font-bold text-neutral-500">Withdrawable Balance</span>
                  <span className="text-[11px] font-black text-neutral-400">{summary.settlementSystemConfigured && summary.withdrawableBalance !== null ? \`₹\${summary.withdrawableBalance.toLocaleString('en-IN')}\` : 'Available after payout setup'}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                  <span className="text-[11px] font-bold text-neutral-500">Pending Settlement</span>
                  <span className="text-[11px] font-black text-neutral-400">{summary.settlementSystemConfigured && summary.pendingSettlement !== null ? \`₹\${summary.pendingSettlement.toLocaleString('en-IN')}\` : 'Not configured'}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                  <span className="text-[11px] font-bold text-neutral-500">Processing Payout</span>
                  <span className="text-[11px] font-black text-neutral-400">{summary.settlementSystemConfigured && summary.processingPayout !== null ? \`₹\${summary.processingPayout.toLocaleString('en-IN')}\` : 'Not configured'}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                  <span className="text-[11px] font-bold text-neutral-500">Last Settlement</span>
                  <span className="text-[11px] font-black text-neutral-400">{summary.lastSettlementAt ? new Date(summary.lastSettlementAt).toLocaleDateString() : 'No settlements yet'}</span>
                </div>
              </div>
              <p className="mt-4 text-[10px] font-medium text-neutral-400 text-center px-4">
                Final earnings and withdrawable balance will appear after the commission and payout system is configured.
              </p>
            </div>
          </section>
        )}`;

// replace the old earnings tab code
const oldEarningsTabRegex = /\{currentTab === 'earnings' && \([\s\S]*?<\/section>\s*\)\}/;
content = content.replace(oldEarningsTabRegex, newEarningsTab);

fs.writeFileSync(filePath, content);
console.log('UI updated');
