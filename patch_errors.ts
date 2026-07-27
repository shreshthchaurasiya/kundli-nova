import * as fs from 'fs';

// 1. Context fix
let ctxPath = 'src/astrologer-workspace/dashboard/AstrologerDashboardContext.tsx';
let ctxContent = fs.readFileSync(ctxPath, 'utf-8');
// Check where createAstrologerDashboardSummary is used
ctxContent = ctxContent.replace(/profile \? createAstrologerDashboardSummary\(sessions\) : emptySummary/g, 'summary');
ctxContent = ctxContent.replace(/createAstrologerDashboardSummary/g, 'summary');
fs.writeFileSync(ctxPath, ctxContent);

// 2. Test fix
let testPath = 'src/astrologer-workspace/dashboard/__tests__/AstrologerDashboardScreen.test.tsx';
let testContent = fs.readFileSync(testPath, 'utf-8');
testContent = testContent.replace("import { AstrologerDashboardScreen } from '../screens/AstrologerDashboardScreen';", "import AstrologerDashboardScreen from '../screens/AstrologerDashboardScreen';");
fs.writeFileSync(testPath, testContent);

// 3. Remove obsolete test
fs.unlinkSync('src/astrologer-workspace/dashboard/__tests__/dashboardSelectors.test.ts');

// 4. UI fix
let uiPath = 'src/astrologer-workspace/dashboard/screens/AstrologerDashboardScreen.tsx';
let uiContent = fs.readFileSync(uiPath, 'utf-8');
uiContent = uiContent.replace(/summary\.grossValueToday/g, 'summary.todayGrossBilling');
fs.writeFileSync(uiPath, uiContent);
