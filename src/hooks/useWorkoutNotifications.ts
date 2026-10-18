import { subscribeWorkoutDetails } from '@/src/lib/workoutActivityDetails';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import type { WorkoutSession } from '@/src/lib/api/workoutSessions';
import { resolveId } from '@/src/lib/offline/offlineStore';
import * as notification from '@/src/lib/workoutNotification';
import { getWorkoutState } from '@/src/lib/workoutNotificationState';

type Props = { activeSession: WorkoutSession | null; loading: boolean; pause: () => Promise<void>; resume: () => Promise<void> };

export function useWorkoutNotifications(props: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const latest = useRef({ ...props, pathname });
  latest.current = { ...props, pathname };

  useEffect(() => {
    // A restored native activity must survive the initial session lookup.
    if (props.loading) return;
    if (props.activeSession) void notification.showActiveWorkout(props.activeSession);
    else void notification.dismiss();
  }, [props.loading, props.activeSession?.id, props.activeSession?.status, props.activeSession?.total_duration_sec, props.activeSession?.last_resumed_at]);

  useEffect(() => subscribeWorkoutDetails(() => {
    const current = latest.current;
    if (!current.loading && current.activeSession) void notification.showActiveWorkout(current.activeSession);
  }), []);

  useEffect(() => {
    const open = async (id: string) => {
      const target = await resolveId(id);
      const current = latest.current;
      if (current.loading || current.activeSession?.id !== target) return;
      const path = `/workouts/session/${target}` as const;
      if (current.pathname !== path) router.push(path);
    };
    const unsubscribe = notification.onAction(async (action, id, state) => {
      if (action === 'open') { await open(id); return; }
      const target = await resolveId(id);
      const current = latest.current;
      if (!current.activeSession || current.activeSession.id !== target || getWorkoutState(current.activeSession) !== state) return;
      await (action === 'pause' ? current.pause() : current.resume());
    });
    let pending: ReturnType<typeof setTimeout> | undefined;
    const consume = () => {
      if (pending) clearTimeout(pending);
      pending = setTimeout(() => {
        notification.consumeOpenRequest().then((id) => { if (id) return open(id); }).catch(() => undefined);
      }, 300);
    };
    if (!props.loading) consume();
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') consume(); });
    return () => { unsubscribe(); subscription.remove(); if (pending) clearTimeout(pending); };
  }, [props.loading, router]);
}
