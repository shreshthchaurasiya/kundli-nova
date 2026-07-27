import * as fs from 'fs';
let testPath = 'src/astrologer-workspace/dashboard/__tests__/AstrologerDashboardScreen.test.tsx';
let testContent = fs.readFileSync(testPath, 'utf-8');
testContent = testContent.replace(/expect\(screen\.getByText\(\/Loading workspace\/i\)\)\.toBeInTheDocument\(\);/g, 'expect(screen.getByText(/Preparing your workspace/i)).toBeInTheDocument();');
fs.writeFileSync(testPath, testContent);
