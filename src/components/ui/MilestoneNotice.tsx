import { useIsFocused } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { haptic } from '@/src/lib/haptics';
import { radii, spacing, type } from '@/src/styles/tokens';

const pending = new Map<string, Promise<boolean>>();

/** Establish a baseline first; never replay a reward on refresh or remount. */
export function claimMilestone(key: string, scope: string, value: number): Promise<boolean> {
  const previous = pending.get(key) ?? Promise.resolve(false);
  const next = previous.catch(() => false).then(async () => {
    const raw = await AsyncStorage.getItem(key);
    let saved: { scope: string; value: number } | null = null;
    try { saved = raw ? JSON.parse(raw) : null; } catch { /* Reset a malformed baseline. */ }
    const known = saved?.scope === scope && Number.isFinite(saved.value);
    const reached = known && value > saved!.value;
    await AsyncStorage.setItem(key, JSON.stringify({ scope, value: known ? Math.max(value, saved!.value) : value }));
    return Boolean(reached);
  });
  pending.set(key, next);
  void next.finally(() => { if (pending.get(key) === next) pending.delete(key); }).catch(() => undefined);
  return next;
}

/** Inline and non-blocking. Goal scope includes date/targets to avoid false rewards after edits. */
export function MilestoneNotice({ storageKey, scope, value, ready, message }: {
  storageKey: string; scope: string; value: number; ready: boolean; message: string;
}) {
  const focused = useIsFocused();
  const c = useThemeColors();
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(false);
    if (!ready || !focused) return;
    let alive = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    void claimMilestone(storageKey, scope, value).then((claimed) => {
      if (!alive || !claimed) return;
      haptic.success();
      AccessibilityInfo.announceForAccessibility?.(message);
      setVisible(true);
      timeout = setTimeout(() => setVisible(false), 4000);
    }).catch(() => undefined);
    return () => { alive = false; clearTimeout(timeout); };
  }, [storageKey, scope, value, ready, message, focused]);
  if (!visible || !focused) return null;
  return (
    <View style={[styles.notice, { backgroundColor: c.accentSoft }]}>
      <Text style={[styles.message, { color: c.accent }]}>{message}</Text>
      {!reduced && <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
        {Array.from({ length: 12 }, (_, i) => <Piece key={i} index={i} color={i % 2 ? c.accent : c.gold.to} />)}
      </View>}
    </View>
  );
}

function Piece({ index, color }: { index: number; color: string }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, { duration: 950, reduceMotion: ReduceMotion.System });
    return () => cancelAnimation(progress);
  }, [progress]);
  const animated = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ translateY: -25 + progress.value * 80 }, { rotate: `${progress.value * (index % 2 ? 180 : -180)}deg` }],
  }));
  return <Animated.View style={[styles.piece, { left: `${5 + index * 8}%`, backgroundColor: color }, animated]} />;
}

const styles = StyleSheet.create({
  notice: { borderRadius: radii.md, padding: spacing.base, marginVertical: spacing.sm, overflow: 'hidden' },
  message: { fontFamily: type.weight.semibold, fontSize: type.size.sm, lineHeight: 20 },
  piece: { position: 'absolute', top: 0, width: 5, height: 8, borderRadius: 2 },
});
