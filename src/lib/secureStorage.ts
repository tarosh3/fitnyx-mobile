import * as SecureStore from 'expo-secure-store';

/**
 * SecureStore-backed storage adapter compatible with Supabase's auth storage interface.
 *
 * Uses the device keychain (iOS) / EncryptedSharedPreferences (Android)
 * instead of plain-text AsyncStorage for auth tokens, session IDs,
 * and other identity-sensitive data.
 */
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('SecureStore setItem failed:', error);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Key may not exist — safe to ignore
    }
  },
};
