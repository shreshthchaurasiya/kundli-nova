export const storageAdapter = {
  getItem<T>(key: string, fallback: T): T {
    try {
      const value = localStorage.getItem(key);
      if (value === null) {
        return fallback;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      console.warn(`[StorageAdapter] Failed to parse key "${key}". Backing up corrupt data and resetting.`, error);
      // Backup corrupt string
      const rawVal = localStorage.getItem(key);
      if (rawVal !== null) {
        try {
          localStorage.setItem(`kundli_nova_corrupt_backup_${key}_${Date.now()}`, rawVal);
        } catch (backupError) {
          console.error('[StorageAdapter] Failed to write backup key.', backupError);
        }
      }
      // Re-initialize with fallback
      this.setItem(key, fallback);
      return fallback;
    }
  },

  setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`[StorageAdapter] Failed to set key "${key}".`, error);
    }
  },

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`[StorageAdapter] Failed to remove key "${key}".`, error);
    }
  },

  getRaw(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`[StorageAdapter] Failed to read raw key "${key}".`, error);
      return null;
    }
  },

  setRaw(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(`[StorageAdapter] Failed to write raw key "${key}".`, error);
    }
  }
};
