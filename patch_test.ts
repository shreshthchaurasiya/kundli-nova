import * as fs from 'fs';
let testPath = 'src/astrologer-workspace/dashboard/__tests__/AstrologerDashboardScreen.test.tsx';
let testContent = fs.readFileSync(testPath, 'utf-8');
testContent = testContent.replace(/<AstrologerDashboardScreen \/>/g, '<AstrologerDashboardScreen onNavigate={vi.fn()} />');
fs.writeFileSync(testPath, testContent);
