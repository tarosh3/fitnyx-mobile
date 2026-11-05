import { Check, Pause, Play } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type DraftSet, fmtClock, fmtKg, fmtKm, fmtMetres } from '@/src/features/workouts/model';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { TrackingType } from '@/src/types/exercise';
import { radii, spacing, type } from '@/src/styles/tokens';

export function columnsFor(t: TrackingType): [string, string] {
  if (t === 'cardio') return ['Time', 'Distance'];
  if (t === 'duration') return ['Weight', 'Hold'];
  if (t === 'reps') return ['Weight', 'Reps'];
  if (t === 'assisted_reps') return ['Assist', 'Reps'];
  if (t === 'weight_distance') return ['kg', 'Distance'];
  return ['kg', 'Reps'];
}

export function lastText(t: TrackingType, last: Partial<DraftSet> | null): string {
  if (!last) return '—';
  if (t === 'cardio') return last.durationSec ? `${Math.round(last.durationSec / 60)} min` : '—';
  if (t === 'duration') return last.durationSec ? `${fmtClock(last.durationSec)}${last.weightKg ? ` +${fmtKg(last.weightKg)}` : ''}` : '—';
  if (t === 'reps') return last.reps ? `× ${last.reps}` : '—';
  if (t === 'assisted_reps') return last.reps ? `${fmtKg(last.assistKg ?? 0)} help×${last.reps}` : '—';
  if (t === 'weight_distance') return last.weightKg ? `${fmtKg(last.weightKg)}·${fmtMetres(last.distanceM ?? 0)}` : '—';
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
  /** Timer running on this row: seconds left on a hold, seconds so far on cardio. */
  runningLeft?: number | null;
  onEdit: () => void;
  onCheck: () => void;
  onTimer?: () => void;
  pop?: boolean;
}

/**
 * Rows with a timer button drop the Last column to make room: that value is in the
 * exercise's header line anyway ("Last 0:45 +10").
 */
export const hasTimer = (t: TrackingType) => t === 'duration' || t === 'cardio';

/** One set: Set · Last · value(s) · ✓ — tap a value for big steppers, ✓ to log. */
export function SetRow({ index, t, value, done, pr, last, name, runningLeft, onEdit, onCheck, onTimer }: Props) {
  const c = useThemeColors();
  const valBg = done ? (pr ? c.parts.shoulders.bg : c.accentSoft) : c.surface;
  const label = `${name} set ${index + 1}`;
  const cell = (main: string, sub: string | null, a11y: string) => (
    <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={`${label}, ${a11y}. Change`}
      style={({ pressed }) => [styles.val, { backgroundColor: valBg, borderColor: done ? 'transparent' : c.border }, pressed && styles.pressed]}>
      <Text style={[styles.valText, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>{main}</Text>
      {sub ? <Text style={[styles.sub, { color: c.mutedText }]}>{sub}</Text> : null}
    </Pressable>
  );

  const running = runningLeft != null;
  const timer = !done && onTimer ? (
    <Pressable onPress={onTimer} accessibilityRole="button" accessibilityLabel={running ? 'Stop timer' : t === 'cardio' ? 'Start timer' : `Start ${fmtClock(value.durationSec)} timer`}
      style={({ pressed }) => [styles.timer, { borderColor: running ? c.accent : c.border, backgroundColor: c.card }, pressed && styles.pressed]}>
      {running ? <Pause size={20} color={c.text} fill={c.text} /> : <Play size={20} color={c.text} fill={c.text} />}
    </Pressable>
  ) : null;

  let cells: React.ReactNode;
  if (t === 'cardio') {
    const whole = value.durationSec % 60 === 0;
    const time = running ? fmtClock(runningLeft) : whole ? String(value.durationSec / 60) : fmtClock(value.durationSec);
    cells = <>{cell(time, running ? 'running…' : whole ? 'min' : 'min:sec', `${Math.round(value.durationSec / 60)} minutes`)}{cell(value.distanceM ? fmtKm(value.distanceM) : '–', 'km', `${fmtKm(value.distanceM)} kilometres`)}{timer}</>;
  } else if (t === 'duration') {
    cells = <>
      {cell(value.weightKg > 0 ? `+${fmtKg(value.weightKg)}` : 'Body', value.weightKg > 0 ? 'kg' : 'weight', value.weightKg > 0 ? `plus ${value.weightKg} kilograms` : 'bodyweight')}
      {cell(fmtClock(running ? runningLeft : value.durationSec), running ? 'holding…' : 'min:sec', `hold ${value.durationSec} seconds`)}
      {timer}
    </>;
  } else if (t === 'assisted_reps') {
    cells = <>{cell(value.assistKg > 0 ? fmtKg(value.assistKg) : 'None', value.assistKg > 0 ? 'kg help' : 'no help', value.assistKg > 0 ? `${value.assistKg} kilograms of assistance` : 'no assistance')}{cell(String(value.reps), null, `${value.reps} reps`)}</>;
  } else if (t === 'weight_distance') {
    cells = <>{cell(fmtKg(value.weightKg), null, `${value.weightKg} kilograms`)}{cell(String(Math.round(value.distanceM)), 'm', `${Math.round(value.distanceM)} metres`)}</>;
  } else if (t === 'reps') {
    cells = <>{cell(value.weightKg > 0 ? `+${fmtKg(value.weightKg)}` : 'Body', value.weightKg > 0 ? 'kg' : 'weight', value.weightKg > 0 ? `plus ${value.weightKg} kilograms` : 'bodyweight')}{cell(String(value.reps), null, `${value.reps} reps`)}</>;
  } else {
    cells = <>{cell(fmtKg(value.weightKg), null, `${value.weightKg} kilograms`)}{cell(String(value.reps), null, `${value.reps} reps`)}</>;
  }

  return (
    <View style={styles.row}>
      <Text style={[styles.n, { color: c.mutedText }]}>{index + 1}</Text>
      {hasTimer(t) ? null : <Text style={[styles.last, { color: c.mutedText }]} numberOfLines={2}>{last}</Text>}
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
  const label = (s: string) => <Text numberOfLines={1} maxFontSizeMultiplier={1.15} style={[styles.head, styles.flex, { color: c.mutedText }]}>{s}</Text>;
  return (
    <View style={styles.row} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Text numberOfLines={1} maxFontSizeMultiplier={1.15} style={[styles.head, styles.n, { color: c.mutedText }]}>Set</Text>
      {hasTimer(t) ? null : <Text numberOfLines={1} maxFontSizeMultiplier={1.15} style={[styles.head, styles.last, { color: c.mutedText }]}>Last</Text>}
      {label(a)}{label(b)}
      {hasTimer(t) ? <View style={styles.timerSpace} /> : null}
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
  valText: { fontFamily: type.weight.extrabold, fontSize: 19, fontVariant: ['tabular-nums'] },
  sub: { fontFamily: type.weight.semibold, fontSize: 11, marginTop: -2 },
  timer: { width: 52, minHeight: 52, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  check: { width: 52, height: 52, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  timerSpace: { width: 52 },
  checkSpace: { width: 52 },
  pressed: { transform: [{ scale: 0.95 }] },
});
