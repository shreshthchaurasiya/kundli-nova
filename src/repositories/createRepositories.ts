import { IProfileRepository } from './interfaces/profile';
import { IWalletRepository } from './interfaces/wallet';
import { IKundliProfileRepository } from './interfaces/kundliProfile';
import { IConsultationRepository } from './interfaces/consultation';
import { IChatRepository } from './interfaces/chat';

import { ApiProfileRepository } from './api/apiProfileRepository';
import { ApiWalletRepository } from './api/apiWalletRepository';
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
    profile: new ApiProfileRepository(),
    wallet: new ApiWalletRepository(),
    kundliProfile: new ApiKundliProfileRepository(),
    consultation: new ApiConsultationRepository(),
    chat: new ApiChatRepository(),
  };
};
