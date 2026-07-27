import * as fs from 'fs';
const filePath = 'src/astrologer-workspace/dashboard/components/AstrologerDashboardBottomNav.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Replace imports
content = content.replace(
  "import { Home, MessageCircleMore, UserRound, UsersRound } from 'lucide-react';",
  "import { Home, Bell, MessageCircleMore, IndianRupee, UserRound } from 'lucide-react';"
);

// Replace tabs array
const oldTabs = `const tabs: Array<{
  id: AstrologerDashboardTab | 'profile';
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}> = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'requests', label: 'Requests', icon: UsersRound },
  { id: 'chats', label: 'Chats', icon: MessageCircleMore },
  { id: 'profile', label: 'Profile', icon: UserRound },
];`;
const newTabs = `const tabs: Array<{
  id: AstrologerDashboardTab;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}> = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'requests', label: 'Requests', icon: Bell },
  { id: 'chats', label: 'Consults', icon: MessageCircleMore },
  { id: 'earnings', label: 'Earnings', icon: IndianRupee },
  { id: 'profile', label: 'Profile', icon: UserRound },
];`;
content = content.replace(oldTabs, newTabs);

// Update grid cols from 4 to 5
content = content.replace('className="grid grid-cols-4"', 'className="grid grid-cols-5"');

fs.writeFileSync(filePath, content);
console.log('Nav updated');
