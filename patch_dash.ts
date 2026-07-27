import * as fs from 'fs';

const filePath = 'src/features/astrologer/dashboard/screens/AstrologerDashboardScreen.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Update interface
const intOld = `interface AstrologerDashboardScreenProps {
  onNavigate: (screen: Screen, params?: unknown) => void;
  onOpenDrawer?: () => void;
}`;
const intNew = `interface AstrologerDashboardScreenProps {
  onNavigate: (screen: Screen, params?: unknown) => void;
  onOpenDrawer?: () => void;
  routeParams?: any;
}`;
content = content.replace(intOld, intNew);

// 2. Update signature and state init
const sigOld = `export default function AstrologerDashboardScreen({ onNavigate, onOpenDrawer }: AstrologerDashboardScreenProps) {
  const {
    profile,
    sessions,
    summary,
    isLoading,
    isUpdatingAvailability,
    error,
    refresh,
    setAvailability,
  } = useAstrologerDashboard();
  const [currentTab, setCurrentTab] = useState<AstrologerDashboardTab>('home');`;

const sigNew = `export default function AstrologerDashboardScreen({ onNavigate, onOpenDrawer, routeParams }: AstrologerDashboardScreenProps) {
  const {
    profile,
    sessions,
    summary,
    isLoading,
    isUpdatingAvailability,
    error,
    refresh,
    setAvailability,
  } = useAstrologerDashboard();
  const [currentTab, setCurrentTab] = useState<AstrologerDashboardTab>((routeParams?.initialTab as AstrologerDashboardTab) || 'home');`;
content = content.replace(sigOld, sigNew);

fs.writeFileSync(filePath, content);
console.log('Patched dashboard initial tab');
