import { Check, Pause, Play } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type DraftSet, fmtClock, fmtKg, fmtKm } from '@/src/features/workouts/model';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { TrackingType } from '@/src/types/exercise';
import { radii, spacing, type } from '@/src/styles/tokens';

export function columnsFor(t: TrackingType): [string, string] {
  if (t === 'cardio') return ['Time', 'Distance'];
  if (t === 'duration') return ['Hold', ''];
  if (t === 'reps') return ['Weight', 'Reps'];
  return ['kg', 'Reps'];
}

export function lastText(t: TrackingType, last: Partial<DraftSet> | null): string {
  if (!last) return '—';
  if (t === 'cardio') return last.durationSec ? `${Math.round(last.durationSec / 60)} min` : '—';
  if (t === 'duration') return last.durationSec ? fmtClock(last.durationSec) : '—';
  if (t === 'reps') return last.reps ? `× ${last.reps}` : '—';
  return last.weightKg ? `${fmtKg(last.weightKg)}×${last.reps ?? ''}` : '—';
}

interface Props {
  index: number;
  t: TrackingType;
  value: DraftSet;
  done: boolean;
  pr?: boolean;
  last: string;
  name: string;
  /** Hold timer counting down on this row: seconds left. */
  runningLeft?: number | null;
  onEdit: () => void;
  onCheck: () => void;
  onTimer?: () => void;
  pop?: boolean;
}

/** One set: Set · Last · value(s) · ✓ — tap a value for big steppers, ✓ to log. */
export function SetRow({ index, t, value, done, pr, last, name, runningLeft, onEdit, onCheck, onTimer }: Props) {
  const c = useThemeColors();
  const valBg = done ? (pr ? c.parts.shoulders.bg : c.accentSoft) : c.surface;
  const label = `${name} set ${index + 1}`;
  const cell = (main: string, sub: string | null, a11y: string, wide = false) => (
    <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={`${label}, ${a11y}. Change`}
      style={({ pressed }) => [styles.val, wide && styles.wide, { backgroundColor: valBg, borderColor: done ? 'transparent' : c.border }, pressed && styles.pressed]}>
      <Text style={[styles.valText, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>{main}</Text>
      {sub ? <Text style={[styles.sub, { color: c.mutedText }]}>{sub}</Text> : null}
    </Pressable>
  );

  let cells: React.ReactNode;
  if (t === 'cardio') {
    cells = <>{cell(`${Math.round(value.durationSec / 60)}`, 'min', `${Math.round(value.durationSec / 60)} minutes`)}{cell(value.distanceM ? fmtKm(value.distanceM) : '–', 'km', `${fmtKm(value.distanceM)} kilometres`)}</>;
  } else if (t === 'duration') {
    const running = runningLeft != null;
    cells = (
      <View style={[styles.wide, styles.inline]}>
        {cell(fmtClock(running ? runningLeft : value.durationSec), running ? 'holding…' : 'min:sec', `hold ${value.durationSec} seconds`, true)}
        {!done && onTimer ? (
          <Pressable onPress={onTimer} accessibilityRole="button" accessibilityLabel={running ? 'Stop timer' : `Start ${fmtClock(value.durationSec)} timer`}
            style={({ pressed }) => [styles.timer, { borderColor: c.border, backgroundColor: c.card }, pressed && styles.pressed]}>
            {running ? <Pause size={20} color={c.text} fill={c.text} /> : <Play size={20} color={c.text} fill={c.text} />}
          </Pressable>
        ) : null}
      </View>
    );
  } else if (t === 'reps') {
    cells = <>{cell(value.weightKg > 0 ? `+${fmtKg(value.weightKg)}` : 'Body', value.weightKg > 0 ? 'kg' : 'weight', value.weightKg > 0 ? `plus ${value.weightKg} kilograms` : 'bodyweight')}{cell(String(value.reps), null, `${value.reps} reps`)}</>;
  } else {
    cells = <>{cell(fmtKg(value.weightKg), null, `${value.weightKg} kilograms`)}{cell(String(value.reps), null, `${value.reps} reps`)}</>;
  }

  return (
    <View style={styles.row}>
      <Text style={[styles.n, { color: c.mutedText }]}>{index + 1}</Text>
      <Text style={[styles.last, { color: c.mutedText }]} numberOfLines={2}>{last}</Text>
      {cells}
      <Pressable testID={`check-${index}`} onPress={onCheck} accessibilityRole="button" accessibilityState={{ checked: done }}
        accessibilityLabel={done ? `${label} done. Change or delete` : `Log ${label}`}
        style={({ pressed }) => [styles.check, done ? { backgroundColor: c.primary, borderColor: c.primary } : { borderColor: c.border, backgroundColor: c.card }, pressed && styles.pressed]}>
        <Check size={24} color={done ? c.primaryText : c.mutedText} strokeWidth={3} />
      </Pressable>
    </View>
  );
}

export function SetHeader({ t }: { t: TrackingType }) {
  const c = useThemeColors();
  const [a, b] = columnsFor(t);
  // Column labels are short captions: cap their scaling so "SET" never wraps at large text sizes.
  const label = (s: string, wide = false) => <Text numberOfLines={1} maxFontSizeMultiplier={1.15} style={[styles.head, wide ? styles.wide : styles.flex, { color: c.mutedText }]}>{s}</Text>;
  return (
    <View style={styles.row} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Text numberOfLines={1} maxFontSizeMultiplier={1.15} style={[styles.head, styles.n, { color: c.mutedText }]}>Set</Text>
      <Text numberOfLines={1} maxFontSizeMultiplier={1.15} style={[styles.head, styles.last, { color: c.mutedText }]}>Last</Text>
      {t === 'duration' ? label(a, true) : <>{label(a)}{label(b)}</>}
      <View style={styles.checkSpace} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  n: { width: 40, textAlign: 'center', fontFamily: type.weight.bold, fontSize: 15 },
  last: { width: 54, textAlign: 'center', fontFamily: type.weight.medium, fontSize: 12, fontVariant: ['tabular-nums'] },
  head: { fontFamily: type.weight.bold, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', textAlign: 'center' },
  flex: { flex: 1 },
  val: { flex: 1, minHeight: 52, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  wide: { flex: 2 },
  inline: { flexDirection: 'row', gap: 6 },
  valText: { fontFamily: type.weight.extrabold, fontSize: 19, fontVariant: ['tabular-nums'] },
  sub: { fontFamily: type.weight.semibold, fontSize: 11, marginTop: -2 },
  timer: { width: 52, minHeight: 52, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  check: { width: 52, height: 52, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkSpace: { width: 52 },
  pressed: { transform: [{ scale: 0.95 }] },
});
