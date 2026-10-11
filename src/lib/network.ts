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
