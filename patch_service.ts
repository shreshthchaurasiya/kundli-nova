import * as fs from 'fs';
const filePath = 'src/astrologer-workspace/dashboard/services/astrologerDashboardService.ts';
let content = fs.readFileSync(filePath, 'utf-8');

// Remove the wrongly appended code
const badAppend = `
  async getDashboardSummary(timezone: string): Promise<AstrologerDashboardSummary> {
    const userId = await requireUserId();
    const { data, error } = await supabase.rpc('get_my_astrologer_dashboard_summary', {
      p_timezone: timezone
    });

    if (error) throw new Error(error.message);
    if (!data) throw new Error('No summary data returned');

    return {
      todayGrossBilling: Number(data.todayGrossBilling ?? 0),
      yesterdayGrossBilling: Number(data.yesterdayGrossBilling ?? 0),
      weekGrossBilling: Number(data.weekGrossBilling ?? 0),
      monthGrossBilling: Number(data.monthGrossBilling ?? 0),
      lifetimeGrossBilling: Number(data.lifetimeGrossBilling ?? 0),
      pendingSettlement: data.pendingSettlement ? Number(data.pendingSettlement) : null,
      withdrawableBalance: data.withdrawableBalance ? Number(data.withdrawableBalance) : null,
      processingPayout: data.processingPayout ? Number(data.processingPayout) : null,
      lastSettlementAt: data.lastSettlementAt,
      settlementSystemConfigured: Boolean(data.settlementSystemConfigured),
      totalConsultsToday: Number(data.totalConsultsToday ?? 0),
      billedMinutesToday: Number(data.billedMinutesToday ?? 0),
      generatedAt: data.generatedAt ?? new Date().toISOString()
    };
  }
`;
content = content.replace(badAppend, '');

// Insert it properly inside the object
const injectCode = `
  async getDashboardSummary(timezone: string): Promise<AstrologerDashboardSummary> {
    const userId = await requireUserId();
    const { data, error } = await supabase.rpc('get_my_astrologer_dashboard_summary', {
      p_timezone: timezone
    });

    if (error) throw new Error(error.message);
    if (!data) throw new Error('No summary data returned');

    return {
      todayGrossBilling: Number(data.todayGrossBilling ?? 0),
      yesterdayGrossBilling: Number(data.yesterdayGrossBilling ?? 0),
      weekGrossBilling: Number(data.weekGrossBilling ?? 0),
      monthGrossBilling: Number(data.monthGrossBilling ?? 0),
      lifetimeGrossBilling: Number(data.lifetimeGrossBilling ?? 0),
      pendingSettlement: data.pendingSettlement ? Number(data.pendingSettlement) : null,
      withdrawableBalance: data.withdrawableBalance ? Number(data.withdrawableBalance) : null,
      processingPayout: data.processingPayout ? Number(data.processingPayout) : null,
      lastSettlementAt: data.lastSettlementAt,
      settlementSystemConfigured: Boolean(data.settlementSystemConfigured),
      totalConsultsToday: Number(data.totalConsultsToday ?? 0),
      billedMinutesToday: Number(data.billedMinutesToday ?? 0),
      generatedAt: data.generatedAt ?? new Date().toISOString()
    };
  },
`;

content = content.replace("async getSnapshot(): Promise<AstrologerDashboardSnapshot | null> {", injectCode + "  async getSnapshot(): Promise<AstrologerDashboardSnapshot | null> {");
content = content.replace("import { ASTROLOGER_DASHBOARD_SESSION_LIMIT } from '../dashboardConfig';", "import { ASTROLOGER_DASHBOARD_SESSION_LIMIT } from '../dashboardConfig';\nimport { AstrologerDashboardSummary } from '../types';");

fs.writeFileSync(filePath, content);
console.log('service updated');
