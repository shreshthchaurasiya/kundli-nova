import { storageAdapter } from './storage/storageAdapter';
import { KEYS } from './storage/storageKeys';
import { Repositories } from '../repositories/createRepositories';
import { KundliProfile } from '../types/kundli';
import { UserProfile } from '../types/profile';

const MIGRATION_MARKER = 'kundli_nova_data_migration_v1';

export const runLegacyMigration = async (repositories: Repositories): Promise<void> => {
  const isMigrated = storageAdapter.getItem<string | null>(MIGRATION_MARKER, null);
  if (isMigrated === 'complete') {
    return;
  }

  console.log('Starting legacy data migration to backend API...');
  let success = true;

  try {
    // Migrate Profile
    const localProfile = storageAdapter.getItem<UserProfile | null>(KEYS.PROFILE, null);
    if (localProfile) {
      console.log('Migrating local profile...');
      await repositories.profile.saveProfile(localProfile);
      storageAdapter.removeItem(KEYS.PROFILE);
    }

    // Migrate Kundli Profiles
    const localProfiles = storageAdapter.getItem<KundliProfile[]>(KEYS.PROFILES_LIST, []);
    
    if (localProfiles.length > 0) {
      console.log(`Migrating ${localProfiles.length} local kundli profiles...`);
      // First get remote profiles to avoid exact duplicates
      const remoteProfiles = await repositories.kundliProfile.getAllProfiles();
      
      for (const profile of localProfiles) {
        // Simple deduplication logic based on name and DOB
        // @ts-ignore
        const existsRemote = remoteProfiles.some(
          // @ts-ignore
          rp => rp.name === profile.name && rp.dateOfBirth === profile.dateOfBirth
        );
        
        if (!existsRemote) {
          // Remove ID so backend generates a fresh UUID
          const { id, ...profileData } = profile as any;
          await repositories.kundliProfile.createProfile(profileData);
        }
      }
      // Assuming success, clear local data
      storageAdapter.removeItem(KEYS.PROFILES_LIST);
    }

    // Wallet, Chat, and Consultations should NOT be migrated back to the server
    // because they are secure ledger records. The server is the only source of truth.
    // We just clear out the legacy local stubs.
    storageAdapter.removeItem(KEYS.WALLET);
    storageAdapter.removeItem(KEYS.WALLET_BALANCE_OLD);
    storageAdapter.removeItem(KEYS.TRANSACTIONS_OLD);
    storageAdapter.removeItem(KEYS.ACTIVE_REQUEST);
    storageAdapter.removeItem(KEYS.ACTIVE_REQUEST_TIME);
    storageAdapter.removeItem(KEYS.SESSION_HISTORY);
    storageAdapter.removeItem(KEYS.SESSION_HISTORY_SEEDED);
    storageAdapter.removeItem(KEYS.AI_HISTORY);
    // Keys for chat dynamically use prefixes, we'd need to clear localStorage entirely
    // but that's too invasive. The keys above match the constants.

  } catch (error) {
    console.error('Legacy migration partially failed:', error);
    success = false;
  }

  if (success) {
    console.log('Legacy migration completed successfully.');
    storageAdapter.setItem(MIGRATION_MARKER, 'complete');
  } else {
    console.warn('Legacy migration halted due to errors. Will retry next session.');
  }
};
