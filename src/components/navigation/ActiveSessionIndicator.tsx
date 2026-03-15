import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Timer } from 'lucide-react-native';

import { useOfflineAware } from '@/src/hooks/useOfflineAware';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useWorkout, useWorkoutTimer } from '@/src/providers/WorkoutProvider';

export function ActiveSessionIndicator() {
  const palette = useThemeColors();
  const router = useRouter();
  const pathname = usePathname();
  const { activeSession } = useWorkout();
  const { elapsedTime, formatTime } = useWorkoutTimer();
  const { isOffline } = useOfflineAware();

  if (!activeSession || pathname === `/workouts/session/${activeSession.id}`) return null;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => router.push(`/workouts/session/${activeSession.id}`)}
        style={[styles.button, { backgroundColor: palette.primary }]}
      >
        <Timer color={palette.primaryText} size={16} />
        <View>
          <Text style={[styles.status, { color: palette.primaryText }]}>
            {isOffline ? 'ACTIVE SESSION (OFFLINE)' : 'ACTIVE SESSION'}
          </Text>
          <Text style={[styles.time, { color: palette.primaryText }]}>{formatTime(elapsedTime)}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    bottom: 92,
    position: 'absolute',
    right: 16,
    zIndex: 40,
  },
  button: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  status: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  time: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 1,
  },
});
