import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './auth';
import { RepositoryProvider } from './repositories/repositoryProvider';
import { ProfileProvider } from './contexts/ProfileContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RepositoryProvider>
        <ProfileProvider>
          <App />
        </ProfileProvider>
      </RepositoryProvider>
    </AuthProvider>
  </StrictMode>,
);
