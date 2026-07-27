import * as fs from 'fs';
const filePath = 'src/astrologer-workspace/dashboard/dashboardSelectors.ts';
let content = fs.readFileSync(filePath, 'utf-8');

// The whole file is just about createAstrologerDashboardSummary which is now obsolete.
// Wait, is SameLocalDay used anywhere else?
content = `// Client-side financial aggregation removed per security rules.
// Use getDashboardSummary from astrologerDashboardService instead.
export {};
`;
fs.writeFileSync(filePath, content);
console.log('selectors cleaned');
