import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/src/components/ui/Card';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { localDateKey } from '@/src/lib/api/workoutSessions';
import { useAuth } from '@/src/providers/AuthProvider';
import { radii, spacing, type } from '@/src/styles/tokens';
import { useProgressSummary } from './data';
import { shortDate } from './range';
import { badgesFor, effortName, formatClock, formatKg, isRecent } from './records';
import { BigNumber, Empty, Eyebrow, Muted } from './ui/bits';
import { MilestoneEmblem } from '@/src/components/art/MilestoneEmblem';

type Tab = 'records' | 'badges';
interface Row { key: string; name: string; value: string; unit?: string; sub: string; date: string; href?: string }

function RecordList({ title, rows, today }: { title: string; rows: Row[]; today: string }) {
  const c = useThemeColors();
  const router = useRouter();
  if (!rows.length) return null;
  return (
    <View style={styles.group}>
      <Eyebrow style={styles.groupTitle}>{title}</Eyebrow>
      <Card style={styles.list}>
        {rows.map((r, i) => (
          <Pressable key={r.key} disabled={!r.href} onPress={() => r.href && router.push(r.href as never)} accessibilityRole={r.href ? 'button' : undefined}
            style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}>
            <View style={styles.flex}>
              <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={1}>{r.name}</Text>
              <Muted>{r.sub} · {shortDate(r.date)}</Muted>
            </View>
            {isRecent(r.date, today) ? <Text style={[styles.badge, { color: c.progress.record, backgroundColor: c.progress.recordSoft }]}>New</Text> : null}
            <BigNumber value={r.value} unit={r.unit} size={20} />
          </Pressable>
        ))}
      </Card>
    </View>
  );
}

export function TrophyCase() {
  const c = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'badges' ? 'badges' : 'records');
  const { user } = useAuth();
  const { data, loading, failed } = useProgressSummary(user?.id);
  const today = localDateKey(new Date());

  const lifts: Row[] = (data?.records.lifts ?? []).map((l) => ({ key: l.exercise_uuid, name: l.name, value: formatKg(l.e1rm_kg), unit: 'kg', sub: `${formatKg(l.weight_kg)} kg × ${l.reps}`, date: l.date }));
  const roams: Row[] = [
    ...(data?.records.efforts ?? []).map((e) => ({ key: `e${e.km}`, name: effortName(e.km), value: formatClock(e.sec), sub: 'Stride', date: e.date, href: `/roam/${e.activity_id}` })),
    ...(data?.records.longest_roam ? [{ key: 'longest', name: 'Longest Roam', value: (data.records.longest_roam.value / 1000).toFixed(1), unit: 'km', sub: 'Distance', date: data.records.longest_roam.date, href: `/roam/${data.records.longest_roam.activity_id}` }] : []),
    ...(data?.records.most_climb ? [{ key: 'climb', name: 'Most climbing', value: String(Math.round(data.records.most_climb.value)), unit: 'm', sub: 'Elevation', date: data.records.most_climb.date, href: `/roam/${data.records.most_climb.activity_id}` }] : []),
  ];

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.base, paddingBottom: insets.bottom + spacing['2xl'] }]}>
      <View style={styles.header}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/me' as never))} accessibilityRole="button" accessibilityLabel="Back"
          style={[styles.back, { backgroundColor: c.card }]}>
          <ChevronLeft size={22} color={c.text} />
        </Pressable>
        <Text style={[styles.h1, { color: c.text }]} accessibilityRole="header">Trophy case</Text>
      </View>
      <View style={[styles.tabs, { backgroundColor: c.card }]} accessibilityRole="tablist">
        {(['records', 'badges'] as Tab[]).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} accessibilityRole="tab" accessibilityState={{ selected: tab === t }}
            style={[styles.tab, tab === t && { backgroundColor: c.surface }]}>
            <Text style={[styles.tabText, { color: tab === t ? c.text : c.mutedText }]}>{t === 'records' ? 'Records' : 'Badges'}</Text>
          </Pressable>
        ))}
      </View>

      {!data ? <Empty text={loading ? 'Loading…' : failed ? "Couldn't load your records" : ''} /> : tab === 'records' ? (
        lifts.length || roams.length ? (
          <>
            <RecordList title="Strength · est. 1-rep max" rows={lifts} today={today} />
            <RecordList title="Roam" rows={roams} today={today} />
          </>
        ) : <Empty text="Log weighted sets or run a Roam to set your first records" />
      ) : (
        <View style={styles.grid}>
          {badgesFor(data).map((b) => (
            <Card key={b.id} style={styles.badgeCard}>
              <MilestoneEmblem id={b.id} earned={b.earned} size={72} />
              <Text style={[styles.badgeName, { color: c.text }]} numberOfLines={2}>{b.name}</Text>
              <Muted style={styles.center}>{b.detail}</Muted>
              {!b.earned ? (
                <View style={[styles.progress, { backgroundColor: c.progress.empty }]}>
                  <View style={{ width: `${Math.round(b.progress * 100)}%`, height: '100%', backgroundColor: c.primary }} />
                </View>
              ) : null}
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.base, gap: spacing.base },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  h1: { fontFamily: type.weight.extrabold, fontSize: 28, letterSpacing: -0.5 },
  tabs: { flexDirection: 'row', padding: 4, borderRadius: radii.md },
  tab: { flex: 1, minHeight: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontFamily: type.weight.bold, fontSize: 14 },
  group: { gap: spacing.sm },
  groupTitle: { marginLeft: 4 },
  list: { padding: 0, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.base, paddingVertical: spacing.md, minHeight: 60 },
  flex: { flex: 1, minWidth: 0, gap: 3 },
  rowTitle: { fontFamily: type.weight.semibold, fontSize: 15 },
  badge: { fontFamily: type.weight.bold, fontSize: 11, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badgeCard: { width: '31.6%', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm },
  badgeName: { fontFamily: type.weight.bold, fontSize: 12, textAlign: 'center' },
  center: { textAlign: 'center', fontSize: 11, lineHeight: 15 },
  progress: { width: '70%', height: 4, borderRadius: 2, overflow: 'hidden' },
});
