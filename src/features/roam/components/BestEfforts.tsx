import { Crown } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { roamEfforts } from '@/src/features/roam/ghost';
import { effortName, formatClock } from '@/src/features/progress/records';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { Effort } from '@/src/lib/api/progress';
import { radii, spacing, type } from '@/src/styles/tokens';

interface Props {
  activityId: string;
  splits: { km: number; sec: number }[];
  /** All-time records (Progress summary); a match gets a crown. Undefined while loading. */
  records?: Effort[];
}

/** The fastest 1 / 5 / 10 / 21 km within this Roam, and which are all-time bests. */
export function BestEfforts({ activityId, splits, records }: Props) {
  const c = useThemeColors();
  const efforts = roamEfforts(splits);
  if (!efforts.length) return null;
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]} testID="best-efforts">
      <Text style={[styles.label, { color: c.mutedText }]}>BEST EFFORTS IN THIS ROAM</Text>
      {efforts.map((e, i) => {
        const record = records?.some((r) => r.km === e.km && r.activity_id === activityId && r.sec === e.sec);
        return (
          <View key={e.km} style={[styles.row, i > 0 && { borderTopColor: c.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
            <View style={styles.text}>
              <Text style={[styles.name, { color: c.text }]}>{effortName(e.km)}</Text>
              <Text style={[styles.sub, { color: c.mutedText }]}>
                {e.km === 1 ? `Km ${e.fromKm + 1}` : `Km ${e.fromKm + 1}–${e.fromKm + e.km}`}
              </Text>
            </View>
            {record ? (
              <View style={[styles.badge, { backgroundColor: c.surface }]} accessibilityLabel="All-time best">
                <Crown size={12} color={c.accent} />
                <Text style={[styles.badgeText, { color: c.accent }]}>All-time best</Text>
              </View>
            ) : null}
            <Text style={[styles.value, { color: record ? c.accent : c.text }]}>{formatClock(e.sec)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  label: { fontFamily: type.weight.extrabold, fontSize: 11, letterSpacing: 1.2, paddingVertical: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 10, minHeight: 48 },
  text: { flex: 1, gap: 2 },
  name: { fontFamily: type.weight.semibold, fontSize: 15 },
  sub: { fontFamily: type.weight.regular, fontSize: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radii.md, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontFamily: type.weight.semibold, fontSize: 12 },
  value: { fontFamily: type.weight.extrabold, fontSize: 17, fontVariant: ['tabular-nums'], minWidth: 56, textAlign: 'right' },
});
