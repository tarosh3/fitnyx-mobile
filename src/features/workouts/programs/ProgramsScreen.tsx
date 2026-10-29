import { ArrowRight } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ContentSkeleton } from '@/src/components/ui/ContentSkeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePrograms } from '@/src/features/workouts/hooks';
import { ProgramCard } from '@/src/features/workouts/programs/ProgramCard';
import { TopBar } from '@/src/features/workouts/ui/Chrome';
import { useRetentionMetrics } from '@/src/hooks/useRetentionMetrics';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useAuth } from '@/src/providers/AuthProvider';
import { radii, spacing, type } from '@/src/styles/tokens';

/** Ready-made weekly plans. Optional — nobody needs one to train. */
export function ProgramsScreen() {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const metrics = useRetentionMetrics(user?.id);
  const programs = usePrograms();
  const list = programs.data ?? [];
  const [retrying, setRetrying] = useState(false);

  const retry = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      await programs.refresh();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        testID="programs-screen"
        style={{ backgroundColor: c.background }}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing['2xl'] }}
        stickyHeaderIndices={[0]}
        showsVerticalScrollIndicator={false}
      >
        <TopBar title="Programs" />
        <View style={styles.content}>
          <View style={styles.intro}>
            <Text style={[styles.eyebrow, { color: c.accent }]}>FIND YOUR RHYTHM</Text>
            <Text style={[styles.heading, { color: c.text }]} accessibilityRole="header">Train with{'\n'}intention.</Text>
            <Text style={[styles.description, { color: c.mutedText }]}>
              Choose your goal and a rhythm that fits. Each program lays out what to train, day by day.
            </Text>
          </View>

          {programs.loading ? (
            <ContentSkeleton variant="list" label="Loading programs" />
          ) : null}

          {!programs.loading && !list.length ? (
            <View style={[styles.empty, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.emptyTitle, { color: c.text }]}>{programs.failed ? 'Programs couldn’t load.' : 'New programs are on the way.'}</Text>
              <Text style={[styles.statusText, { color: c.mutedText }]}>
                {programs.failed ? 'Check your connection and try again.' : 'You can keep training with your own routines.'}
              </Text>
              {programs.failed ? (
                <Pressable
                  onPress={retry}
                  disabled={retrying}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: retrying, busy: retrying }}
                  style={({ pressed }) => [styles.retry, { backgroundColor: c.primary }, pressed && { opacity: 0.8 }]}
                >
                  {retrying ? <ActivityIndicator color={c.primaryText} /> : <>
                    <Text style={[styles.retryText, { color: c.primaryText }]}>Try again</Text>
                    <ArrowRight size={18} color={c.primaryText} />
                  </>}
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {list.length > 0 ? (
            <View style={styles.collection}>
              <View style={styles.collectionHeader}>
                <Text style={[styles.collectionTitle, { color: c.text }]} accessibilityRole="header">Find your program</Text>
                <Text style={[styles.count, { color: c.mutedText }]}>{list.length} {list.length === 1 ? 'plan' : 'plans'}</Text>
              </View>
              {programs.failed ? <Text style={[styles.statusText, { color: c.mutedText }]}>Showing your saved programs.</Text> : null}
              {list.map((p) => <ProgramCard key={p.id} program={p} active={metrics.activePlan?.title === p.title} />)}
            </View>
          ) : null}
        </View>
      </ScrollView>
      <View pointerEvents="none" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: insets.bottom, backgroundColor: c.background }} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: spacing.lg, gap: spacing['2xl'] },
  intro: { paddingTop: spacing.xl, gap: spacing.md },
  eyebrow: { fontFamily: type.weight.bold, fontSize: type.size.micro, lineHeight: 16, letterSpacing: 1.8 },
  heading: { fontFamily: type.weight.extrabold, fontSize: 38, lineHeight: 43, letterSpacing: -1.2 },
  description: { fontFamily: type.weight.regular, fontSize: 15, lineHeight: 23, maxWidth: 440 },
  loading: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  statusText: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 21 },
  empty: { padding: spacing.xl, borderRadius: radii['2xl'], borderWidth: StyleSheet.hairlineWidth, gap: spacing.sm },
  emptyTitle: { fontFamily: type.weight.semibold, fontSize: 19, lineHeight: 26 },
  retry: { minHeight: 48, paddingHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  retryText: { fontFamily: type.weight.semibold, fontSize: 15, lineHeight: 21 },
  collection: { gap: spacing.lg },
  collectionHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  collectionTitle: { fontFamily: type.weight.semibold, fontSize: 18, lineHeight: 26 },
  count: { fontFamily: type.weight.medium, fontSize: 12, lineHeight: 18 },
});
