import { useRouter } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { usePlan, useStartStarterProgram } from '@/src/features/plan/data';
import { Button } from '@/src/features/workouts/ui/Chrome';
import { useToast } from '@/src/features/workouts/ui/Toast';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

/** "Recommended for you": the starter program, for users with no active program. */
export function StarterCard() {
  const c = useThemeColors();
  const router = useRouter();
  const toast = useToast();
  const plan = usePlan().data;
  const { start, busy } = useStartStarterProgram();
  const program = plan?.starter_program;
  if (!program?.days?.length) return null;

  const onStart = async () => {
    try {
      await start();
      toast('Your starter program is on — today’s workout is up top', 'success');
    } catch {
      toast('Couldn’t start the program. Check your connection and try again.', 'error');
    }
  };

  return (
    <View testID="train-starter" style={[styles.card, { backgroundColor: c.card, borderColor: c.primary }]}>
      <View style={styles.row}>
        <Sparkles size={16} color={c.accent} />
        <Text style={[styles.eyebrow, { color: c.accent }]}>RECOMMENDED FOR YOU</Text>
      </View>
      <Text style={[styles.title, { color: c.text }]}>{program.title}</Text>
      <Text style={[styles.body, { color: c.mutedText }]}>{program.description}</Text>
      <View style={styles.actions}>
        <Button testID="train-starter-start" title="Start this program" loading={busy} onPress={onStart} style={styles.flex} />
        <Button testID="train-starter-details" variant="secondary" title="Details" onPress={() => router.push('/plan')} style={styles.flex} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, borderWidth: 1.5, padding: spacing.base, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  eyebrow: { fontFamily: type.weight.semibold, fontSize: type.size.xs, letterSpacing: type.tracking.eyebrow },
  title: { fontFamily: type.weight.extrabold, fontSize: 19 },
  body: { fontFamily: type.weight.regular, fontSize: 15, lineHeight: 22 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  flex: { flexGrow: 1, flexBasis: 140 },
});
