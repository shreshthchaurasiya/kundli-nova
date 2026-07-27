import * as fs from 'fs';
const filePath = 'src/astrologer-workspace/dashboard/screens/AstrologerDashboardScreen.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Import formatMoney
if (!content.includes("import { formatMoney } from '../../../utils/format';")) {
  content = content.replace("import { TrendingUp, CreditCard, ChevronRight, LayoutDashboard, Bell, Settings, MessagesSquare } from 'lucide-react';", 
  "import { TrendingUp, CreditCard, ChevronRight, LayoutDashboard, Bell, Settings, MessagesSquare, AlertCircle } from 'lucide-react';\nimport { formatMoney } from '../../../utils/format';");
}

// Remove local formatMoney
content = content.replace(/function formatMoney\(value: number\): string \{\n\s*return `₹\$\{value\.toFixed\(2\)\}`;\n\s*\}/, "");

// Replace `₹{value.toLocaleString('en-IN')}` with `{formatMoney(value)}`
content = content.replace(/₹\{summary\.todayGrossBilling\.toLocaleString\('en-IN'\)\}/g, "{formatMoney(summary.todayGrossBilling)}");
content = content.replace(/₹\{summary\.yesterdayGrossBilling\.toLocaleString\('en-IN'\)\}/g, "{formatMoney(summary.yesterdayGrossBilling)}");
content = content.replace(/₹\{summary\.weekGrossBilling\.toLocaleString\('en-IN'\)\}/g, "{formatMoney(summary.weekGrossBilling)}");
content = content.replace(/₹\{summary\.monthGrossBilling\.toLocaleString\('en-IN'\)\}/g, "{formatMoney(summary.monthGrossBilling)}");
content = content.replace(/₹\{summary\.lifetimeGrossBilling\.toLocaleString\('en-IN'\)\}/g, "{formatMoney(summary.lifetimeGrossBilling)}");

content = content.replace(/`₹\$\{summary\.withdrawableBalance\.toLocaleString\('en-IN'\)\}`/g, "formatMoney(summary.withdrawableBalance)");
content = content.replace(/`₹\$\{summary\.pendingSettlement\.toLocaleString\('en-IN'\)\}`/g, "formatMoney(summary.pendingSettlement)");
content = content.replace(/`₹\$\{summary\.processingPayout\.toLocaleString\('en-IN'\)\}`/g, "formatMoney(summary.processingPayout)");

// We need to use `summary`, `isSummaryLoading`, `summaryError`, `retrySummary` instead of assuming `summary` is always available.
content = content.replace(/const \{ profile, sessions, summary, isLoading, error, refresh \} = useAstrologerDashboard\(\);/,
  "const { profile, sessions, summary, isSummaryLoading, summaryError, retrySummary, isLoading, error, refresh } = useAstrologerDashboard();");

// Update the Gross Billing block in the UI
const oldGrossBilling = /<p className="text-\[11px\] font-extrabold uppercase tracking-\[0\.2em\] text-neutral-400">Today's Gross Billing<\/p>[\s\S]*?<\/div>\n\s*<\/div>/;

const newGrossBilling = `<p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-neutral-400">Today's Gross Billing</p>
                    {isSummaryLoading ? (
                      <div className="mt-1.5 h-9 w-24 rounded-lg bg-neutral-800 animate-pulse" />
                    ) : summaryError ? (
                      <div className="mt-1.5 flex items-center gap-2 text-red-400">
                        <AlertCircle size={16} />
                        <span className="text-sm font-medium">Unable to load</span>
                      </div>
                    ) : summary ? (
                      <div className="mt-1.5 flex items-baseline gap-2">
                        <h2 className="text-3xl font-black tracking-tight text-white">{formatMoney(summary.todayGrossBilling)}</h2>
                        {summary.totalConsultsToday > 0 && <span className="text-[11px] font-bold text-emerald-400 flex items-center"><TrendingUp size={12} className="mr-0.5" /> +12%</span>}
                      </div>
                    ) : null}
                  </div>`;
