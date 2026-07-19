const fs = require('fs');
const path = require('path');

function fixFile(file, isNova = false) {
  const p = path.join(__dirname, file);
  let code = fs.readFileSync(p, 'utf8');

  // Replace import
  code = code.replace(
    /import \{ profileStorage \} from '\.\.\/services\/storage\/profileStorage';/g,
    `import { useProfile } from '../contexts/ProfileContext';`
  );

  // For functional components, find the beginning of the function and add the hook
  // Assuming 'export default function Name(' or 'export default function Name ('
  if (!code.includes('const { profile } = useProfile();')) {
    code = code.replace(
      /(export default function [a-zA-Z0-9_]+\s*\([^)]*\)\s*\{)/,
      `$1\n  const { profile } = useProfile();`
    );
  }

  // Replace synchronous getProfile()
  code = code.replace(
    /const profile = profileStorage\.getProfile\(\);/g,
    `// profile is accessed from useProfile`
  );

  // In HomeScreen, it uses profileData state
  if (file.includes('HomeScreen.tsx')) {
    code = code.replace(
      /const \[profileData, setProfileData\] = useState<any>\(null\);/g,
      `// profileData removed`
    );
    code = code.replace(
      /setProfileData\(profile\);/g,
      `// setProfileData removed`
    );
    code = code.replace(
      /profileData\?/g,
      `profile?`
    );
  }

  // Replace removeProfile() inside onClick
  code = code.replace(
    /profileStorage\.removeProfile\(\);/g,
    `// profileStorage removed`
  );

  fs.writeFileSync(p, code);
  console.log('Fixed', file);
}

fixFile('src/screens/CategoryDetailScreen.tsx');
fixFile('src/screens/CategoryScreen.tsx');
fixFile('src/screens/ChatScreen.tsx');
fixFile('src/screens/HomeScreen.tsx');
fixFile('src/screens/NovaAIScreen.tsx');
fixFile('src/screens/ViewKundliScreen.tsx');
