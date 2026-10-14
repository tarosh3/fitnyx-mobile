import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Keyboard, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { ArrowUpRight, Pause, Play } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOfflineAware } from '@/src/hooks/useOfflineAware';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { haptic } from '@/src/lib/haptics';
import { useAICoach } from '@/src/providers/AICoachProvider';
import { useAuth } from '@/src/providers/AuthProvider';
import { useWorkout, useWorkoutTimer } from '@/src/providers/WorkoutProvider';
import { useSetWorkoutOverlayInset } from '@/src/providers/WorkoutOverlayProvider';
import { elevation, radii, spacing, type } from '@/src/styles/tokens';
import { bottomNavClearance, isBottomNavRoute } from './bottomNavLayout';

const WORKOUT_ART = require('../../../assets/images/workouts/strength-equipment.png');

export function ActiveSessionIndicator() {
  const palette = useThemeColors();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const { user, loading: authLoading, onboardingComplete, isAuthOpen } = useAuth();
  const { isOpen: coachOpen } = useAICoach();
  const { activeSession, pauseActiveSession, resumeActiveSession } = useWorkout();
  const { elapsedTime, formatTime } = useWorkoutTimer();
  const { isOffline } = useOfflineAware();
  const [keyboardVisible, setKeyboardVisible] = useState(Keyboard.isVisible());
  const [busy, setBusy] = useState(false);
  const actionPending = useRef(false);
  const [height, setHeight] = useState(0);
  const setOverlayInset = useSetWorkoutOverlayInset();

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // Full-screen workout flows already have their own action bars. Keeping the
  // player on dock routes also gives it a single, predictable bottom clearance.
  const hidden = !activeSession || !['in_progress', 'paused'].includes(activeSession.status)
    || !user || authLoading || !onboardingComplete || isAuthOpen || coachOpen
    || keyboardVisible || !isBottomNavRoute(pathname)
    || pathname === '/auth' || pathname.startsWith('/auth/');
  useEffect(() => {
    setOverlayInset(hidden ? 0 : height + spacing.md);
    return () => setOverlayInset(0);
  }, [hidden, height, setOverlayInset]);
  if (hidden || !activeSession) return null;

  const running = activeSession.status === 'in_progress';
  const ready = activeSession.status === 'paused' && activeSession.total_duration_sec === 0;
  const stateLabel = ready ? 'Ready' : running ? 'Training' : 'Paused';
  const time = formatTime(running ? elapsedTime : activeSession.total_duration_sec);
  const actionLabel = running ? 'Pause workout timer' : ready ? 'Start workout timer' : 'Resume workout timer';
  const compact = width < 360 || fontScale > 1.3;

  const toggleTimer = async () => {
    // The ref closes the gap before React applies disabled after a quick tap.
    if (actionPending.current) return;
    actionPending.current = true;
    setBusy(true);
    haptic.light();
    try {
      if (running) await pauseActiveSession();
      else await resumeActiveSession();
    } catch {
      Alert.alert('Couldn’t update the timer', 'Please try again. You can also open your workout to check its status.');
    } finally {
      actionPending.current = false;
      setBusy(false);
    }
  };

  return (
    <View pointerEvents="box-none" style={[
      styles.container,
      {
        bottom: bottomNavClearance(insets.bottom) + spacing.md,
        paddingLeft: Math.max(insets.left, spacing.base),
        paddingRight: Math.max(insets.right, spacing.base),
      },
    ]}>
      <View testID="active-session-player" onLayout={(event) => setHeight(event.nativeEvent.layout.height)} style={[styles.player, { backgroundColor: palette.hero.to, borderColor: palette.hero.line }]}>
        <Pressable
          testID="active-session-open"
          onPress={() => router.push(`/workouts/session/${activeSession.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`Open workout. ${stateLabel}. ${time} elapsed.${isOffline ? ' Offline.' : ''}`}
          accessibilityHint="Shows your exercises and workout log"
          style={({ pressed }) => [styles.body, pressed && styles.pressed]}
        >
          {!compact ? (
            <View style={[styles.artwork, { backgroundColor: palette.hero.from }]}>
              <Image source={WORKOUT_ART} resizeMode="contain" accessible={false} style={styles.image} />
            </View>
          ) : null}
          <View style={styles.copy}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: palette.hero.muted }]}>Workout{isOffline ? ' · Offline' : ''}</Text>
              <ArrowUpRight size={14} color={palette.hero.muted} accessible={false} />
            </View>
            <View style={styles.timerRow}>
              <Text testID="active-session-time" style={[styles.time, { color: palette.hero.text }]}>{time}</Text>
              <Text testID="active-session-state" style={[styles.status, { color: palette.hero.accent }]}>{stateLabel}</Text>
            </View>
          </View>
        </Pressable>

        <Pressable
          testID="active-session-toggle"
          onPress={toggleTimer}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          accessibilityState={{ disabled: busy, busy }}
          style={({ pressed }) => [styles.control, { backgroundColor: palette.primary }, pressed && styles.pressed]}
        >
          {busy ? <ActivityIndicator color={palette.primaryText} /> : running
            ? <Pause size={21} color={palette.primaryText} fill={palette.primaryText} accessible={false} />
            : <Play size={21} color={palette.primaryText} fill={palette.primaryText} accessible={false} style={styles.playIcon} />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 40,
    alignItems: 'center',
  },
  player: {
    width: '100%',
    maxWidth: 520,
    alignItems: 'center',
    borderRadius: radii['2xl'],
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    ...elevation.sm,
  },
  body: {
    flex: 1,
    minWidth: 0,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  artwork: { width: 56, height: 56, borderRadius: radii.lg, overflow: 'hidden' },
  image: { width: 56, height: 56 },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  title: { fontFamily: type.weight.medium, fontSize: 12, lineHeight: 17, flexShrink: 1 },
  timerRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.sm, rowGap: 2 },
  status: {
    fontFamily: type.weight.semibold,
    fontSize: 12,
    lineHeight: 18,
  },
  time: {
    fontFamily: type.weight.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  control: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  playIcon: { marginLeft: 2 },
  pressed: { opacity: 0.75 },
});
