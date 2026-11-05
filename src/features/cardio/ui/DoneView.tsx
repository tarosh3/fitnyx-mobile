import { CheckCircle2, Pencil } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MIN_SAVE_SEC } from '@/src/features/cardio/finish';
import { fmtClock } from '@/src/features/workouts/model';
import { Button } from '@/src/features/workouts/ui/Chrome';
import { StepperSheet, stepFieldsFor } from '@/src/features/workouts/ui/StepperSheet';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

interface Props {
  title: string;
  line: string;
  activeSec: number;
  distanceM: number;
  /** Treadmill: worked out from the speeds, so it says "about". */
  estimated: boolean;
  /** "2nd time · 400 m further than your best", when there's something to say. */
  record: string | null;
  learned: string | null;
  owns: boolean;
  busy: boolean;
  error: string | null;
  onDistance: (metres: number) => void;
  onFinish: () => void;
  onContinue: () => void;
  onDiscard: () => void;
}

/** The end of a run: what was done, the distance to confirm, and where to go next. */
export function DoneView({ title, line, activeSec, distanceM, estimated, record, learned, owns, busy, error, onDistance, onFinish, onContinue, onDiscard }: Props) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState(false);
  const canSave = activeSec >= MIN_SAVE_SEC;
  const km = Math.round(distanceM / 10) / 100;

  return (
    <View testID="cardio-done" style={[styles.fill, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={[styles.body, { paddingTop: insets.top + spacing.xl, paddingBottom: spacing.lg }]}>
        <CheckCircle2 size={56} color={c.accent} />
        <Text style={[styles.title, { color: c.text }]} accessibilityRole="header">{title}</Text>
        <Text style={[styles.line, { color: c.mutedText }]}>{line}</Text>
        <View style={styles.stats}>
          <View style={[styles.stat, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.statLabel, { color: c.mutedText }]}>Time</Text>
            <Text style={[styles.statValue, { color: c.text }]}>{fmtClock(activeSec)}</Text>
          </View>
          <Pressable testID="cardio-distance" onPress={() => setEditing(true)} accessibilityRole="button" accessibilityLabel={`Distance ${km} kilometres. Change`}
            style={({ pressed }) => [styles.stat, { backgroundColor: c.card, borderColor: c.border }, pressed && { opacity: 0.7 }]}>
            <View style={styles.statHead}>
              <Text style={[styles.statLabel, { color: c.mutedText }]}>{estimated ? 'About' : 'Distance'}</Text>
              <Pencil size={13} color={c.mutedText} />
            </View>
            <Text style={[styles.statValue, { color: c.text }]}>{km > 0 ? `${km} km` : 'Add'}</Text>
          </Pressable>
        </View>
        <Text style={[styles.note, { color: c.mutedText }]}>
          {estimated ? 'Worked out from your speeds. Tap to match the treadmill’s screen.' : 'Tap Distance to copy it from the machine’s screen.'}
        </Text>
        {record ? <Text style={[styles.record, { color: c.accent }]}>{record}</Text> : null}
        {learned ? <Text style={[styles.note, { color: c.mutedText }]}>{learned}</Text> : null}
        {!canSave ? <Text style={[styles.note, { color: c.mutedText }]}>Too short to save. Give it at least 30 seconds next time.</Text> : null}
        {error ? <Text style={[styles.error, { color: c.destructive }]}>{error}</Text> : null}
      </ScrollView>
      <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.md }]}>
        {canSave ? (
          owns ? (
            <>
              <Button testID="cardio-finish" title="Finish workout" loading={busy} onPress={onFinish} style={styles.btn} />
              <Button testID="cardio-continue" variant="secondary" title="Add exercises to this workout" disabled={busy} onPress={onContinue} style={styles.btn} />
            </>
          ) : (
            <Button testID="cardio-continue" title="Back to my workout" loading={busy} onPress={onContinue} style={styles.btn} />
          )
        ) : null}
        <Button testID="cardio-discard" variant={canSave ? 'quiet' : 'secondary'} title={canSave ? 'Don’t save this run' : owns ? 'Close' : 'Back to my workout'} disabled={busy} onPress={onDiscard} style={styles.btn} />
      </View>
      <StepperSheet visible={editing} title="Distance" subtitle="What the machine’s screen says" fields={[stepFieldsFor.km(km)]} saveLabel="Save"
        onClose={() => setEditing(false)} onSave={(v) => { setEditing(false); onDistance(Math.round((v.km ?? 0) * 1000)); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { paddingHorizontal: spacing.lg, alignItems: 'center', gap: spacing.md },
  title: { fontFamily: type.weight.extrabold, fontSize: 28, textAlign: 'center' },
  line: { fontFamily: type.weight.regular, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  stats: { flexDirection: 'row', gap: spacing.md, alignSelf: 'stretch', marginTop: spacing.sm },
  stat: { flex: 1, borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, padding: spacing.base, gap: 4 },
  statHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statLabel: { fontFamily: type.weight.bold, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },
  statValue: { fontFamily: type.weight.extrabold, fontSize: 28, fontVariant: ['tabular-nums'] },
  note: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  record: { fontFamily: type.weight.bold, fontSize: 16, textAlign: 'center' },
  error: { fontFamily: type.weight.medium, fontSize: 14, textAlign: 'center' },
  actions: { paddingHorizontal: spacing.base, paddingTop: spacing.sm, gap: spacing.sm },
  btn: { flexGrow: 0 },
});
