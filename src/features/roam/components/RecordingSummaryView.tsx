import { Pencil } from 'lucide-react-native';
import React, { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { type } from '@/src/styles/tokens';

import { RoamCompletionHero } from './RoamCompletionHero';
import { Button } from '@/src/features/workouts/ui/Chrome';
import { MAX_ACTIVITY_NAME } from '@/src/features/roam/activityName';
import { ACTIVITY_LABEL } from '@/src/features/roam/components/ActivityTypeIcon';
import { RouteMap } from '@/src/features/roam/components/RouteMap';
import { SplitsList } from '@/src/features/roam/components/SplitsList';
import { RoamGoalsSummary } from '@/src/features/roam/components/RoamGoalsSummary';
import { RoamStatsPanel } from '@/src/features/roam/components/RoamStatsPanel';
import { VehicleBanner } from '@/src/features/roam/components/VehicleBanner';
import { formatDistance, type ActivityType, type RoamStats } from '@/src/features/roam/geo';
import { roamActivity, type GoalTracker } from '@/src/features/roam/goalTracker';
import { useThemeColors } from '@/src/hooks/useThemeColors';

interface Props {
  type: ActivityType;
  stats: RoamStats;
  elapsedSec: number;
  saving: boolean;
  error: string | null;
  /** Editable title, prefilled with the default ("Morning Stride"). */
  name: string;
  /** Shown when the field is cleared — what saving it blank will show. */
  defaultName: string;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onDiscard: () => void;
  /** Hidden accuracy-testing tool: long-press the heading to share the raw GPS track. */
  onExportRaw?: () => void;
  /** Today's goals + body weight, from when the Roam started; null = none. */
  tracker?: GoalTracker | null;
  artworkSeed?: string;
}

/** After Finish: review the Roam, then save or discard. Numbers are final once the server recomputes them. */
export function RecordingSummaryView({
  type,
  stats,
  elapsedSec,
  saving,
  error,
  name,
  defaultName,
  onNameChange,
  onSave,
  onDiscard,
  onExportRaw,
  tracker,
  artworkSeed,
}: Props) {
  const palette = useThemeColors();
  const roam = roamActivity(type, stats, tracker?.weightKg ?? null);
  const nameInput = useRef<TextInput>(null);
  return (
    <View style={styles.wrap}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <RoamCompletionHero eyebrow={`${ACTIVITY_LABEL[type]} complete`} onLongPress={onExportRaw} seed={artworkSeed}
          distanceM={stats.distanceM} movingSec={stats.movingTimeSec} avgSpeedMps={stats.avgSpeedMps}
          title={
          <View style={[styles.nameRow, { borderBottomColor: palette.border }]}>
            <TextInput
              ref={nameInput}
              testID="roam-name"
              accessibilityLabel="Roam name"
              value={name}
              onChangeText={onNameChange}
              placeholder={defaultName}
              placeholderTextColor={palette.mutedText}
              maxLength={MAX_ACTIVITY_NAME}
              editable={!saving}
              returnKeyType="done"
              selectTextOnFocus
              selectionColor={palette.primary}
              style={[styles.name, { color: palette.text }]}
            />
            <Pressable onPress={() => nameInput.current?.focus()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Rename this Roam" disabled={saving}>
              <Pencil size={18} color={palette.accent} />
            </Pressable>
          </View>
          }
        />
        <View style={styles.routeCard}>
          <Text style={[styles.sectionTitle, styles.routeTitle, { color: palette.text }]}>Your route</Text>
          <RouteMap inScroll route={stats.route} vehicleRanges={stats.vehicleRanges} style={styles.map} />
        </View>

        {stats.vehicleDetected ? (
          <VehicleBanner
            message={
              stats.xpEligible
                ? `${formatDistance(stats.vehicleDistanceM)} looked like vehicle travel and won't count.`
                : `Most of this Roam (${formatDistance(stats.vehicleDistanceM)}) looked like vehicle travel, so it won't earn XP.`
            }
          />
        ) : null}

        <Text style={[styles.sectionTitle, { color: palette.text }]}>The details</Text>
        <RoamStatsPanel
          movingSec={stats.movingTimeSec}
          elapsedSec={elapsedSec}
          maxSpeedMps={stats.maxSpeedMps}
          vehicleDetected={stats.vehicleDetected}
          steps={stats.steps}
          kcal={roam.kcal}
        />

        {tracker ? <RoamGoalsSummary tracker={tracker} roam={roam} /> : null}

        <SplitsList splits={stats.splits} distanceM={stats.distanceM} movingSec={stats.movingTimeSec} />

        {!stats.xpEligible && !stats.vehicleDetected ? (
          <Text style={[styles.note, { color: palette.mutedText }]}>
            Roams under 200 m or 1 minute of movement are saved but don't earn XP.
          </Text>
        ) : null}
        {error ? <Text style={[styles.note, { color: palette.destructive }]}>{error}</Text> : null}
      </ScrollView>

      {/* Pinned, so the next step is always on screen however long the stats get. */}
      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <Button variant="secondary" title="Discard" onPress={onDiscard} disabled={saving} style={styles.discard} />
        <Button title="Save Roam" onPress={onSave} loading={saving} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  content: { gap: 20, paddingBottom: 24 },
  footer: { flexDirection: 'row', gap: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  discard: { flexGrow: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 42 },
  name: { flex: 1, minWidth: 0, fontSize: 27, fontFamily: type.weight.extrabold, letterSpacing: -0.9, paddingVertical: 0, minHeight: 42 },
  map: { height: 240, borderRadius: 18 },
  routeCard: { gap: 12, backgroundColor: 'transparent' },
  routeTitle: { marginBottom: 0 },
  sectionTitle: { fontFamily: type.weight.bold, fontSize: 18, letterSpacing: -0.4, marginBottom: -8 },
  note: { fontSize: 12, textAlign: 'center' },
});
