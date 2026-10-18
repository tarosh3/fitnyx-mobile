import { X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { fmtClock } from '@/src/features/workouts/model';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { haptic } from '@/src/lib/haptics';
import { radii, spacing, type } from '@/src/styles/tokens';

interface Props {
  seconds: number;
  endTimestamp?: number;
  onAdjust?: (end: number) => void;
  next: string | null;
  onDone: () => void;
}

/**
 * Rest countdown pinned above the nav bar after a set. Counts from an end
 * time (not by decrementing), so it stays right after the app was in the
 * background. Buzzes at 0, then closes itself.
 */
export function RestBar({ seconds, next, onDone, endTimestamp, onAdjust }: Props) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const endAt = useRef(endTimestamp ?? Date.now() + seconds * 1000);
  const [total, setTotal] = useState(seconds);
  const [left, setLeft] = useState(seconds);
  const buzzed = useRef(false);

  useEffect(() => {
    if (endTimestamp !== undefined) {
      endAt.current = endTimestamp;
      const remaining = Math.max(0, Math.ceil((endTimestamp - Date.now()) / 1000));
      setLeft(remaining);
      setTotal((value) => Math.max(value, remaining));
    }
  }, [endTimestamp]);

  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000))), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (left > 0) { buzzed.current = false; return; }
    if (!buzzed.current) { buzzed.current = true; haptic.success(); }
    const id = setTimeout(onDone, 1500);
    return () => clearTimeout(id);
  }, [left, onDone]);

  const adjust = (d: number) => {
    endAt.current = Math.max(Date.now() + 1000, endAt.current + d * 1000);
    onAdjust?.(endAt.current);
    const nextLeft = Math.ceil((endAt.current - Date.now()) / 1000);
    setLeft(nextLeft);
    setTotal((tot) => Math.max(tot, nextLeft));
  };

  const size = 52;
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const pct = total ? left / total : 0;
  const ctrl = (label: string, a11y: string, onPress: () => void) => (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y}
      style={({ pressed }) => [styles.ctrl, { borderColor: c.border, backgroundColor: c.surface }, pressed && { opacity: 0.7 }]}>
      <Text style={[styles.ctrlText, { color: c.text }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View testID="rest-bar" accessibilityLiveRegion="polite"
      style={[styles.wrap, { bottom: insets.bottom + spacing.md, backgroundColor: c.card, borderColor: left === 0 ? c.primary : c.border }]}>
      <View style={styles.row}>
        <View style={{ width: size, height: size }} accessible accessibilityLabel={left ? `Rest, ${fmtClock(left)} left` : 'Rest done'}>
          <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
            <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.border} strokeWidth={5} fill="none" />
            <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.primary} strokeWidth={5} fill="none" strokeLinecap="round"
              strokeDasharray={`${circ}`} strokeDashoffset={circ * (1 - pct)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
          </Svg>
          <View style={styles.center}><Text style={[styles.time, { color: c.text }]}>{left ? fmtClock(left) : '✓'}</Text></View>
        </View>
        <View style={styles.grow}>
          <Text style={[styles.label, { color: c.text }]}>{left ? 'Rest' : 'Rest done — go!'}</Text>
          {next ? <Text style={[styles.next, { color: c.mutedText }]} numberOfLines={2}>Next: {next}</Text> : null}
        </View>
        <Pressable onPress={onDone} accessibilityRole="button" accessibilityLabel="Skip rest" hitSlop={4}
          style={({ pressed }) => [styles.close, { backgroundColor: c.surface }, pressed && { opacity: 0.7 }]}>
          <X size={20} color={c.text} />
        </Pressable>
      </View>
      {left ? (
        <View style={styles.row}>
          {ctrl('−15s', 'Rest 15 seconds less', () => adjust(-15))}
          {ctrl('+15s', 'Rest 15 seconds more', () => adjust(15))}
          <Pressable onPress={onDone} accessibilityRole="button" accessibilityLabel="Skip rest"
            style={({ pressed }) => [styles.ctrl, styles.skip, { backgroundColor: c.primary }, pressed && { opacity: 0.8 }]}>
            <Text style={[styles.ctrlText, { color: c.primaryText }]}>Skip</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.base, right: spacing.base, borderRadius: radii.xl, borderWidth: 1.5, padding: spacing.md, gap: spacing.md, elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  time: { fontFamily: type.weight.extrabold, fontSize: 13, fontVariant: ['tabular-nums'] },
  grow: { flex: 1, minWidth: 0 },
  label: { fontFamily: type.weight.bold, fontSize: 17 },
  next: { fontFamily: type.weight.regular, fontSize: 14 },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  ctrl: { flex: 1, minHeight: 48, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  skip: { borderWidth: 0 },
  ctrlText: { fontFamily: type.weight.bold, fontSize: 16 },
});
