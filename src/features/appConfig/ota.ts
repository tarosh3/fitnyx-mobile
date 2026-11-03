import * as Updates from 'expo-updates';

// expo-updates already checks at every cold start (app.json checkAutomatically: ON_LOAD);
// this adds a check when the app comes back to the foreground, at most this often.
const MIN_INTERVAL_MS = 30 * 60 * 1000;
let lastCheck = 0;
let running = false;

/**
 * Downloads a published OTA update (eas update) in the background. It is applied
 * at the next cold start, never mid-use: reloading could cut off a workout or
 * a Roam screen. Does nothing in dev / Expo Go / builds without expo-updates.
 */
export async function checkForOtaUpdate(now = Date.now(), dev = __DEV__): Promise<boolean> {
  if (dev || !Updates.isEnabled || running || now - lastCheck < MIN_INTERVAL_MS) return false;
  running = true;
  lastCheck = now;
  try {
    const { isAvailable } = await Updates.checkForUpdateAsync();
    if (!isAvailable) return false;
    const { isNew } = await Updates.fetchUpdateAsync();
    return isNew;
  } catch {
    return false; // offline, or the update server is unreachable
  } finally {
    running = false;
  }
}

/** Test helper. */
export function _resetOtaCheck() {
  lastCheck = 0;
  running = false;
}
