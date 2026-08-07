import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiProfileRepository } from '../apiProfileRepository';
import { ApiWalletRepository } from '../apiWalletRepository';
import { ApiKundliProfileRepository } from '../apiKundliProfileRepository';
import { ApiClient } from '../../../services/api/apiClient';

vi.mock('../../../services/api/apiClient', () => ({
  ApiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  }
}));

vi.mock('../../../services/api/endpoints', () => ({
  ENDPOINTS: {
    PROFILE: { GET: '/profile', UPDATE: '/profile' },
    WALLET: { GET: '/wallet', TRANSACTIONS: '/wallet/transactions', RECHARGE: '/wallet/recharge' },
    KUNDLI: { LIST: '/kundli-profiles', CREATE: '/kundli-profiles' },
  }
}));

describe('API Repositories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ApiProfileRepository', () => {
    it('fetches authenticated profile', async () => {
      const repo = new ApiProfileRepository();
      (ApiClient.get as any).mockResolvedValueOnce({ id: 'u1', name: 'Test' });
      const profile = await repo.getProfile();
      expect(profile).toEqual({ id: 'u1', name: 'Test' });
      expect(ApiClient.get).toHaveBeenCalledWith(expect.stringContaining('/profile'));
    });

    it('updates profile', async () => {
      const repo = new ApiProfileRepository();
      (ApiClient.patch as any).mockResolvedValueOnce({ id: 'u1', name: 'Updated' });
      const profile = await repo.saveProfile({ name: 'Updated' });
      expect(profile.name).toBe('Updated');
    });
  });

  describe('ApiWalletRepository', () => {
    it('reads wallet balance', async () => {
      const repo = new ApiWalletRepository();
      (ApiClient.get as any).mockResolvedValueOnce({ balance: 500 });
      const state = await repo.getWalletState();
      expect(state.balance).toBe(500);
    });

    it('rejects client-side wallet mutation', async () => {
      const repo = new ApiWalletRepository();
      await expect(repo.debit()).rejects.toThrow('Direct frontend wallet debit is not allowed');
    });

    it('rejects direct recharge in favor of verified Razorpay checkout', async () => {
      const repo = new ApiWalletRepository();
      await expect(repo.recharge(100, 'Test', 'idemp-123')).rejects.toThrow('verified Razorpay checkout');
      expect(ApiClient.post).not.toHaveBeenCalled();
    });
  });
  
  describe('ApiKundliProfileRepository', () => {
    it('creates profile', async () => {
      const repo = new ApiKundliProfileRepository();
      (ApiClient.post as any).mockResolvedValueOnce({ id: 'k1', name: 'Self' });
      const profile = await repo.createProfile({ name: 'Self' });
      expect(profile.id).toBe('k1');
    });
  });
});
