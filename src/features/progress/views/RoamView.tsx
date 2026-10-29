import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/src/components/ui/Card';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { ProgressSummary } from '@/src/lib/api/progress';
import { spacing, type } from '@/src/styles/tokens';
import { formatDuration, shortDate, type Bucket, type Gran, type Totals } from '../range';
import { effortName, formatClock, isRecent } from '../records';
import { BigNumber, CardTitle, Change, Empty, Eyebrow, Muted } from '../ui/bits';
import { Bars } from '../ui/Charts';

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <Card style={styles.stat}>
      <Muted>{label}</Muted>
      <BigNumber value={value} unit={unit} size={24} />
    </Card>
  );
}

export function RoamView({ buckets, totals, change, span, gran, summary, today }: {
  buckets: Bucket[]; totals: Totals; change: number | null; span: number; gran: Gran; summary?: ProgressSummary; today: string;
}) {
  const c = useThemeColors();
  const router = useRouter();
  const km = totals.distanceM / 1000;
  const moving = formatDuration(totals.roamSec);
  const rec = summary?.records;
  const rows = [
    ...(rec?.efforts ?? []).map((e) => ({ key: `e${e.km}`, name: effortName(e.km), value: formatClock(e.sec), unit: undefined as string | undefined, date: e.date, id: e.activity_id })),
    ...(rec?.longest_roam ? [{ key: 'longest', name: 'Longest Roam', value: (rec.longest_roam.value / 1000).toFixed(1), unit: 'km', date: rec.longest_roam.date, id: rec.longest_roam.activity_id }] : []),
    ...(rec?.most_climb ? [{ key: 'climb', name: 'Most climbing', value: String(Math.round(rec.most_climb.value)), unit: 'm', date: rec.most_climb.date, id: rec.most_climb.activity_id }] : []),
  ];
  return (
    <View style={styles.stack}>
      <Card style={styles.card}>
        <Eyebrow>Distance</Eyebrow>
        <BigNumber value={km.toFixed(1)} unit="km" size={48} animate />
        <Change pct={change} suffix={`vs the ${span} days before`} />
        <View style={styles.chart}>
          <Bars data={buckets.map((b) => ({ label: b.label, parts: [{ value: b.distanceM, color: c.progress.roam }] }))} height={110}
            accessibilityLabel={`Distance by ${gran}: ${km.toFixed(1)} km in total`} />
        </View>
      </Card>

      <View style={styles.grid}>
        <Stat label="Roams" value={String(totals.roams)} />
        <Stat label="Moving time" value={`${moving.h}h ${String(moving.m).padStart(2, '0')}m`} />
        <Stat label="Per Roam" value={totals.roams ? (km / totals.roams).toFixed(1) : '0'} unit="km" />
        <Stat label="Avg speed" value={totals.roamSec ? (km / (totals.roamSec / 3600)).toFixed(1) : '0'} unit="km/h" />
      </View>

      <Card style={styles.listCard}>
        <View style={styles.listHead}><CardTitle title="Best efforts" right="All time" /></View>
        {rows.length ? rows.map((r) => (
          <Pressable key={r.key} onPress={() => router.push(`/roam/${r.id}`)} accessibilityRole="button" style={[styles.row, { borderTopColor: c.border }]}>
            <View style={styles.flex}>
              <Text style={[styles.rowTitle, { color: c.text }]}>{r.name}</Text>
              <Muted>{shortDate(r.date)}</Muted>
            </View>
            {isRecent(r.date, today) ? <Text style={[styles.badge, { color: c.progress.record, backgroundColor: c.progress.recordSoft }]}>New</Text> : null}
            <BigNumber value={r.value} unit={r.unit} size={20} />
          </Pressable>
        )) : <Empty text="Run a full kilometre in a Roam to set your first best effort" style={styles.inset} />}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  card: { padding: spacing.lg, gap: spacing.sm },
  chart: { marginTop: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { flexBasis: '48%', flexGrow: 1, gap: spacing.sm },
  listCard: { padding: 0, overflow: 'hidden' },
  listHead: { padding: spacing.base, paddingBottom: spacing.sm },
  inset: { margin: spacing.base, marginTop: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, minHeight: 60 },
  flex: { flex: 1, minWidth: 0, gap: 3 },
  rowTitle: { fontFamily: type.weight.semibold, fontSize: 15 },
  badge: { fontFamily: type.weight.bold, fontSize: 11, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
});
