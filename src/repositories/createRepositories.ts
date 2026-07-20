import { IProfileRepository } from './interfaces/profile';
import { IWalletRepository } from './interfaces/wallet';
import { IKundliProfileRepository } from './interfaces/kundliProfile';
import { IConsultationRepository } from './interfaces/consultation';
import { IChatRepository } from './interfaces/chat';

import { ApiWalletRepository } from './api/apiWalletRepository';
import { SupabaseProfileRepository } from './supabase/supabaseProfileRepository';
import { SupabaseWalletRepository } from './supabase/supabaseWalletRepository';
import { ApiKundliProfileRepository } from './api/apiKundliProfileRepository';
import { ApiConsultationRepository } from './api/apiConsultationRepository';
import { ApiChatRepository } from './api/apiChatRepository';

// For fallback / legacy migration we still reference local repos if needed
import { LocalProfileRepository } from './local/localProfileRepository';

export interface Repositories {
  profile: IProfileRepository;
  wallet: IWalletRepository;
  kundliProfile: IKundliProfileRepository;
  consultation: IConsultationRepository;
  chat: IChatRepository;
}

export const createRepositories = (): Repositories => {
  const dataSource = (import.meta as any).env.VITE_DATA_SOURCE || 'api';

  if (dataSource === 'local') {
    // Only profile is fully mocked here for simplicity since local mode is temporary fallback
    // Full local fallback would need to implement everything or just throw for unsupported ones.
    console.warn('Running with local data source fallback. Some features may be unsupported.');
    return {
      profile: new LocalProfileRepository(),
      wallet: new ApiWalletRepository(),
      kundliProfile: new ApiKundliProfileRepository(),
      consultation: new ApiConsultationRepository(),
      chat: new ApiChatRepository(),
    };
  }

  return {
    // Profile and wallet reads use Supabase directly so standalone `npx vite`
    // previews remain synced without requiring the Express API process.
    profile: new SupabaseProfileRepository(),
    wallet: new SupabaseWalletRepository(),
    kundliProfile: new ApiKundliProfileRepository(),
    consultation: new ApiConsultationRepository(),
    chat: new ApiChatRepository(),
  };
};
