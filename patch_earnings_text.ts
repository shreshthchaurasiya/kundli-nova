import * as fs from 'fs';
let uiPath = 'src/astrologer-workspace/dashboard/screens/AstrologerDashboardScreen.tsx';
let uiContent = fs.readFileSync(uiPath, 'utf-8');
uiContent = uiContent.replace(/Today's Earnings/g, "Today's Gross Billing");
fs.writeFileSync(uiPath, uiContent);
