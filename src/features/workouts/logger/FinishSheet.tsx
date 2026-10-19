import { AlertTriangle, Check } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { plural } from '@/src/features/workouts/model';
import { Button } from '@/src/features/workouts/ui/Chrome';
import { Sheet } from '@/src/features/workouts/ui/Sheet';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

interface Props {
  visible: boolean;
  setsDone: number;
  setsLeft: number;
  /** Routine this workout came from, when it has one. */
  routineTitle: string | null;
  /** Exercises done today that aren't in that routine yet. */
  extras: string[];
  busy: boolean;
  onFinish: (opts: { addExtras: boolean }) => void;
  onDiscard: () => void;
  onClose: () => void;
}

export function FinishSheet({ visible, setsDone, setsLeft, routineTitle, extras, busy, onFinish, onDiscard, onClose }: Props) {
  const c = useThemeColors();
  const [addExtras, setAddExtras] = useState(true);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  useEffect(() => { if (visible) { setAddExtras(true); setConfirmDiscard(false); } }, [visible]);
  const offerUpdate = !!routineTitle && extras.length > 0;

  if (setsDone === 0) {
    return (
      <Sheet visible={visible} title="Nothing logged yet" subtitle="Tick ✓ on a set to log it." onClose={onClose} testID="finish-sheet"
        footer={<>
          <Button title="Keep going" onPress={onClose} />
          <Button testID="discard" variant="danger" title="Discard workout" loading={busy} onPress={onDiscard} />
        </>}>
        <Text style={[styles.body, { color: c.mutedText }]}>Discarding closes this workout. It won’t show in your history.</Text>
      </Sheet>
    );
  }

  // Logged sets are thrown away too, so ask once more.
  if (confirmDiscard) {
    return (
      <Sheet visible={visible} title="Discard this workout?" subtitle={`${plural(setsDone, 'set')} logged`} onClose={onClose} testID="finish-sheet"
        footer={<>
          <Button testID="discard-confirm" variant="danger" title="Discard workout" loading={busy} onPress={onDiscard} />
          <Button variant="secondary" title="Keep it" onPress={() => setConfirmDiscard(false)} />
        </>}>
        <Text style={[styles.body, { color: c.mutedText }]}>Every set you logged is deleted. It won’t show in your history or count toward records. This can’t be undone.</Text>
      </Sheet>
    );
  }

  return (
    <Sheet visible={visible} title="Finish workout?" subtitle={`${plural(setsDone, 'set')} logged`} onClose={onClose} testID="finish-sheet"
      footer={<>
        <Button testID="finish-confirm" title="Finish workout" loading={busy} onPress={() => onFinish({ addExtras: offerUpdate && addExtras })} />
        <Button variant="secondary" title="Keep going" onPress={onClose} />
        <Button testID="discard" variant="quiet" title="Discard workout" onPress={() => setConfirmDiscard(true)} />
      </>}>
      <View style={styles.body}>
        {setsLeft > 0 ? (
          <View style={[styles.note, { backgroundColor: c.surface, borderColor: c.border }]}>
            <AlertTriangle size={20} color={c.warning} />
            <Text style={[styles.noteText, { color: c.text }]}>{plural(setsLeft, 'set')} not done. Only ticked sets are saved.</Text>
          </View>
        ) : null}
        {offerUpdate ? (
          <Pressable onPress={() => setAddExtras((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: addExtras }}
            accessibilityLabel={`Add ${extras.join(', ')} to your ${routineTitle} routine`}
            style={({ pressed }) => [styles.note, { backgroundColor: addExtras ? c.accentSoft : c.surface, borderColor: addExtras ? c.primary : c.border }, pressed && { opacity: 0.8 }]}>
            <View style={[styles.box, addExtras ? { backgroundColor: c.primary, borderColor: c.primary } : { borderColor: c.mutedText }]}>
              {addExtras ? <Check size={16} color={c.primaryText} strokeWidth={3} /> : null}
            </View>
            <View style={styles.grow}>
              <Text style={[styles.noteTitle, { color: c.text }]}>Add to your {routineTitle} routine</Text>
              <Text style={[styles.noteText, { color: c.mutedText }]} numberOfLines={3}>{extras.join(', ')} — so it’s there next time.</Text>
            </View>
          </Pressable>
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.md, fontFamily: type.weight.regular, fontSize: 16 },
  note: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1.5 },
  grow: { flex: 1, minWidth: 0 },
  noteTitle: { fontFamily: type.weight.bold, fontSize: 16 },
  noteText: { flex: 1, fontFamily: type.weight.regular, fontSize: 15 },
  box: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
