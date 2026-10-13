import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePrograms } from '@/src/features/workouts/hooks';
import { ProgramCard } from '@/src/features/workouts/programs/ProgramCard';
import { TopBar } from '@/src/features/workouts/ui/Chrome';
import { useRetentionMetrics } from '@/src/hooks/useRetentionMetrics';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useAuth } from '@/src/providers/AuthProvider';
import { spacing, type } from '@/src/styles/tokens';

/** Ready-made weekly plans. Optional — nobody needs one to train. */
export function ProgramsScreen() {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const metrics = useRetentionMetrics(user?.id);
  const programs = usePrograms();
  const list = programs.data ?? [];

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing['2xl'] }]}
      stickyHeaderIndices={[0]}>
      <TopBar title="Programs" subtitle="A plan for every day of the week" />
      <Text style={[styles.intro, { color: c.mutedText }]}>
        Pick one and FitNyx shows you what to do each day. You can still do your own routines any time.
      </Text>
      {programs.loading ? <ActivityIndicator color={c.primary} style={styles.spinner} /> : null}
      {!programs.loading && !list.length ? (
        <Text style={[styles.intro, { color: c.mutedText }]}>{programs.failed ? 'Couldn’t load programs. Check your connection.' : 'No programs yet.'}</Text>
      ) : null}
      <View style={styles.cards}>
        {list.map((p) => <ProgramCard key={p.id} program={p} active={metrics.activePlan?.title === p.title} />)}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  intro: { fontFamily: type.weight.regular, fontSize: 16, lineHeight: 23, paddingHorizontal: spacing.base },
  spinner: { marginTop: spacing.xl },
  cards: { paddingHorizontal: spacing.base, gap: spacing.md },
});
