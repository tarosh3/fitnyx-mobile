import { Check, ChevronDown, MoreHorizontal, Plus } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, type GestureType } from 'react-native-gesture-handler';

import { type Block, blockDone, pendingRows } from '@/src/features/workouts/logger/rows';
import { lastText, SetHeader, SetRow } from '@/src/features/workouts/logger/SetRow';
import { describeTarget, fmtKg, logToDraft, plural, trackingOf } from '@/src/features/workouts/model';
import { ExerciseThumb } from '@/src/features/workouts/ui/ExerciseThumb';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

export interface HoldTimer {
  bi: number;
  pi: number;
  left: number;
}

interface Props {
  block: Block;
  bi: number;
  expanded: boolean;
  hold: HoldTimer | null;
  onToggle: () => void;
  onOpenExercise: () => void;
  onMenu: () => void;
  onEditPending: (pi: number) => void;
  onCheckPending: (pi: number) => void;
  onEditLog: (logId: string) => void;
  onHoldTimer: (pi: number) => void;
  onAddSet: () => void;
  /** Hold-and-drag on the header to reorder (from `DragItem`). */
  dragGesture?: GestureType;
}

/** One exercise in the live workout: collapsed to a line, or its set rows. */
export function ExerciseBlock({ block: b, bi, expanded, hold, onToggle, onOpenExercise, onMenu, onEditPending, onCheckPending, onEditLog, onHoldTimer, onAddSet, dragGesture }: Props) {
  const c = useThemeColors();
  const t = trackingOf(b.exercise);
  const name = b.exercise?.title ?? 'Exercise';
  const done = blockDone(b);
  const pending = pendingRows(b);
  const total = b.logs.length + pending.length;
  const meta = [
    b.bestKg && t === 'weight_reps' ? `Best ${fmtKg(b.bestKg)} kg` : null,
    b.last ? `Last ${lastText(t, b.last)}` : null,
  ].filter(Boolean).join(' · ');
  const summary = done ? `${plural(b.logs.length, 'set')} done` : b.planned ? describeTarget(t, b.planned) : `${b.logs.length} of ${plural(total, 'set')}`;

  const head = (
    <View style={styles.head}>
      <Pressable onPress={onOpenExercise} accessibilityRole="button" accessibilityLabel={`How to do ${name}`} hitSlop={4}>
        <ExerciseThumb exercise={b.exercise} size={56} />
        {done ? (
          <View style={[styles.doneBadge, { backgroundColor: c.primary, borderColor: c.card }]}>
            <Check size={14} color={c.primaryText} strokeWidth={3} />
          </View>
        ) : null}
      </Pressable>
      <Pressable onPress={onToggle} style={styles.titles} accessibilityRole="button" accessibilityState={{ expanded }}
        accessibilityLabel={`${name}. ${summary}. ${expanded ? 'Collapse' : 'Show sets'}`}>
        <Text style={[styles.name, { color: c.text }]} numberOfLines={2}>{name}</Text>
        <Text style={[styles.meta, { color: done ? c.accent : c.mutedText }]} numberOfLines={1}>{expanded && meta ? meta : summary}</Text>
      </Pressable>
      {expanded ? (
        <Pressable onPress={onMenu} accessibilityRole="button" accessibilityLabel={`More for ${name}: how to, swap, move, remove`}
          style={({ pressed }) => [styles.icon, { backgroundColor: c.surface }, pressed && { opacity: 0.7 }]}>
          <MoreHorizontal size={22} color={c.text} />
        </Pressable>
      ) : (
        <Pressable onPress={onToggle} accessibilityElementsHidden importantForAccessibility="no" style={styles.icon}>
          <ChevronDown size={22} color={c.mutedText} />
        </Pressable>
      )}
    </View>
  );

  return (
    <View testID={`block-${bi}`} style={[styles.card, { backgroundColor: c.card, borderColor: expanded ? c.accent : c.border }, expanded && styles.cardOpen]}>
      {dragGesture ? <GestureDetector gesture={dragGesture}>{head}</GestureDetector> : head}

      {expanded ? (
        <View style={styles.sets}>
          <SetHeader t={t} />
          {b.logs.map((l, i) => (
            <SetRow key={l.id} index={i} t={t} name={name} value={logToDraft(l)} done pr={!!l.is_pr} last={i === 0 ? lastText(t, b.last) : ''}
              onEdit={() => onEditLog(l.id)} onCheck={() => onEditLog(l.id)} />
          ))}
          {pending.map((row, pi) => (
            <SetRow key={`p${pi}`} index={b.logs.length + pi} t={t} name={name} value={row} done={false}
              last={b.logs.length + pi === 0 ? lastText(t, b.last) : ''}
              runningLeft={hold && hold.bi === bi && hold.pi === pi ? hold.left : null}
              onEdit={() => onEditPending(pi)} onCheck={() => onCheckPending(pi)}
              onTimer={t === 'duration' ? () => onHoldTimer(pi) : undefined} />
          ))}
          <Pressable testID={`add-set-${bi}`} onPress={onAddSet} accessibilityRole="button" accessibilityLabel={`Add a set to ${name}`}
            style={({ pressed }) => [styles.addSet, { borderColor: c.border }, pressed && { opacity: 0.7 }]}>
            <Plus size={18} color={c.text} />
            <Text style={[styles.addText, { color: c.text }]}>Add set</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, borderWidth: 1, padding: spacing.md, gap: spacing.md },
  cardOpen: { borderWidth: 2, padding: spacing.md - 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  doneBadge: { position: 'absolute', right: -6, bottom: -6, width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  titles: { flex: 1, minWidth: 0, minHeight: 48, justifyContent: 'center' },
  name: { fontFamily: type.weight.bold, fontSize: 17 },
  meta: { fontFamily: type.weight.medium, fontSize: 14, marginTop: 2 },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  sets: { gap: spacing.sm },
  addSet: { minHeight: 48, borderRadius: radii.md, borderWidth: 1, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  addText: { fontFamily: type.weight.semibold, fontSize: 15 },
});
