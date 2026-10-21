import { Pencil } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
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
}: Props) {
  const palette = useThemeColors();
  const roam = roamActivity(type, stats, tracker?.weightKg ?? null);
  return (
    <View style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View>
          <Text style={[styles.eyebrow, { color: palette.primary }]} onLongPress={onExportRaw} suppressHighlighting>
            {ACTIVITY_LABEL[type].toUpperCase()} COMPLETE
          </Text>
          {/* The title reads as a heading but is editable in place. */}
          <View style={[styles.nameRow, { borderBottomColor: palette.border }]}>
            <TextInput
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
            <Pencil size={18} color={palette.mutedText} />
          </View>
        </View>
        <RouteMap route={stats.route} vehicleRanges={stats.vehicleRanges} style={styles.map} />

        {stats.vehicleDetected ? (
          <VehicleBanner
            message={
              stats.xpEligible
                ? `${formatDistance(stats.vehicleDistanceM)} looked like vehicle travel and won't count.`
                : `Most of this Roam (${formatDistance(stats.vehicleDistanceM)}) looked like vehicle travel, so it won't earn XP.`
            }
          />
        ) : null}

        <RoamStatsPanel
          distanceM={stats.distanceM}
          movingSec={stats.movingTimeSec}
          elapsedSec={elapsedSec}
          avgSpeedMps={stats.avgSpeedMps}
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
        <Button title="DISCARD" variant="ghost" onPress={onDiscard} disabled={saving} style={styles.discard} />
        <Button title="SAVE ROAM" onPress={onSave} loading={saving} style={styles.save} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  content: { gap: 14, paddingBottom: 16 },
  footer: { flexDirection: 'row', gap: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  discard: { flex: 1 },
  save: { flex: 2 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  name: { flex: 1, fontSize: 26, fontWeight: '800', letterSpacing: -0.4, paddingVertical: 8 },
  map: { height: 260 },
  note: { fontSize: 12, textAlign: 'center' },
});
