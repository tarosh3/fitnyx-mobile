import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/src/providers/AuthProvider';
import { getRecordingFor, subscribe } from './recordingStore';
import { drainRoamControls, subscribeRoamControls, syncRoamNotification } from './notifications';

/** Lives above routes, so leaving the map does not disconnect live controls. */
export function RoamNotificationSync() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    const sync = () => {
      void getRecordingFor(user.id).then(() => drainRoamControls()).then(() => syncRoamNotification(true)).catch((error) => console.warn('Roam control sync pending', error));
    };
    sync();
    const native = subscribeRoamControls(sync);
    const updates = subscribe((points) => { void syncRoamNotification(points.length === 0); });
    const foreground = AppState.addEventListener('change', (state) => { if (state === 'active') sync(); });
    return () => { native(); updates(); foreground.remove(); };
  }, [user?.id]);
  return null;
}
