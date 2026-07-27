import * as fs from 'fs';
const filePath = 'src/astrologer-workspace/dashboard/AstrologerDashboardContext.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

const emptySummaryReplacement = `const emptySummary: AstrologerDashboardSummary = {
  todayGrossBilling: 0,
  yesterdayGrossBilling: 0,
  weekGrossBilling: 0,
  monthGrossBilling: 0,
  lifetimeGrossBilling: 0,
  pendingSettlement: null,
  withdrawableBalance: null,
  processingPayout: null,
  lastSettlementAt: null,
  settlementSystemConfigured: false,
  totalConsultsToday: 0,
  billedMinutesToday: 0,
  generatedAt: new Date().toISOString()
};`;

content = content.replace(/const emptySummary: AstrologerDashboardSummary = \{[\s\S]*?\};/, emptySummaryReplacement);

// We need to add summary state and remove the memoized summary
const newContextTop = `  const [profile, setProfile] = useState<AstrologerWorkspaceProfile | null>(null);
  const [sessions, setSessions] = useState<AstrologerDashboardSession[]>([]);
  const [summary, setSummary] = useState<AstrologerDashboardSummary>(emptySummary);
  const [isLoading, setIsLoading] = useState(true);`;

content = content.replace(/  const \[profile, setProfile\] = useState[\s\S]*?  const \[isLoading, setIsLoading\] = useState\(true\);/, newContextTop);

const newRefresh = `  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setProfile(null);
      setSessions([]);
      setSummary(emptySummary);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // The user wants timezone logic to be Asia/Kolkata or user preference. We use browser's timezone if possible, else fallback.
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
      const [snapshot, summaryData] = await Promise.all([
        astrologerDashboardService.getSnapshot(),
        astrologerDashboardService.getDashboardSummary(tz).catch(() => emptySummary)
      ]);
      setProfile(snapshot?.profile ?? null);
      setSessions(snapshot?.sessions ?? []);
      setSummary(summaryData);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load the astrologer dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);`;

content = content.replace(/  const refresh = useCallback\([\s\S]*?\}, \[isAuthenticated\]\);/, newRefresh);

const removeMemo = `  const value = useMemo(
    () => ({
      profile,
      sessions,
      summary: createAstrologerDashboardSummary(sessions),
      isLoading,
      isUpdatingAvailability,
      error,
      refresh,
      setAvailability,
    }),
    [error, isLoading, isUpdatingAvailability, profile, refresh, sessions, setAvailability],
  );`;
  
const newValue = `  const value = useMemo(
    () => ({
      profile,
      sessions,
      summary,
      isLoading,
      isUpdatingAvailability,
      error,
      refresh,
      setAvailability,
    }),
    [error, isLoading, isUpdatingAvailability, profile, refresh, sessions, summary, setAvailability],
  );`;

content = content.replace(removeMemo, newValue);
content = content.replace("import { createAstrologerDashboardSummary } from './dashboardSelectors';\n", "");

fs.writeFileSync(filePath, content);
console.log('Context updated');
