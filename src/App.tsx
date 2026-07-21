import React, { useState, useEffect } from 'react';
import { MessageCircle, User, Wallet, Bell, Settings, HelpCircle, LogOut, ChevronRight, Sparkles, Pencil } from 'lucide-react';
import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import OtpScreen from './screens/OtpScreen';
import CreateProfileScreen from './screens/CreateProfileScreen';
import WelcomeGiftScreen from './screens/WelcomeGiftScreen';
import HomeScreen from './screens/HomeScreen';
import WalletScreen from './screens/WalletScreen';
import ChatScreen from './screens/ChatScreen';
import AstrologersScreen from './screens/AstrologersScreen';
import CategoryScreen from './screens/CategoryScreen';
import ProfileScreen from './screens/ProfileScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import ViewKundliScreen from './screens/ViewKundliScreen';
import ConsultationChatScreen from './screens/ConsultationChatScreen';
import ChatHistoryScreen from './screens/ChatHistoryScreen';
import ChatListScreen from './screens/ChatListScreen';
import CategoryDetailScreen from './screens/CategoryDetailScreen';
import NovaAIScreen from './screens/NovaAIScreen';
import NovaAIChatScreen from './screens/NovaAIChatScreen';
import NovaKundliScreen from './screens/NovaKundliScreen';
import KundliProfileFormScreen from './screens/KundliProfileFormScreen';
import HelpSupportScreen from './screens/HelpSupportScreen';
import HoroscopeScreen from './screens/HoroscopeScreen';
import {
  AstrologerApplicationScreen,
  AstrologerDashboardScreen,
  AstrologerConsultationChatScreen,
  AstrologerPartnershipScreen,
  AstrologerProfileEditorScreen,
  PublicAstrologerProfileScreen,
  useAstrologerDashboard,
} from './features/astrologer';
import BottomNav from './components/BottomNav';
import { Screen, Tab } from './types';
import { AnimatePresence, motion } from 'motion/react';
import { runMigrations } from './services/storage';
import { useAuth } from './auth';
import { useProfile } from './contexts/ProfileContext';
import { useWallet } from './contexts/WalletContext';

// Public screens may be opened without a verified Supabase session.
const PUBLIC_SCREENS: Screen[] = ['splash', 'login', 'signup', 'forgot-password', 'otp'];
// Auth-flow screens that should never show the bottom nav.
const AUTH_SCREENS: Screen[] = ['splash', 'login', 'signup', 'forgot-password', 'otp', 'create-profile', 'welcome-gift'];
// Screens that show bottom nav
const NAV_SCREENS: Screen[] = ['home', 'chat-list', 'chat-history', 'nova-ai', 'services', 'profile', 'astrologers'];

