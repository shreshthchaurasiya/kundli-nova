import * as fs from 'fs';
const filePath = 'src/astrologer-workspace/dashboard/AstrologerDashboardContext.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Update Context definition
content = content.replace(
  /summary: AstrologerDashboardSummary;/,
  `summary: AstrologerDashboardSummary | null;
  isSummaryLoading: boolean;
  summaryError: string | null;
  retrySummary: () => Promise<void>;`
);

// Remove emptySummary if it exists
content = content.replace(/const emptySummary: AstrologerDashboardSummary = \{[\s\S]*?\};\n/, '');

// Update state declarations
const oldStates = /const \[summary, setSummary\] = useState<AstrologerDashboardSummary>\(emptySummary\);\n  const \[isLoading, setIsLoading\] = useState\(true\);/;
const newStates = `const [summary, setSummary] = useState<AstrologerDashboardSummary | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);`;
content = content.replace(/const \[summary, setSummary\].*?;\n  const \[isLoading, setIsLoading\].*?;/, newStates);

// Update fetch logic
const oldFetch = /const \[snapshot, summaryData\] = await Promise\.all\(\[\n\s*astrologerDashboardService\.getSnapshot\(\),\n\s*astrologerDashboardService\.getDashboardSummary\(tz\)\.catch\(\(\) => emptySummary\)\n\s*\]\);\n\s*setProfile\(snapshot\?\.profile \?\? null\);\n\s*setSessions\(snapshot\?\.sessions \?\? \[\]\);\n\s*setSummary\(summaryData\);/;

const newFetch = `const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
      
      const snapshot = await astrologerDashboardService.getSnapshot();
      setProfile(snapshot?.profile ?? null);
      setSessions(snapshot?.sessions ?? []);

      setIsSummaryLoading(true);
      setSummaryError(null);
      astrologerDashboardService.getDashboardSummary(tz)
        .then(setSummary)
        .catch(err => setSummaryError(err instanceof Error ? err.message : 'Unable to load billing summary'))
        .finally(() => setIsSummaryLoading(false));`;

content = content.replace(/const tz = [\s\S]*?setSummary\(summaryData\);/, newFetch);

// Add retrySummary function
const retryFn = `
  const retrySummary = useCallback(async () => {
    setIsSummaryLoading(true);
    setSummaryError(null);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
      const data = await astrologerDashboardService.getDashboardSummary(tz);
      setSummary(data);
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : 'Unable to load billing summary');
    } finally {
      setIsSummaryLoading(false);
    }
  }, []);
`;
content = content.replace(/const value = useMemo\(/, retryFn + '\n  const value = useMemo(');

// Update value memo
content = content.replace(/summary,(\s+)isLoading,/, `summary,\n      isSummaryLoading,\n      summaryError,\n      retrySummary,$1isLoading,`);
content = content.replace(/refresh, sessions, summary, setAvailability/, `refresh, sessions, summary, isSummaryLoading, summaryError, retrySummary, setAvailability`);

fs.writeFileSync(filePath, content);
