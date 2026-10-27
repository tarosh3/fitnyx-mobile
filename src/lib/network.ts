import NetInfo from '@react-native-community/netinfo';

/**
 * True only when the device reports no connection (or no internet) — not when
 * reachability is still unknown, as it is for a moment at launch. Used to skip
 * work that would just wait out network timeouts.
 */
export async function isDefinitelyOffline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === false || state.isInternetReachable === false;
  } catch {
    return false;
  }
}

/**
 * True only on an unmetered Wi-Fi connection — used to gate background media
 * downloads so they never run on cellular. Unknown/other types count as false.
 */
export async function isOnWifi(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.type === 'wifi' && state.isConnected === true;
  } catch {
    return false;
  }
}