content = content.replace(oldGrossBilling, newGrossBilling);


const oldSummarySection = /<h2 className="text-sm font-black text-neutral-900 mb-4">Gross Billing Summary<\/h2>\n\s*<div className="grid grid-cols-2 gap-3 mb-6">[\s\S]*?<\/div>\n\s*<\/div>\n\s*<p className="mt-4 text-\[10px\] font-medium text-neutral-400 text-center px-4">\n\s*Final earnings and withdrawable balance will appear after the commission and payout system is configured\.\n\s*<\/p>\n\s*<\/div>/;

const newSummarySection = `<h2 className="text-sm font-black text-neutral-900 mb-4">Gross Billing Summary</h2>
              {isSummaryLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-32 bg-neutral-100 rounded-2xl" />
                  <div className="h-48 bg-neutral-100 rounded-2xl" />
                </div>
              ) : summaryError ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <AlertCircle size={32} className="text-red-400 mb-3" />
                  <p className="text-sm font-bold text-neutral-800 mb-1">Unable to load billing summary</p>
                  <p className="text-xs text-neutral-500 mb-4">{summaryError}</p>
                  <button onClick={retrySummary} className="px-4 py-2 bg-neutral-900 text-white text-xs font-bold rounded-lg active:scale-95 transition-transform">
                    Retry
                  </button>
                </div>
              ) : summary ? (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="rounded-2xl border border-neutral-100 bg-neutral-50/50 p-4 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Yesterday</p>
                      <p className="mt-1 text-xl font-black text-neutral-900">{formatMoney(summary.yesterdayGrossBilling)}</p>
                    </div>
                    <div className="rounded-2xl border border-neutral-100 bg-neutral-50/50 p-4 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">This Week</p>
                      <p className="mt-1 text-xl font-black text-neutral-900">{formatMoney(summary.weekGrossBilling)}</p>
                    </div>
                    <div className="rounded-2xl border border-neutral-100 bg-neutral-50/50 p-4 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">This Month</p>
                      <p className="mt-1 text-xl font-black text-neutral-900">{formatMoney(summary.monthGrossBilling)}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-50 bg-emerald-50/30 p-4 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/70">Lifetime</p>
                      <p className="mt-1 text-xl font-black text-emerald-600">{formatMoney(summary.lifetimeGrossBilling)}</p>
                    </div>
                  </div>

                  <h2 className="text-sm font-black text-neutral-900 mb-4 border-t border-neutral-100 pt-5">Settlement & Payouts</h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                      <span className="text-[11px] font-bold text-neutral-500">Withdrawable Balance</span>
                      <span className="text-[11px] font-black text-neutral-400">{summary.settlementSystemConfigured && summary.withdrawableBalance !== null ? formatMoney(summary.withdrawableBalance) : 'Available after payout setup'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                      <span className="text-[11px] font-bold text-neutral-500">Pending Settlement</span>
                      <span className="text-[11px] font-black text-neutral-400">{summary.settlementSystemConfigured && summary.pendingSettlement !== null ? formatMoney(summary.pendingSettlement) : 'Not configured'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                      <span className="text-[11px] font-bold text-neutral-500">Processing Payout</span>
                      <span className="text-[11px] font-black text-neutral-400">{summary.settlementSystemConfigured && summary.processingPayout !== null ? formatMoney(summary.processingPayout) : 'Not configured'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                      <span className="text-[11px] font-bold text-neutral-500">Last Settlement</span>
                      <span className="text-[11px] font-black text-neutral-400">{summary.lastSettlementAt ? new Date(summary.lastSettlementAt).toLocaleDateString() : 'No settlements yet'}</span>
                    </div>
                  </div>
                  <p className="mt-4 text-[10px] font-medium text-neutral-400 text-center px-4">
                    Final earnings and withdrawable balance will appear after the commission and payout system is configured.
                  </p>
                </>
              ) : null}
            </div>`;
content = content.replace(oldSummarySection, newSummarySection);

fs.writeFileSync(filePath, content);
