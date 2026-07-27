import * as fs from 'fs';
import * as path from 'path';

// 1. Fix App.tsx
let appContent = fs.readFileSync('src/App.tsx', 'utf-8');
appContent = appContent.replace(
  `import {
  AstrologerApplicationScreen,
  AstrologerDashboardScreen,
  AstrologerConsultationChatScreen,
  AstrologerPartnershipScreen,
  AstrologerProfileEditorScreen,
  PublicAstrologerProfileScreen,
  useAstrologerDashboard,
} from './features/astrologer';`,
  `import {
  AstrologerApplicationScreen,
  AstrologerPartnershipScreen,
  PublicAstrologerProfileScreen,
} from './features/astrologer';
import {
  AstrologerDashboardScreen,
  AstrologerConsultationChatScreen,
  AstrologerProfileEditorScreen,
  useAstrologerDashboard,
} from './astrologer-workspace';`
);
fs.writeFileSync('src/App.tsx', appContent);

// 2. Fix main.tsx
let mainContent = fs.readFileSync('src/main.tsx', 'utf-8');
mainContent = mainContent.replace(
  `import { AstrologerDashboardProvider, AstrologerPartnerProvider } from './features/astrologer';`,
  `import { AstrologerPartnerProvider } from './features/astrologer';\nimport { AstrologerDashboardProvider } from './astrologer-workspace';`
);
fs.writeFileSync('src/main.tsx', mainContent);

// 3. Fix moved files relative imports
function walkSync(dir: string, filelist: string[] = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      filelist = walkSync(filepath, filelist);
    } else if (filepath.endsWith('.ts') || filepath.endsWith('.tsx')) {
      filelist.push(filepath);
    }
  }
  return filelist;
}

const workspaceFiles = walkSync('src/astrologer-workspace');
for (const file of workspaceFiles) {
  let content = fs.readFileSync(file, 'utf-8');
  
  // Fix imports pointing to features/astrologer internals that didn't move
  content = content.replace(/from '\.\.\/\.\.\/partner/g, "from '../../../features/astrologer/partner");
  content = content.replace(/from '\.\.\/\.\.\/shared/g, "from '../../../features/astrologer/shared");
  content = content.replace(/from '\.\.\/\.\.\/\.\.\/features\/astrologer\/shared/g, "from '../../../../features/astrologer/shared");
  
  // Fix imports pointing OUTSIDE (reduce depth by 1)
  content = content.replace(/from '\.\.\/\.\.\/\.\.\/\.\.\//g, "from '../../../");
  content = content.replace(/from '\.\.\/\.\.\/\.\.\//g, "from '../../");
  
  fs.writeFileSync(file, content);
}

console.log('Fixed imports successfully');
