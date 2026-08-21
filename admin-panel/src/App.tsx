import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './layouts/AdminLayout';
import { AdminLoginScreen } from './features/auth/AdminLoginScreen';
import { AccessDeniedScreen } from './features/auth/AccessDeniedScreen';
import { AdminDashboardScreen } from './features/dashboard/AdminDashboardScreen';
import { RevenueScreen } from './features/revenue/RevenueScreen';
import { FinancialLedgerScreen } from './features/revenue/FinancialLedgerScreen';
import { AstrologersScreen } from './features/astrologers/AstrologersScreen';
import { PaymentsScreen } from './features/payments/PaymentsScreen';
import { WalletScreen } from './features/wallet/WalletScreen';
import { AstroCommissionScreen } from './features/commission/AstroCommissionScreen';
import { PayoutAccountsScreen } from './features/payout-accounts/PayoutAccountsScreen';
import { WithdrawalsScreen } from './features/withdrawals/WithdrawalsScreen';
import { UsersScreen } from './features/users/UsersScreen';
import { SubscriptionsScreen } from './features/subscriptions/SubscriptionsScreen';

// Placeholder screen for pending features
const PlaceholderScreen = ({ title }: { title: string }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-black text-neutral-900">{title}</h1>
    </div>
    <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center">
      <h2 className="text-lg font-bold text-neutral-900">Coming Soon</h2>
      <p className="mt-2 text-sm text-neutral-500">This module is under construction.</p>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AdminLoginScreen />} />
        <Route path="/access-denied" element={<AccessDeniedScreen />} />
        
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<AdminDashboardScreen />} />
          <Route path="revenue" element={<RevenueScreen />} />
          <Route path="ledger" element={<FinancialLedgerScreen />} />
          <Route path="astrologers" element={<AstrologersScreen />} />
          <Route path="payments" element={<PaymentsScreen />} />
          <Route path="payout-accounts" element={<PayoutAccountsScreen />} />
          <Route path="withdrawals" element={<WithdrawalsScreen />} />
          
          <Route path="users" element={<UsersScreen />} />
          <Route path="subscriptions" element={<SubscriptionsScreen />} />
          <Route path="consultations" element={<PlaceholderScreen title="Consultations" />} />
          <Route path="wallet" element={<WalletScreen />} />
          <Route path="commission" element={<AstroCommissionScreen />} />
          <Route path="statements" element={<PlaceholderScreen title="Global Statements" />} />
          <Route path="notifications" element={<PlaceholderScreen title="Notifications" />} />
          <Route path="settings" element={<PlaceholderScreen title="Platform Settings" />} />
          <Route path="audit-logs" element={<PlaceholderScreen title="Audit Logs" />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
