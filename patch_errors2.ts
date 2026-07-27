import * as fs from 'fs';

// 1. Context fix
let ctxPath = 'src/astrologer-workspace/dashboard/AstrologerDashboardContext.tsx';
let ctxContent = fs.readFileSync(ctxPath, 'utf-8');
ctxContent = ctxContent.replace(/setSummary\(emptySummary\);/g, 'setSummary(null);');
fs.writeFileSync(ctxPath, ctxContent);

// 2. UI fix
let uiPath = 'src/astrologer-workspace/dashboard/screens/AstrologerDashboardScreen.tsx';
let uiContent = fs.readFileSync(uiPath, 'utf-8');
if (!uiContent.includes("isSummaryLoading,")) {
  uiContent = uiContent.replace(
    /const \{ profile, sessions, summary, isLoading, error, refresh \} = useAstrologerDashboard\(\);/,
    "const { profile, sessions, summary, isSummaryLoading, summaryError, retrySummary, isLoading, error, refresh } = useAstrologerDashboard();"
  );
}
if (!uiContent.includes("AlertCircle")) {
  uiContent = uiContent.replace(/import \{ TrendingUp, CreditCard, ChevronRight, LayoutDashboard, Bell, Settings, MessagesSquare \} from 'lucide-react';/, "import { TrendingUp, CreditCard, ChevronRight, LayoutDashboard, Bell, Settings, MessagesSquare, AlertCircle } from 'lucide-react';");
}
fs.writeFileSync(uiPath, uiContent);