export default function App() {
  const { isAuthenticated, isLoading, user, signOut } = useAuth();
  const { profile, isLoadingProfile } = useProfile();
  const { wallet } = useWallet();
  const { profile: astrologerWorkspace, isLoading: isLoadingAstrologerDashboard } = useAstrologerDashboard();

  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [currentTab, setCurrentTab] = useState<Tab>('home');
  const [routeParams, setRouteParams] = useState<any>({});
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string } | null>(null);
  const walletBalance = wallet.balance;

  // ProfileContext is the single source of truth for the onboarding state.
  // Keeping a second async copy here caused a completed profile to be routed
  // straight back to the details form.
  const isProfileComplete = Boolean(profile?.onboardingCompletedAt);
  const hasStartedWelcomeChat = Boolean(profile?.welcomeChatStartedAt);

  // Initialize storage migrations once at startup
  useEffect(() => {
    runMigrations();
  }, []);

  // Route based on auth state and profile completeness
  useEffect(() => {
    if (isLoading || isLoadingProfile || isLoadingAstrologerDashboard) return;

    if (isAuthenticated) {
      if (!isProfileComplete) {
        // A provisional OAuth identity cannot enter any application screen.
        if (currentScreen !== 'create-profile') setCurrentScreen('create-profile');
      } else if (!hasStartedWelcomeChat) {
        // The welcome step is durable. Refreshing the page or returning from an
        // email confirmation cannot skip it.
        if (currentScreen !== 'welcome-gift') setCurrentScreen('welcome-gift');
      } else if (AUTH_SCREENS.includes(currentScreen)) {
        setCurrentScreen(astrologerWorkspace ? 'astrologer-dashboard' : 'home');
      }
    } else {
      // Profile creation, welcome gift, and all application screens are protected.
      if (!PUBLIC_SCREENS.includes(currentScreen)) {
        setCurrentScreen('login');
      }
    }
  }, [astrologerWorkspace, currentScreen, hasStartedWelcomeChat, isAuthenticated, isLoading, isLoadingAstrologerDashboard, isLoadingProfile, isProfileComplete]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const navigate = (screen: Screen, params?: any) => {
    if (!isAuthenticated && !PUBLIC_SCREENS.includes(screen)) {
      setRouteParams({});
      setCurrentScreen('login');
      return;
    }

    setCurrentScreen(screen);
    setRouteParams(params ?? {});
  };

  const handleTabChange = (tab: Tab) => {
    if (!isAuthenticated) {
      setCurrentScreen('login');
      return;
    }

    setCurrentTab(tab);
    setCurrentScreen(tab);
  };

  const showBottomNav = isAuthenticated && isProfileComplete && NAV_SCREENS.includes(currentScreen);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Derive display name + phone from the authenticated Supabase user
  const userName = profile?.name || user?.user_metadata?.name || user?.user_metadata?.full_name || 'User';
  const userPhone = user?.phone
    ? user.phone.replace(/^\+91(\d{5})(\d{5})$/, '+91 $1 $2')
    : '';

  const menuItems = [
    { id: 'profile', label: 'My Profile', icon: <User size={20} strokeWidth={1.8} className="text-neutral-500" /> },
    { id: 'wallet', label: 'Wallet', icon: <Wallet size={20} strokeWidth={1.8} className="text-neutral-500" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={20} strokeWidth={1.8} className="text-neutral-500" /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} strokeWidth={1.8} className="text-neutral-500" /> },
    { id: 'help', label: 'Help & Support', icon: <HelpCircle size={20} strokeWidth={1.8} className="text-neutral-500" /> },
    { id: 'logout', label: 'Logout', icon: <LogOut size={20} strokeWidth={1.8} className="text-[#EF4444]/70" />, isLogout: true },
  ];

  const handleMenuClick = async (id: string) => {
    setIsDrawerOpen(false);
    switch (id) {
      case 'profile':
        handleTabChange('profile');
        break;
      case 'wallet':
        navigate('wallet');
        break;
      case 'notifications':
        setToast({ message: 'You are all caught up! No new notifications.' });
        break;
      case 'settings':
        setToast({ message: 'Settings will be available in the next release.' });
        break;
      case 'help':
        navigate('help-support');
        break;
      case 'logout':
        await signOut();
        // Auth state change will route to login automatically
        break;
      default:
        break;
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash': return <SplashScreen onFinish={(s) => navigate(s)} />;
      case 'login': return <LoginScreen onNavigate={navigate} />;
      case 'signup': return <SignupScreen onNavigate={navigate} />;
      case 'forgot-password': return <ForgotPasswordScreen onNavigate={navigate} />;
      case 'otp': return <OtpScreen onNavigate={navigate} routeParams={routeParams} />;
      case 'create-profile': return <CreateProfileScreen onNavigate={navigate} />;
      case 'edit-profile': return <EditProfileScreen onNavigate={navigate} />;
      case 'view-kundli': return <NovaKundliScreen onNavigate={navigate} routeParams={{ fromScreen: 'profile' }} />;
      case 'consultation-chat': return (
        <ConsultationChatScreen
          astrologerId={routeParams?.astrologerId}
          readOnlySessionId={routeParams?.readOnlySessionId}
          onNavigate={navigate}
        />
      );
      case 'welcome-gift': return <WelcomeGiftScreen onNavigate={navigate} />;
      case 'home': return <HomeScreen onNavigate={navigate} onOpenDrawer={() => setIsDrawerOpen(true)} />;
      case 'wallet': return <WalletScreen onNavigate={navigate} />;
      case 'chat': return <ChatScreen onNavigate={navigate} routeParams={routeParams} />;
      case 'chat-list': return <ChatListScreen onNavigate={navigate} onOpenDrawer={() => setIsDrawerOpen(true)} />;
      case 'nova-ai': return <NovaAIScreen onNavigate={navigate} onOpenDrawer={() => setIsDrawerOpen(true)} />;
      case 'nova-ai-chat': return <NovaAIChatScreen onNavigate={navigate} routeParams={routeParams} />;
      case 'nova-kundli': return <NovaKundliScreen onNavigate={navigate} routeParams={routeParams} />;
      case 'kundli-profile-form': return <KundliProfileFormScreen onNavigate={navigate} routeParams={routeParams} />;
      case 'chat-history': return <ChatHistoryScreen onNavigate={navigate} />;
      case 'services': return <CategoryScreen onNavigate={navigate} />;
      case 'astrologers': return <AstrologersScreen onNavigate={navigate} />;
      case 'profile': return <ProfileScreen onNavigate={navigate} />;
      case 'astrologer-profile': return <PublicAstrologerProfileScreen astrologerId={routeParams?.astrologerId} onNavigate={navigate} />;
      case 'partner-with-us': return <AstrologerPartnershipScreen onNavigate={navigate} />;
      case 'astrologer-application': return <AstrologerApplicationScreen onNavigate={navigate} />;
      case 'astrologer-dashboard': return <AstrologerDashboardScreen onNavigate={navigate} />;
      case 'astrologer-consultation-chat': return (
        <AstrologerConsultationChatScreen
          sessionId={routeParams?.sessionId}
          customerName={routeParams?.customerName}
          startedAt={routeParams?.startedAt}
          readOnly={routeParams?.readOnly}
          onNavigate={navigate}
        />
      );
      case 'manage-astrologer-profile': return <AstrologerProfileEditorScreen onNavigate={navigate} />;
      case 'help-support': return <HelpSupportScreen onNavigate={navigate} routeParams={routeParams} />;
      case 'category-detail': return <CategoryDetailScreen category={routeParams?.category} onNavigate={navigate} />;
      case 'horoscope': return <HoroscopeScreen onNavigate={navigate} />;
      default: return <HomeScreen onNavigate={navigate} onOpenDrawer={() => setIsDrawerOpen(true)} />;
    }
  };

  // Suppress unused import warning — ViewKundliScreen kept for future use
  void ViewKundliScreen;
  void MessageCircle;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-0 sm:p-4 font-sans text-gray-900 selection:bg-gray-200">
      <div className="w-full max-w-md h-[100dvh] sm:h-[850px] bg-white relative overflow-hidden shadow-2xl sm:rounded-[40px] sm:border-[8px] sm:border-gray-900 ring-1 ring-gray-200/50 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-hidden flex flex-col relative"
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>

        {showBottomNav && !isDrawerOpen && (
          <BottomNav currentTab={currentTab} onTabChange={handleTabChange} />
        )}

        {/* Global Premium Navigation Drawer Overlay */}
        <AnimatePresence>
          {isDrawerOpen && (
            <>
              {/* Soft Dim / Blur Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsDrawerOpen(false)}
                className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm z-[90]"
              />
              {/* Slider Panel */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 32, stiffness: 280 }}
                className="absolute inset-y-0 left-0 w-[84%] max-w-[330px] bg-white z-[100] shadow-[12px_0_40px_rgba(0,0,0,0.04)] flex flex-col overflow-hidden"
              >
                {/* Profile Header Section */}
                <div className="pt-[max(48px,env(safe-area-inset-top))] pb-[20px] px-[24px] flex flex-col items-start bg-white">
                  <p className="text-[11px] font-[700] text-neutral-400 uppercase tracking-widest leading-none mb-[16px]">
                    {getGreeting()}
                  </p>

                  <motion.div
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      setIsDrawerOpen(false);
                      handleTabChange('profile');
                    }}
                    className="relative mb-[16px] cursor-pointer group rounded-full overflow-hidden"
                  >
                    <div className="w-[64px] h-[64px] rounded-full bg-gradient-to-tr from-[#FF8A00] to-[#FFA733] text-white flex items-center justify-center text-[24px] font-[800] shadow-[0_4px_16px_rgba(255,138,0,0.15)] ring-4 ring-neutral-50 shrink-0 relative overflow-hidden transition-all duration-300">
                      {userName.charAt(0).toUpperCase()}
                      <div className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center duration-200">
                        <Pencil size={14} className="text-white fill-none stroke-[2.5]" />
                      </div>
                    </div>
                  </motion.div>

                  <h2 className="text-[19px] font-[800] text-neutral-900 tracking-tight leading-tight">{userName}</h2>
                  <p className="text-[11.5px] text-neutral-400 font-semibold leading-none mt-[6px]">Manage your Kundli Nova account</p>
                  {userPhone && (
                    <p className="text-[12.5px] text-neutral-500 font-medium leading-none mt-[10px]">{userPhone}</p>
                  )}
                </div>

                <div className="h-[1px] bg-neutral-100/60 mx-[24px] mb-[8px]" />

                {/* Navigation Menu Items */}
                <div className="flex-1 overflow-y-auto py-[8px] no-scrollbar">
                  {menuItems.map((item) => (
                    <React.Fragment key={item.id}>
                      {item.isLogout && (
                        <div className="h-[1px] bg-neutral-100/60 mx-[24px] my-[12px]" />
                      )}

                      <motion.button
                        whileTap={{ scale: 0.985 }}
                        onClick={() => handleMenuClick(item.id)}
                        className="w-full h-[56px] flex items-center justify-between px-[24px] hover:bg-neutral-50/50 active:bg-neutral-50/80 transition-colors focus:outline-none cursor-pointer"
                      >
                        <div className="flex items-center space-x-[14px]">
                          <div className="flex items-center justify-center w-[24px] h-[24px] shrink-0">
                            {item.icon}
                          </div>
                          <span className={`text-[14px] font-[600] tracking-tight ${item.isLogout ? 'text-neutral-500/90' : 'text-neutral-800'}`}>
                            {item.label}
                          </span>
                        </div>

                        <div className="flex items-center space-x-[10px]">
                          {item.id === 'wallet' && (
                            <span className="text-[11.5px] font-[700] text-neutral-600 bg-neutral-100/60 px-2.5 py-0.5 rounded-full border border-neutral-100/50 tracking-tight">
                              ₹{walletBalance.toLocaleString('en-IN')}
                            </span>
                          )}
                          <ChevronRight size={14} className={`text-neutral-300 stroke-[2.2] shrink-0 ${item.isLogout ? 'opacity-40' : ''}`} />
                        </div>
                      </motion.button>
                    </React.Fragment>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Global Premium Float Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="absolute top-[20px] left-[20px] right-[20px] bg-neutral-950/95 backdrop-blur-md text-white px-[16px] py-[12px] rounded-2xl z-[150] shadow-xl flex items-center space-x-[10px] border border-white/10"
            >
              <Sparkles size={16} className="text-[#FF8A00] shrink-0 animate-pulse" />
              <span className="text-[13px] font-[600] tracking-tight">{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
