import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './auth';
import { RepositoryProvider } from './repositories/repositoryProvider';
import { ProfileProvider } from './contexts/ProfileContext';
import { WalletProvider } from './contexts/WalletContext';
import { AstrologerPartnerProvider } from './features/astrologer';
import { AstrologerDashboardProvider } from './astrologer-workspace';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RepositoryProvider>
        <ProfileProvider>
          <WalletProvider>
            <AstrologerPartnerProvider>
              <AstrologerDashboardProvider>
                <App />
              </AstrologerDashboardProvider>
            </AstrologerPartnerProvider>
          </WalletProvider>
        </ProfileProvider>
      </RepositoryProvider>
    </AuthProvider>
  </StrictMode>,
);
