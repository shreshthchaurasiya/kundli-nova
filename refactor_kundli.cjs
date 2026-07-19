const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, 'src/screens/NovaKundliScreen.tsx');
let code = fs.readFileSync(p, 'utf8');

// 1. Imports
code = code.replace(
`import { KundliData, getSavedProfile } from '../services/kundliStorage';`,
`import { KundliData } from '../services/kundliStorage';
import { useRepositories } from '../repositories/repositoryProvider';`
);

// 2. Component top and state initialization
code = code.replace(
`export default function NovaKundliScreen({ onNavigate, routeParams }: NovaKundliScreenProps) {
  const fromScreen = routeParams?.fromScreen || 'nova-ai-chat';

  // Try to load from route params, fallback to active profile generation
  const [kundliData, setKundliData] = useState<KundliData>(() => {
    if (routeParams?.kundliData) {
      return routeParams.kundliData;
    }
    const profile = getSavedProfile();
    if (profile) {
      return generateKundli(profile);
    }
    // Hardcoded default fallback just in case
    return generateKundli({
      name: 'Shreshth',
      gender: 'male',
      dob: '1995-10-15',
      tob: '10:30',
      state: 'Uttar Pradesh',
      district: 'Varanasi',
      city: 'Varanasi'
    });
  });`,
`export default function NovaKundliScreen({ onNavigate, routeParams }: NovaKundliScreenProps) {
  const repositories = useRepositories();
  const fromScreen = routeParams?.fromScreen || 'nova-ai-chat';

  const [kundliData, setKundliData] = useState<KundliData | null>(routeParams?.kundliData || null);
  const [loadingKundli, setLoadingKundli] = useState(!routeParams?.kundliData);

  useEffect(() => {
    if (routeParams?.kundliData) {
      setLoadingKundli(false);
      return;
    }

    const fetchProfileAndGenerate = async () => {
      const profile = await repositories.profile.getProfile();
      if (profile) {
        setKundliData(generateKundli(profile));
      } else {
        setKundliData(generateKundli({
          name: 'Shreshth',
          gender: 'male',
          dob: '1995-10-15',
          tob: '10:30',
          state: 'Uttar Pradesh',
          district: 'Varanasi',
          city: 'Varanasi'
        }));
      }
      setLoadingKundli(false);
    };
    fetchProfileAndGenerate();
  }, [routeParams, repositories.profile]);`
);

// Handle loading state
code = code.replace(
`  const handleDownloadPdf = async () => {
    setPdfModalState('generating');`,
`  if (loadingKundli || !kundliData) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#FCFBF8]">
        <div className="w-[40px] h-[40px] border-[3px] border-[#FF8A00]/20 border-t-[#FF8A00] rounded-full animate-spin" />
      </div>
    );
  }

  const handleDownloadPdf = async () => {
    setPdfModalState('generating');`
);

fs.writeFileSync(p, code);
console.log('Refactored NovaKundliScreen.tsx');
