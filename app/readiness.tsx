import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';
import { BAND_LABEL, type ReadinessDriver } from '@/src/features/readiness/readiness';
import { useReadiness } from '@/src/features/readiness/useReadiness';
import { ReadinessRing, bandColor } from '@/src/features/readiness/ui/ReadinessRing';

type Colors = ReturnType<typeof useThemeColors>;

const statusColor = (c: Colors, s: ReadinessDriver['status']) =>
  s === 'good' ? c.success : s === 'fair' ? c.warning : s === 'low' ? c.destructive : c.mutedText;

function DriverRow({ label, unit, driver, lowerIsBetter }: { label: string; unit: string; driver: ReadinessDriver; lowerIsBetter?: boolean }) {
  const c = useThemeColors();
  const base = driver.baseline != null ? `${driver.baseline}${unit}` : '—';
  const baseLabel = label === 'Sleep' ? 'need' : lowerIsBetter ? 'typical' : 'baseline';
  return (
    <View style={styles.driver}>
      <View style={[styles.dot, { backgroundColor: statusColor(c, driver.status) }]} />
      <View style={styles.flex}>
        <Text style={[styles.driverLabel, { color: c.text }]}>{label}</Text>
        <Text style={[styles.driverSub, { color: c.mutedText }]}>{baseLabel} {base}</Text>
      </View>
      <Text style={[styles.driverValue, { color: driver.value != null ? c.text : c.mutedText }]}>
        {driver.value != null ? `${driver.value}${unit}` : 'no data'}
      </Text>
    </View>
  );
}

export default function ReadinessScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { readiness, series, refresh } = useReadiness();
  const [refreshing, setRefreshing] = useState(false);
  const color = bandColor(c, readiness.band);

  const onRefresh = async () => {
    setRefreshing(true);
    try { await refresh(); } finally { setRefreshing(false); }
  };

  const trend = series.slice(-14);
  const hrvs = trend.map((d) => d.hrvMs).filter((v): v is number => v != null);
  const maxHrv = hrvs.length ? Math.max(...hrvs) : 1;

  return (
    <ScrollView style={{ backgroundColor: c.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.base, paddingBottom: insets.bottom + spacing['2xl'] }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={[styles.back, { backgroundColor: c.card }]}>
          <ChevronLeft size={22} color={c.text} />
        </Pressable>
        <Text style={[styles.h1, { color: c.text }]} accessibilityRole="header">Readiness</Text>
      </View>

      <View style={[styles.hero, { backgroundColor: c.card }]}>
        <ReadinessRing score={readiness.score} color={color} track={c.progress.empty} size={120} stroke={10}>
          <Text style={[styles.heroScore, { color: readiness.score != null ? c.text : c.mutedText }]}>
            {readiness.score ?? '—'}
          </Text>
        </ReadinessRing>
        <Text style={[styles.band, { color }]}>{readiness.score != null ? BAND_LABEL[readiness.band].toUpperCase() : 'NOT READY'}</Text>
        <Text style={[styles.reason, { color: c.text }]}>{readiness.reason}</Text>
      </View>

      <Text style={[styles.sectionTitle, { color: c.mutedText }]}>TODAY VS YOUR BASELINE</Text>
      <View style={[styles.card, { backgroundColor: c.card }]}>
        <DriverRow label="HRV" unit=" ms" driver={readiness.drivers.hrv} />
        <View style={[styles.sep, { backgroundColor: c.border }]} />
        <DriverRow label="Resting HR" unit=" bpm" driver={readiness.drivers.rhr} lowerIsBetter />
        <View style={[styles.sep, { backgroundColor: c.border }]} />
        <DriverRow label="Sleep" unit=" h" driver={readiness.drivers.sleep} />
      </View>

      {hrvs.length > 1 ? (
        <>
          <Text style={[styles.sectionTitle, { color: c.mutedText }]}>HRV · LAST 14 DAYS</Text>
          <View style={[styles.card, styles.trend, { backgroundColor: c.card }]}>
            {trend.map((d, i) => (
              <View key={i} style={styles.trendCol}>
                <View style={[styles.bar, {
                  height: d.hrvMs != null ? Math.max(4, Math.round((d.hrvMs / maxHrv) * 72)) : 2,
                  backgroundColor: d.hrvMs != null ? c.primary : c.border,
                }]} />
              </View>
            ))}
          </View>
        </>
      ) : null}

      <Text style={[styles.note, { color: c.mutedText }]}>
        {readiness.baselineDays < 7
          ? `Scoring unlocks after ~7 days of data (${readiness.baselineDays} so far). Wear your watch to bed for HRV and sleep.`
          : 'Readiness compares last night against your own 28-day baseline. It’s guidance, not medical advice.'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.base, gap: spacing.base },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  h1: { fontFamily: type.weight.extrabold, fontSize: 28, letterSpacing: -0.5 },
  hero: { borderRadius: radii['2xl'], alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
  heroScore: { fontFamily: type.weight.extrabold, fontSize: 40, fontVariant: ['tabular-nums'] },
  band: { fontFamily: type.weight.bold, fontSize: type.size.xs, letterSpacing: 1.6 },
  reason: { fontFamily: type.weight.semibold, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  sectionTitle: { fontFamily: type.weight.bold, fontSize: type.size.micro, letterSpacing: 1.2, marginLeft: 4, marginTop: spacing.sm },
  card: { borderRadius: radii.xl, paddingHorizontal: spacing.base, overflow: 'hidden' },
  driver: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, minHeight: 56 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  driverLabel: { fontFamily: type.weight.semibold, fontSize: 15 },
  driverSub: { fontFamily: type.weight.regular, fontSize: 12 },
  driverValue: { fontFamily: type.weight.bold, fontSize: 16, fontVariant: ['tabular-nums'] },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 22 },
  trend: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 96, paddingVertical: spacing.md },
  trendCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '70%', borderRadius: 3, minHeight: 2 },
  note: { fontFamily: type.weight.regular, fontSize: 12, lineHeight: 17, marginTop: spacing.xs },
});
