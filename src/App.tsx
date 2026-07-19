import React, { useState, useEffect } from 'react';
import { MessageCircle, User, Wallet, Bell, Settings, HelpCircle, LogOut, ChevronRight, Sparkles, Pencil } from 'lucide-react';
import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';
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
import AstrologerProfileScreen from './screens/AstrologerProfileScreen';
import CategoryDetailScreen from './screens/CategoryDetailScreen';
import NovaAIScreen from './screens/NovaAIScreen';
import NovaAIChatScreen from './screens/NovaAIChatScreen';
import NovaKundliScreen from './screens/NovaKundliScreen';
import BottomNav from './components/BottomNav';
import { Screen, Tab } from './types';
import { AnimatePresence, motion } from 'motion/react';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [currentTab, setCurrentTab] = useState<Tab>('home');
  const [routeParams, setRouteParams] = useState<any>({});
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string } | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  useEffect(() => {
    const profile = localStorage.getItem('kundli_nova_profile');
    if (profile) {
      setCurrentScreen('home');
    }
  }, []);

  useEffect(() => {
    const data = localStorage.getItem('kundli_nova_profile');
    if (data) {
      try {
        setProfileData(JSON.parse(data));
      } catch (e) {}
    } else {
      setProfileData(null);
    }
  }, [currentScreen, isDrawerOpen]);

  useEffect(() => {
    const getWalletData = () => {
      const data = localStorage.getItem('kundli_nova_wallet');
      if (data) {
        try {
          const parsed = JSON.parse(data);
          setWalletBalance(parsed.balance ?? 0);
        } catch (e) {}
      } else {
        const initialWallet = { balance: 0, transactions: [] };
        localStorage.setItem('kundli_nova_wallet', JSON.stringify(initialWallet));
        setWalletBalance(0);
      }
    };
    getWalletData();
  }, [isDrawerOpen, currentScreen]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const navigate = (screen: Screen, params?: any) => {
    setCurrentScreen(screen);
    if (params) setRouteParams(params);
  };

  const handleTabChange = (tab: Tab) => {
    setCurrentTab(tab);
    setCurrentScreen(tab);
  };

  const showBottomNav = ['home', 'chat-list', 'chat-history', 'nova-ai', 'services', 'profile', 'astrologers'].includes(currentScreen);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const userName = profileData?.name || 'Guest User';
  const userPhone = profileData?.phone || '+91 98765 43210';

  const menuItems = [
    { id: 'profile', label: 'My Profile', icon: <User size={20} strokeWidth={1.8} className="text-neutral-500" /> },
    { id: 'wallet', label: 'Wallet', icon: <Wallet size={20} strokeWidth={1.8} className="text-neutral-500" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={20} strokeWidth={1.8} className="text-neutral-500" /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} strokeWidth={1.8} className="text-neutral-500" /> },
    { id: 'help', label: 'Help & Support', icon: <HelpCircle size={20} strokeWidth={1.8} className="text-neutral-500" /> },
    { id: 'logout', label: 'Logout', icon: <LogOut size={20} strokeWidth={1.8} className="text-[#EF4444]/70" />, isLogout: true },
  ];

  const handleMenuClick = (id: string) => {
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
        setToast({ message: 'Connecting with Customer Support...' });
        break;
      case 'logout':
        localStorage.removeItem('kundli_nova_profile');
        navigate('splash');
        break;
      default:
        break;
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash': return <SplashScreen onFinish={(s) => navigate(s)} />;
      case 'login': return <LoginScreen onNavigate={navigate} />;
      case 'otp': return <OtpScreen onNavigate={navigate} />;
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
      case 'chat-history': return <ChatHistoryScreen onNavigate={navigate} />;
      case 'services': return <CategoryScreen onNavigate={navigate} />;
      case 'astrologers': return <AstrologersScreen onNavigate={navigate} />;
      case 'profile': return <ProfileScreen onNavigate={navigate} />;
      case 'astrologer-profile': return <AstrologerProfileScreen astrologerId={routeParams?.astrologerId} onNavigate={navigate} />;
      case 'category-detail': return <CategoryDetailScreen category={routeParams?.category} onNavigate={navigate} />;
      default: return <HomeScreen onNavigate={navigate} onOpenDrawer={() => setIsDrawerOpen(true)} />;
    }
  };

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
                {/* Profile Header Section - Left Aligned & Airy */}
                <div className="pt-[max(48px,env(safe-area-inset-top))] pb-[20px] px-[24px] flex flex-col items-start bg-white">
                  {/* Greeting label above avatar */}
                  <p className="text-[11px] font-[700] text-neutral-400 uppercase tracking-widest leading-none mb-[16px]">
                    {getGreeting()}
                  </p>

                  {/* Circular Avatar with soft tap hover pencil ripple */}
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
                      
                      {/* Subtle hover/active overlay with pencil icon */}
                      <div className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center duration-200">
                        <Pencil size={14} className="text-white fill-none stroke-[2.5]" />
                      </div>
                    </div>
                  </motion.div>

                  {/* Name and Account Manage Text */}
                  <h2 className="text-[19px] font-[800] text-neutral-900 tracking-tight leading-tight">{userName}</h2>
                  <p className="text-[11.5px] text-neutral-400 font-semibold leading-none mt-[6px]">Manage your Kundli Nova account</p>
                  
                  {/* Mobile number */}
                  <p className="text-[12.5px] text-neutral-500 font-medium leading-none mt-[10px]">{userPhone}</p>
                </div>

                {/* Ultra-thin divider separating header from menu */}
                <div className="h-[1px] bg-neutral-100/60 mx-[24px] mb-[8px]" />

                {/* Navigation Menu Items */}
                <div className="flex-1 overflow-y-auto py-[8px] no-scrollbar">
                  {menuItems.map((item) => (
                    <React.Fragment key={item.id}>
                      {/* Ultra-thin divider repeating before Logout option */}
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
                          {/* Rich Wallet info badge */}
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
