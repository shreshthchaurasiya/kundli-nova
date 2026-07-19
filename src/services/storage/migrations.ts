import { KEYS, STORAGE_VERSION_KEY } from './storageKeys';
import { storageAdapter } from './storageAdapter';
import { WalletState, WalletTransaction } from '../../types/wallet';
import { KundliProfile } from '../../types/kundli';
import { BirthDetails } from '../../types/profile';
import { BUSINESS_RULES } from '../../config/businessRules';

export function runMigrations(): void {
  try {
    const rawVersion = storageAdapter.getRaw(STORAGE_VERSION_KEY);
    const currentVersion = rawVersion ? parseInt(rawVersion, 10) : 0;

    if (currentVersion >= BUSINESS_RULES.STORAGE_VERSION) {
      console.log(`[StorageMigrations] Current storage version is up to date: v${currentVersion}`);
      return;
    }

    console.log(`[StorageMigrations] Migrating storage from v${currentVersion} to v${BUSINESS_RULES.STORAGE_VERSION}`);

    // --- PHASE 1: Wallet Migration ---
    const canonicalWalletExists = localStorage.getItem(KEYS.WALLET) !== null;
    if (!canonicalWalletExists) {
      const oldBalanceStr = localStorage.getItem(KEYS.WALLET_BALANCE_OLD);
      const oldTxsStr = localStorage.getItem(KEYS.TRANSACTIONS_OLD);

      let balance = BUSINESS_RULES.WALLET.INITIAL_BALANCE;
      if (oldBalanceStr !== null) {
        const parsedBalance = parseFloat(oldBalanceStr);
        if (!isNaN(parsedBalance)) {
          balance = parsedBalance;
        }
      }

      let transactions: WalletTransaction[] = [];
      if (oldTxsStr) {
        try {
          const oldTxs = JSON.parse(oldTxsStr);
          if (Array.isArray(oldTxs)) {
            const seenIds = new Set<string>();
            oldTxs.forEach((tx: any) => {
              // Standardize values
              const amount = tx.amount ?? parseFloat(tx.amt?.replace(/[^0-9.-]/g, '')) ?? 0;
              const title = tx.title ?? tx.description ?? (tx.type === 'credit' ? 'Wallet Recharge' : 'Consultation Charge');
              const status = tx.status || 'completed';
              
              // Standardize timestamp to epoch milliseconds
              let timestamp = Date.now();
              if (tx.timestamp) {
                if (typeof tx.timestamp === 'number') {
                  timestamp = tx.timestamp;
                } else {
                  const dateObj = new Date(tx.timestamp);
                  if (!isNaN(dateObj.getTime())) {
                    timestamp = dateObj.getTime();
                  }
                }
              }
              
              const createdAt = new Date(timestamp).toISOString();

              // Unique ID or generate fingerprint
              const id = tx.id || `tx-fp-${tx.type}-${amount}-${timestamp}-${title.replace(/\s+/g, '_')}`;

              if (!seenIds.has(id)) {
                seenIds.add(id);
                transactions.push({
                  id,
                  type: tx.type === 'debit' ? 'debit' : 'credit',
                  amount,
                  title,
                  description: tx.description || title,
                  status,
                  createdAt,
                  referenceType: tx.referenceType,
                  referenceId: tx.referenceId
                });
              }
            });
          }
        } catch (e) {
          console.error('[StorageMigrations] Error parsing legacy wallet transactions', e);
        }
      }

      // Save to canonical wallet state
      const initialWalletState: WalletState = {
        balance,
        transactions,
        updatedAt: new Date().toISOString()
      };
      storageAdapter.setItem(KEYS.WALLET, initialWalletState);
      console.log('[StorageMigrations] Migrated wallet data successfully.');
    }

    // --- PHASE 2: Profile & Kundli Profiles Migration ---
    const canonicalProfilesExists = localStorage.getItem(KEYS.PROFILES_LIST) !== null;
    if (!canonicalProfilesExists) {
      const profilesList: KundliProfile[] = [];
      const oldProfileStr = localStorage.getItem(KEYS.PROFILE);
      let defaultProfileId = '';

      // 1. Check default profile details
      if (oldProfileStr) {
        try {
          const birthDetails: BirthDetails = JSON.parse(oldProfileStr);
          if (birthDetails && birthDetails.name) {
            defaultProfileId = `profile-self-${Date.now()}`;
            const selfProfile: KundliProfile = {
              id: defaultProfileId,
              ownerId: 'current-user',
              name: birthDetails.name,
              relation: 'self',
              birthDetails,
              isDefault: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            profilesList.push(selfProfile);
          }
        } catch (e) {
          console.error('[StorageMigrations] Error parsing legacy default profile', e);
        }
      }

      // 2. Scan for custom name-based saved Kundli charts
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(KEYS.SAVED_KUNDLI_PREFIX)) {
            const rawSaved = localStorage.getItem(key);
            if (rawSaved) {
              const kData = JSON.parse(rawSaved);
              const name = kData.birthDetails?.name || key.replace(KEYS.SAVED_KUNDLI_PREFIX, '');
              const cleanName = name.replace(/_+/g, ' ');
              
              // Skip if it's the self profile we already created to avoid duplication
              if (profilesList.some(p => p.name.toLowerCase() === cleanName.toLowerCase())) {
                continue;
              }

              const profileId = `profile-migrated-${cleanName.toLowerCase().replace(/\s+/g, '_')}-${Date.now()}`;
              profilesList.push({
                id: profileId,
                ownerId: 'current-user',
                name: cleanName,
                relation: 'other',
                birthDetails: kData.birthDetails || {
                  name: cleanName,
                  gender: 'male',
                  dob: '1995-10-15',
                  tob: '12:00',
                  state: 'Uttar Pradesh',
                  district: 'Varanasi',
                  city: 'Varanasi'
                },
                kundliData: kData,
                isDefault: false,
                createdAt: kData.generatedAt ? new Date(kData.generatedAt).toISOString() : new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
            }
          }
        }
      } catch (e) {
        console.error('[StorageMigrations] Error scanning legacy saved Kundli profiles', e);
      }

      // If list is empty but profile is seeded, generate a basic default
      if (profilesList.length === 0) {
        const fallbackId = `profile-self-fallback-${Date.now()}`;
        profilesList.push({
          id: fallbackId,
          ownerId: 'current-user',
          name: 'Shreshth',
          relation: 'self',
          birthDetails: {
            name: 'Shreshth',
            gender: 'male',
            dob: '1995-10-15',
            tob: '10:30',
            state: 'Uttar Pradesh',
            district: 'Varanasi',
            city: 'Varanasi'
          },
          isDefault: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      storageAdapter.setItem(KEYS.PROFILES_LIST, profilesList);
      console.log('[StorageMigrations] Migrated Kundli profiles successfully. Profile count:', profilesList.length);
    }

    // Set storage version to 2
    storageAdapter.setRaw(STORAGE_VERSION_KEY, BUSINESS_RULES.STORAGE_VERSION.toString());
    console.log(`[StorageMigrations] Successfully upgraded storage to version v${BUSINESS_RULES.STORAGE_VERSION}`);
  } catch (error) {
    console.error('[StorageMigrations] Migration failed unexpectedly', error);
  }
}
