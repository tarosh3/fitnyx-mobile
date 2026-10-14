import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { getWorkoutState } from '@/src/lib/workoutNotificationState';
import { useWorkout } from '@/src/providers/WorkoutProvider';

/** Live Activity Links are deliberate user actions; opening the card alone never starts it. */
export function useNotificationWorkoutAction(sessionId: string, loggerLoaded: boolean, onError: () => void) {
  const { notificationAction: action, notificationState: state } = useLocalSearchParams<{ notificationAction?: string; notificationState?: string }>();
  const { activeSession, pauseActiveSession, resumeActiveSession } = useWorkout();
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (!action) { handled.current = false; return; }
    if (!loggerLoaded || handled.current) return;
    handled.current = true;
    router.setParams({ notificationAction: undefined, notificationState: undefined });
    if (!activeSession || activeSession.id !== sessionId || getWorkoutState(activeSession) !== state) return;
    if (action === 'pause' && state === 'running') void pauseActiveSession().catch(onError);
    if (action === 'resume' && (state === 'ready' || state === 'paused')) void resumeActiveSession().catch(onError);
  }, [action, state, sessionId, loggerLoaded, activeSession, pauseActiveSession, resumeActiveSession, router, onError]);
}
