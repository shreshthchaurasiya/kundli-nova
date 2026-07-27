import * as fs from 'fs';
const filePath = 'src/astrologer-workspace/dashboard/types.ts';
let content = fs.readFileSync(filePath, 'utf-8');

const oldSummary = `export interface AstrologerDashboardSummary {
  waitingRequests: number;
  activeSessions: number;
  completedToday: number;
  grossValueToday: number;
}`;

const newSummary = `export interface AstrologerDashboardSummary {
  todayGrossBilling: number;
  yesterdayGrossBilling: number;
  weekGrossBilling: number;
  monthGrossBilling: number;
  lifetimeGrossBilling: number;

  pendingSettlement: number | null;
  withdrawableBalance: number | null;
  processingPayout: number | null;
  lastSettlementAt: string | null;

  settlementSystemConfigured: boolean;

  totalConsultsToday: number;
  billedMinutesToday: number;
  generatedAt: string;
}`;

content = content.replace(oldSummary, newSummary);
fs.writeFileSync(filePath, content);
console.log('types updated');
