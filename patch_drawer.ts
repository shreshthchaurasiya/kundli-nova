import * as fs from 'fs';

const filePath = 'src/App.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Update menu items to be dynamic based on mode
const menuItemsOld = `  const menuItems = [
    { id: 'profile', label: 'My Profile', icon: <User size={20} strokeWidth={1.8} className="text-neutral-500" /> },
    { id: 'wallet', label: 'Wallet', icon: <Wallet size={20} strokeWidth={1.8} className="text-neutral-500" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={20} strokeWidth={1.8} className="text-neutral-500" /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} strokeWidth={1.8} className="text-neutral-500" /> },
    { id: 'help', label: 'Help & Support', icon: <HelpCircle size={20} strokeWidth={1.8} className="text-neutral-500" /> },
    { id: 'logout', label: 'Logout', icon: <LogOut size={20} strokeWidth={1.8} className="text-[#EF4444]/70" />, isLogout: true },
  ];`;

const menuItemsNew = `  const isAstrologerMode = currentScreen === 'astrologer-dashboard';
  
  const menuItems = isAstrologerMode ? [
    { id: 'profile', label: 'Public Profile', icon: <User size={20} strokeWidth={1.8} className="text-emerald-500" /> },
    { id: 'wallet', label: 'Earnings & Payouts', icon: <Wallet size={20} strokeWidth={1.8} className="text-emerald-500" /> },
    { id: 'notifications', label: 'Dashboard Alerts', icon: <Bell size={20} strokeWidth={1.8} className="text-emerald-500" /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} strokeWidth={1.8} className="text-emerald-500" /> },
    { id: 'help', label: 'Partner Support', icon: <HelpCircle size={20} strokeWidth={1.8} className="text-emerald-500" /> },
    { id: 'logout', label: 'Logout', icon: <LogOut size={20} strokeWidth={1.8} className="text-[#EF4444]/70" />, isLogout: true },
  ] : [
    { id: 'profile', label: 'My Profile', icon: <User size={20} strokeWidth={1.8} className="text-neutral-500" /> },
    { id: 'wallet', label: 'Wallet', icon: <Wallet size={20} strokeWidth={1.8} className="text-neutral-500" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={20} strokeWidth={1.8} className="text-neutral-500" /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} strokeWidth={1.8} className="text-neutral-500" /> },
    { id: 'help', label: 'Help & Support', icon: <HelpCircle size={20} strokeWidth={1.8} className="text-neutral-500" /> },
    { id: 'logout', label: 'Logout', icon: <LogOut size={20} strokeWidth={1.8} className="text-[#EF4444]/70" />, isLogout: true },
  ];`;
content = content.replace(menuItemsOld, menuItemsNew);

// Update Drawer Header Rendering
const headerOld = `                {/* Profile Header Section */}
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
                </div>`;

const headerNew = `                {/* Profile Header Section */}
                <div className={\`pt-[max(48px,env(safe-area-inset-top))] pb-[20px] px-[24px] flex flex-col items-start \${isAstrologerMode ? 'bg-[#111827] text-white' : 'bg-white text-neutral-900'}\`}>
                  <p className={\`text-[11px] font-[700] uppercase tracking-widest leading-none mb-[16px] \${isAstrologerMode ? 'text-emerald-400' : 'text-neutral-400'}\`}>
                    {isAstrologerMode ? 'Astrologer Mode' : getGreeting()}
                  </p>

                  <motion.div
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      setIsDrawerOpen(false);
                      if (isAstrologerMode) {
                         // astrologer profile edit would go here if needed, or do nothing as it's handled in dashboard
                      } else {
                         handleTabChange('profile');
                      }
                    }}
                    className="relative mb-[16px] cursor-pointer group rounded-full overflow-hidden"
                  >
                    <div className={\`w-[64px] h-[64px] rounded-full flex items-center justify-center text-[24px] font-[800] shrink-0 relative overflow-hidden transition-all duration-300 \${
                      isAstrologerMode ? 'bg-gradient-to-tr from-emerald-500 to-emerald-400 text-white shadow-[0_4px_16px_rgba(16,185,129,0.3)] ring-4 ring-[#111827]' : 'bg-gradient-to-tr from-[#FF8A00] to-[#FFA733] text-white shadow-[0_4px_16px_rgba(255,138,0,0.15)] ring-4 ring-neutral-50'
                    }\`}>
                      {(isAstrologerMode && astrologerWorkspace?.image) ? (
                        <img src={astrologerWorkspace.image} alt={astrologerWorkspace.name} className="w-full h-full object-cover" />
                      ) : (
                        isAstrologerMode ? (astrologerWorkspace?.name?.charAt(0).toUpperCase() || 'A') : userName.charAt(0).toUpperCase()
                      )}
                      {!isAstrologerMode && (
                        <div className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center duration-200">
                          <Pencil size={14} className="text-white fill-none stroke-[2.5]" />
                        </div>
                      )}
                    </div>
                  </motion.div>

                  <h2 className="text-[19px] font-[800] tracking-tight leading-tight">{isAstrologerMode ? astrologerWorkspace?.name : userName}</h2>
                  <p className={\`text-[11.5px] font-semibold leading-none mt-[6px] \${isAstrologerMode ? 'text-neutral-400' : 'text-neutral-400'}\`}>
                    {isAstrologerMode ? 'Manage your Workspace' : 'Manage your Kundli Nova account'}
                  </p>
                  {!isAstrologerMode && userPhone && (
                    <p className="text-[12.5px] text-neutral-500 font-medium leading-none mt-[10px]">{userPhone}</p>
                  )}
                </div>`;
content = content.replace(headerOld, headerNew);

// Fix the wallet balance showing in astrologer mode
const walletBadgeOld = `                        <div className="flex items-center space-x-[10px]">
                          {item.id === 'wallet' && (
                            <span className="text-[11.5px] font-[700] text-neutral-600 bg-neutral-100/60 px-2.5 py-0.5 rounded-full border border-neutral-100/50 tracking-tight">
                              ₹{walletBalance.toLocaleString('en-IN')}
                            </span>
                          )}
                          <ChevronRight size={14} className={\`text-neutral-300 stroke-[2.2] shrink-0 \${item.isLogout ? 'opacity-40' : ''}\`} />
                        </div>`;

const walletBadgeNew = `                        <div className="flex items-center space-x-[10px]">
                          {item.id === 'wallet' && !isAstrologerMode && (
                            <span className="text-[11.5px] font-[700] text-neutral-600 bg-neutral-100/60 px-2.5 py-0.5 rounded-full border border-neutral-100/50 tracking-tight">
                              ₹{walletBalance.toLocaleString('en-IN')}
                            </span>
                          )}
                          <ChevronRight size={14} className={\`text-neutral-300 stroke-[2.2] shrink-0 \${item.isLogout ? 'opacity-40' : ''}\`} />
                        </div>`;
content = content.replace(walletBadgeOld, walletBadgeNew);

fs.writeFileSync(filePath, content);
console.log('Patched app drawer for astrologer mode');
