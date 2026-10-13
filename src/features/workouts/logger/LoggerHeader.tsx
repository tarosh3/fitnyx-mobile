import { ChevronLeft, Pause, Play } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fmtClock, plural } from '@/src/features/workouts/model';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

export type TimerState = 'ready' | 'running' | 'paused';

interface Props {
  title: string;
  elapsedSec: number;
  state: TimerState;
  segments: ('done' | 'current' | 'todo')[];
  setsDone: number;
  setsTotal: number;
  onBack: () => void;
  onStart: () => void;
  onPause: () => void;
  onFinish: () => void;
  onJump: (index: number) => void;
}

export function LoggerHeader({ title, elapsedSec, state, segments, setsDone, setsTotal, onBack, onStart, onPause, onFinish, onJump }: Props) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const done = segments.filter((s) => s === 'done').length;
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.sm, backgroundColor: c.background, borderColor: c.border }]}>
      <View style={styles.row}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Leave this screen. Your workout stays open." hitSlop={6}
          style={({ pressed }) => [styles.round, { backgroundColor: c.card, borderColor: c.border }, pressed && { opacity: 0.7 }]}>
          <ChevronLeft size={24} color={c.text} />
        </Pressable>
        <View style={styles.grow} accessible accessibilityLabel={`${title}. ${state === 'ready' ? 'Timer not started' : `${fmtClock(elapsedSec)}${state === 'paused' ? ', paused' : ''}`}`}>
          <Text style={[styles.eyebrow, { color: c.mutedText }]} numberOfLines={1}>{title}</Text>
          <Text style={[styles.clock, { color: state === 'running' ? c.text : c.mutedText }]}>{fmtClock(elapsedSec)}</Text>
          <Text style={[styles.state, { color: state === 'paused' ? c.warning : c.mutedText }]}>
            {state === 'ready' ? 'Not started yet' : state === 'paused' ? 'Paused' : 'Timer running'}
          </Text>
        </View>
        {state === 'ready' ? (
          <Pressable testID="timer-start" onPress={onStart} accessibilityRole="button" accessibilityLabel="Start the workout timer"
            style={({ pressed }) => [styles.pill, { backgroundColor: c.card, borderColor: c.border }, pressed && { opacity: 0.7 }]}>
            <Play size={18} color={c.text} fill={c.text} /><Text style={[styles.pillText, { color: c.text }]}>Start</Text>
          </Pressable>
        ) : (
          <Pressable testID="timer-toggle" onPress={state === 'running' ? onPause : onStart} accessibilityRole="button"
            accessibilityLabel={state === 'running' ? 'Pause timer' : 'Resume timer'}
            style={({ pressed }) => [styles.round, state === 'paused' ? { backgroundColor: c.primary, borderColor: c.primary } : { backgroundColor: c.card, borderColor: c.border }, pressed && { opacity: 0.7 }]}>
            {state === 'running' ? <Pause size={20} color={c.text} fill={c.text} /> : <Play size={20} color={c.primaryText} fill={c.primaryText} />}
          </Pressable>
        )}
        <Pressable testID="finish" onPress={onFinish} accessibilityRole="button" accessibilityLabel="Finish workout"
          style={({ pressed }) => [styles.finish, { backgroundColor: c.primary }, pressed && { transform: [{ scale: 0.96 }] }]}>
          <Text style={[styles.finishText, { color: c.primaryText }]}>Finish</Text>
        </Pressable>
      </View>
      {segments.length ? (
        <>
          <View style={styles.segments} accessibilityLabel={`${done} of ${plural(segments.length, 'exercise')} done. Tap one to jump to it.`}>
            {segments.map((s, i) => (
              <Pressable key={i} onPress={() => onJump(i)} accessibilityRole="button" accessibilityLabel={`Go to exercise ${i + 1}${s === 'done' ? ', done' : ''}`} style={styles.segHit}>
                <View style={[styles.seg, { backgroundColor: s === 'done' ? c.primary : s === 'current' ? c.accent : c.border }, s === 'current' && { opacity: 0.55 }]} />
              </Pressable>
            ))}
          </View>
          <Text style={[styles.sets, { color: c.mutedText }]}>{done} of {plural(segments.length, 'exercise')} · {setsDone} of {setsTotal} sets</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.base, paddingBottom: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
  round: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  grow: { flex: 1, minWidth: 0 },
  eyebrow: { fontFamily: type.weight.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  clock: { fontFamily: type.weight.extrabold, fontSize: 30, letterSpacing: -0.8, fontVariant: ['tabular-nums'], lineHeight: 34 },
  state: { fontFamily: type.weight.medium, fontSize: 13 },
  pill: { minHeight: 48, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pillText: { fontFamily: type.weight.bold, fontSize: 15 },
  finish: { minHeight: 48, borderRadius: radii.md, paddingHorizontal: spacing.base, alignItems: 'center', justifyContent: 'center' },
  finishText: { fontFamily: type.weight.bold, fontSize: 16 },
  segments: { flexDirection: 'row', gap: 4, marginTop: 2 },
  segHit: { flex: 1, height: 24, justifyContent: 'center' },
  seg: { height: 6, borderRadius: 3 },
  sets: { fontFamily: type.weight.regular, fontSize: 13, fontVariant: ['tabular-nums'] },
});
