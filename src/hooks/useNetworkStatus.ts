import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Require isInternetReachable === true — treat null (unknown) as offline
    // to match offlineApi.ts and avoid triggering syncs/pings when connectivity is uncertain
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable === true));
    });

    NetInfo.fetch().then((state) => {
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable === true));
    });

    return unsubscribe;
  }, []);

  return { isOnline };
}
