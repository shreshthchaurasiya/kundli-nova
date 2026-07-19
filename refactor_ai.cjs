const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, 'src/screens/NovaAIChatScreen.tsx');
let code = fs.readFileSync(p, 'utf8');

// 1. Imports
code = code.replace(
`import { 
  getSavedProfile, 
  getSavedKundli, 
  saveKundliData, 
  KundliData 
} from '../services/kundliStorage';`,
`import { 
  getSavedKundli, 
  saveKundliData, 
  KundliData 
} from '../services/kundliStorage';
import { useRepositories } from '../repositories/repositoryProvider';
import { UserProfile } from '../types/profile';`
);

// 2. Component top
code = code.replace(
`export default function NovaAIChatScreen({ onNavigate, routeParams }: NovaAIChatScreenProps) {
  const [messages, setMessages] = useState<Message[]>([]);`,
`export default function NovaAIChatScreen({ onNavigate, routeParams }: NovaAIChatScreenProps) {
  const repositories = useRepositories();
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);`
);

// 3. handleDownloadPdf
code = code.replace(
`  const handleDownloadPdf = async () => {
    // Look for active generated Kundli
    const profile = getSavedProfile();`,
`  const handleDownloadPdf = async () => {
    // Look for active generated Kundli
    const profile = profileData as any;`
);

// 4. useEffect top
code = code.replace(
`  // Load profile data and initialize chat
  useEffect(() => {
    // 1. Get user first name
    const profile = getSavedProfile();
    let firstName = 'Shreshth';
    if (profile) {
      firstName = profile.name.trim().split(' ')[0];
      setUserName(firstName);
    }

    // 2. Determine if loading existing conversation or creating new`,
`  // Load profile data and initialize chat
  useEffect(() => {
    const loadAndInit = async () => {
      // 1. Get user first name
      const profile = await repositories.profile.getProfile();
      setProfileData(profile);
      let firstName = 'Shreshth';
      if (profile) {
        firstName = profile.name.trim().split(' ')[0];
        setUserName(firstName);
      }

      // 2. Determine if loading existing conversation or creating new`
);

// 5. initialMsgs profile loading
code = code.replace(
`      } else {
        // Get actual profile data
        const profileData = getSavedProfile();
        const profileName = profileData?.name || 'Shreshth';`,
`      } else {
        // Get actual profile data (already fetched)
        const activeProfileData = profile;
        const profileName = activeProfileData?.name || 'Shreshth';`
);

// 6. fix activeProfile reference in same block
code = code.replace(
`          // Generate real Kundli using saved profile
          const activeProfile = profileData || {`,
`          // Generate real Kundli using saved profile
          const activeProfile = activeProfileData || {`
);

// 7. initializeNewChat calling
code = code.replace(
`    initializeNewChat();
  }, [routeParams]);`,
`    initializeNewChat();
    };
    loadAndInit();
  }, [routeParams, repositories.profile]);`
);

fs.writeFileSync(p, code);
console.log('Refactored NovaAIChatScreen.tsx');
