import * as fs from 'fs';

const appContent = fs.readFileSync('src/App.tsx', 'utf-8');
console.log("App.tsx has astrologer dashboard?", appContent.includes('astrologer-dashboard'));

const profileContent = fs.readFileSync('src/screens/ProfileScreen.tsx', 'utf-8');
console.log("ProfileScreen.tsx exists?", profileContent.length > 0);
