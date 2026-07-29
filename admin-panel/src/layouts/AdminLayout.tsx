import { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  LayoutDashboard,
  Users,
  Star,
  MessageSquare,
  CreditCard,
  Wallet,
  TrendingUp,
  PercentSquare,
  Building2,
  ArrowRightLeft,
  FileText,
  Bell,
  Settings,
  ShieldCheck,
  LogOut,
  Menu,
  X
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Revenue', icon: TrendingUp, path: '/revenue' },
  { label: 'Astrologers', icon: Star, path: '/astrologers' },
  { label: 'Users', icon: Users, path: '/users' },
  { label: 'Consultations', icon: MessageSquare, path: '/consultations' },
  { label: 'Payments', icon: CreditCard, path: '/payments' },
  { label: 'Wallet', icon: Wallet, path: '/wallet' },
  { label: 'Astro Commission', icon: PercentSquare, path: '/commission' },
  { label: 'Payout Accounts', icon: Building2, path: '/payout-accounts' },
  { label: 'Withdrawals', icon: ArrowRightLeft, path: '/withdrawals' },
  { label: 'Statements', icon: FileText, path: '/statements' },
  { label: 'Notifications', icon: Bell, path: '/notifications' },
  { label: 'Settings', icon: Settings, path: '/settings' },
  { label: 'Audit Logs', icon: ShieldCheck, path: '/audit-logs' },
];

export function AdminLayout() {
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const [pendingAstrologers, setPendingAstrologers] = useState(0);

  useEffect(() => {
    const checkAdmin = () => {
      const isAuth = localStorage.getItem('adminAuth') === 'true';
      if (!isAuth) {
        navigate('/login');
      } else {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [location.pathname, navigate]);

  useEffect(() => {
    // Fetch pending withdrawals count
    const fetchPendingCount = async () => {
      try {
        const { data, error } = await supabase.rpc('get_admin_withdrawals', {
          p_filters: { status: 'REQUESTED' },
          p_limit: 1,
          p_offset: 0
        });
        if (!error && data) {
          setPendingWithdrawals(data.total_count || 0);
        }
      } catch (err) {
        console.error("Failed to fetch pending withdrawals", err);
      }
      
      try {
        const { data, error } = await supabase.rpc('get_admin_astrologer_applications', {
          p_status: 'pending',
          p_limit: 1,
          p_offset: 0
        });
        if (!error && data) {
          setPendingAstrologers(data.total_count || 0);
        }
      } catch (err) {
        console.error("Failed to fetch pending astrologers", err);
      }
    };
    fetchPendingCount();
    
    // Set up a simple polling interval to keep it fresh
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    navigate('/login');
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-neutral-50"><div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-900" /></div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-neutral-200 bg-white md:flex">
        <div className="flex h-16 items-center border-b border-neutral-100 px-6">
          <h1 className="text-lg font-black text-neutral-900">Kundli Nova Admin</h1>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 no-scrollbar">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
                  isActive ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <Icon size={18} />
                  {item.label}
                </div>
                {item.path === '/withdrawals' && pendingWithdrawals > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {pendingWithdrawals}
                  </span>
                )}
                {item.path === '/astrologers' && pendingAstrologers > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {pendingAstrologers}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-neutral-100 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-red-500 transition-colors hover:bg-red-50"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform flex-col bg-white transition-transform duration-300 ease-in-out md:hidden ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 items-center justify-between border-b border-neutral-100 px-6">
          <h1 className="text-lg font-black text-neutral-900">Admin</h1>
          <button onClick={() => setMobileMenuOpen(false)}>
            <X size={24} className="text-neutral-500" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition-colors ${
                  isActive ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <Icon size={18} />
                  {item.label}
                </div>
                {item.path === '/withdrawals' && pendingWithdrawals > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {pendingWithdrawals}
                  </span>
                )}
                {item.path === '/astrologers' && pendingAstrologers > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {pendingAstrologers}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-4 md:hidden">
          <button onClick={() => setMobileMenuOpen(true)}>
            <Menu size={24} className="text-neutral-900" />
          </button>
          <h1 className="text-sm font-black text-neutral-900">Kundli Nova Admin</h1>
          <div className="w-6" /> {/* Spacer */}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
