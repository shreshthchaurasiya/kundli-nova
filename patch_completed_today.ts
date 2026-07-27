import * as fs from 'fs';
const filePath = 'src/astrologer-workspace/dashboard/screens/AstrologerDashboardScreen.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

content = content.replace(/summary\.completedToday > 0/g, 'summary.totalConsultsToday > 0');
content = content.replace(/\{summary\.completedToday\}/g, '{summary.totalConsultsToday}');
content = content.replace(/\{\(summary\.completedToday \* 12\.5\)\.toFixed\(0\)\}/g, '{summary.billedMinutesToday}');

fs.writeFileSync(filePath, content);
console.log('completedToday replaced');
