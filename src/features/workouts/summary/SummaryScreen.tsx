import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame, Medal, Share2, Trophy, TrendingDown, TrendingUp, Zap } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRoutines, useWorkoutHistory } from '@/src/features/workouts/hooks';
import { useSessionDetail } from '@/src/features/workouts/history/useSessionDetail';
import { describeSet, fmtClock, fmtKm, fmtVolume, plural, workoutXp } from '@/src/features/workouts/model';
import { BottomBar, Button, useBottomBarSpace } from '@/src/features/workouts/ui/Chrome';
import { useToast } from '@/src/features/workouts/ui/Toast';
import { useOfflineAware } from '@/src/hooks/useOfflineAware';
import { useRetentionMetrics } from '@/src/hooks/useRetentionMetrics';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { routineFromSession } from '@/src/lib/api/routines';
import { useAuth } from '@/src/providers/AuthProvider';
import { radii, spacing, type } from '@/src/styles/tokens';

function Tile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  const c = useThemeColors();
  return (
    <View style={[styles.tile, { backgroundColor: c.card, borderColor: c.border }]} accessible accessibilityLabel={`${label}: ${value} ${unit ?? ''}`}>
      <Text style={[styles.tileLabel, { color: c.mutedText }]}>{label}</Text>
      <Text style={[styles.tileValue, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}{unit ? <Text style={[styles.tileUnit, { color: c.mutedText }]}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

/** "Workout complete" — the reward after Finish. */
export function SummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = String(id ?? '');
  const router = useRouter();
  const toast = useToast();
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const space = useBottomBarSpace();
  const { user } = useAuth();
  const { isOffline } = useOfflineAware();
  const d = useSessionDetail(sessionId);
  const history = useWorkoutHistory();
  const routines = useRoutines();
  const metrics = useRetentionMetrics(user?.id);
  const [saving, setSaving] = useState(false);
  const [savedAs, setSavedAs] = useState<string | null>(null);
  const pop = useRef(new Animated.Value(0.4)).current;

  useEffect(() => { Animated.spring(pop, { toValue: 1, friction: 4, useNativeDriver: true }).start(); }, [pop]);

  const s = d.session;
  const routine = s?.plan_id ? routines.data?.find((r) => r.id === s.plan_id) : undefined;
  const self = history.data?.find((h) => h.id === s?.id);
  const name = routine?.title ?? self?.plan_name ?? 'Workout';
  const previous = s?.plan_id ? history.data?.find((h) => h.plan_id === s.plan_id && h.id !== s.id && h.status === 'completed' && h.started_at < s.started_at) : undefined;
  const t = d.totals;
  const change = previous && previous.total_volume_kg > 0 && t.volumeKg > 0 ? Math.round(((t.volumeKg - previous.total_volume_kg) / previous.total_volume_kg) * 100) : null;
  const xp = s ? workoutXp(s.total_duration_sec, t.volumeKg) : 0;
  const prLogs = d.logs.filter((l) => l.is_pr);
  const cardioOnly = t.volumeKg === 0 && t.cardioSec > 0;

  const done = () => router.dismissTo('/workouts');

  const share = () => {
    const bits = [fmtClock(s?.total_duration_sec ?? 0), cardioOnly ? `${fmtKm(t.distanceM)} km` : `${fmtVolume(t.volumeKg)} kg lifted`, t.prs ? plural(t.prs, 'new best') : null].filter(Boolean);
    Share.share({ message: `Just finished ${name} on FitNyx 💪 ${bits.join(' · ')}` }).catch(() => undefined);
  };

  const saveRoutine = async () => {
    if (isOffline) { toast('You’re offline — try again when connected'); return; }
    setSaving(true);
    try {
      const r = await routineFromSession(sessionId);
      setSavedAs(r.title);
      if (routines.data) routines.setData([r, ...routines.data]);
      toast(`Saved as “${r.title}”`);
    } catch (e: any) {
      toast(e?.status === 409 ? 'You have 30 routines. Delete one first.' : 'Couldn’t save the routine');
    } finally {
      setSaving(false);
    }
  };

  if (d.loading && !s) return <View style={[styles.center, { backgroundColor: c.background }]}><ActivityIndicator color={c.primary} size="large" /></View>;

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.base, paddingBottom: space }]}>
        <LinearGradient colors={[c.hero.from, c.hero.to]} style={styles.hero}>
          <Animated.View style={{ transform: [{ scale: pop }] }}>
            <LinearGradient colors={[c.gold.from, c.gold.to]} style={styles.medal}>
              <Medal size={52} color={c.gold.text} />
            </LinearGradient>
          </Animated.View>
          <Text style={[styles.eyebrow, { color: c.hero.accent }]}>Workout complete</Text>
          <Text style={[styles.title, { color: c.hero.text }]} accessibilityRole="header">Great work! 💪</Text>
          <Text style={[styles.sub, { color: c.hero.muted }]}>{name}{s ? ` · ${new Date(s.started_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}` : ''}</Text>
        </LinearGradient>

        <View style={styles.grid}>
          <Tile label="Time" value={fmtClock(s?.total_duration_sec ?? 0)} />
          {t.volumeKg > 0 ? <Tile label="Volume" value={fmtVolume(t.volumeKg)} unit="kg" />
            : t.distanceM > 0 ? <Tile label="Distance" value={fmtKm(t.distanceM)} unit="km" />
              : <Tile label="Exercises" value={String(d.groups.length)} />}
          <Tile label="Sets" value={String(t.sets)} />
          <Tile label="New bests" value={String(t.prs)} />
        </View>

        {prLogs.length ? (
          <View style={[styles.card, { backgroundColor: c.parts.shoulders.bg }]}>
            <View style={styles.row}><Trophy size={22} color={c.parts.shoulders.fg} /><Text style={[styles.cardTitle, { color: c.text }]}>New personal bests</Text></View>
            {prLogs.map((l) => (
              <Text key={l.id} style={[styles.line, { color: c.text }]}>
                {d.exercises[l.exercise_uuid]?.title ?? 'Exercise'} — <Text style={styles.bold}>{describeSet(d.typeOf(l.exercise_uuid), l)}</Text>
              </Text>
            ))}
          </View>
        ) : null}

        {change != null ? (
          <View style={[styles.card, styles.row, { backgroundColor: c.card, borderColor: c.border, borderWidth: 1 }]}>
            {change >= 0 ? <TrendingUp size={24} color={c.accent} /> : <TrendingDown size={24} color={c.mutedText} />}
            <Text style={[styles.line, styles.flex, { color: c.text }]}>
              {change > 0 ? `${change}% more volume than last ${name}` : change === 0 ? `Same volume as last ${name}` : `${-change}% less than last ${name} — lighter days count too`}
            </Text>
          </View>
        ) : null}

        <View style={styles.rowWide}>
          <View style={[styles.reward, { backgroundColor: c.accentSoft }]}>
            <Zap size={22} color={c.accent} />
            <Text style={[styles.rewardText, { color: c.text }]}>+{xp} XP</Text>
          </View>
          <View style={[styles.reward, { backgroundColor: c.parts.cardio.bg }]}>
            <Flame size={22} color={c.parts.cardio.fg} />
            <Text style={[styles.rewardText, { color: c.text }]}>{plural(Math.max(1, metrics.streakDays ?? 1), 'day')} streak</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border, borderWidth: 1 }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>What you did</Text>
          {d.groups.map((g) => (
            <View key={g.uuid} style={styles.exRow}>
              <Text style={[styles.line, styles.flex, { color: c.text }]} numberOfLines={1}>{g.exercise?.title ?? 'Exercise'}</Text>
              <Text style={[styles.meta, { color: c.mutedText }]}>{plural(g.logs.length, 'set')}</Text>
            </View>
          ))}
        </View>

        {!s?.plan_id && d.logs.length ? (
          savedAs ? <Text style={[styles.line, { color: c.accent, textAlign: 'center' }]}>Saved as routine “{savedAs}” ✓</Text>
            : <Button variant="secondary" title="Save as routine" loading={saving} onPress={saveRoutine} style={styles.noFlex} />
        ) : null}
      </ScrollView>

      <BottomBar>
        <Button variant="secondary" title="Share" icon={<Share2 size={20} color={c.text} />} onPress={share} style={styles.noFlex} />
        <Button testID="summary-done" title="Done" onPress={done} />
      </BottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.base, gap: spacing.md },
  hero: { borderRadius: 28, alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
  medal: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  eyebrow: { fontFamily: type.weight.bold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { fontFamily: type.weight.extrabold, fontSize: 32, letterSpacing: -0.6 },
  sub: { fontFamily: type.weight.regular, fontSize: 15, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { flexBasis: '48%', flexGrow: 1, borderRadius: radii.lg, borderWidth: 1, padding: spacing.md, gap: 2 },
  tileLabel: { fontFamily: type.weight.semibold, fontSize: 13 },
  tileValue: { fontFamily: type.weight.extrabold, fontSize: 26, fontVariant: ['tabular-nums'] },
  tileUnit: { fontFamily: type.weight.semibold, fontSize: 15 },
  card: { borderRadius: radii.lg, padding: spacing.base, gap: spacing.sm },
  cardTitle: { fontFamily: type.weight.bold, fontSize: 17 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowWide: { flexDirection: 'row', gap: spacing.sm },
  line: { fontFamily: type.weight.regular, fontSize: 16, lineHeight: 22 },
  bold: { fontFamily: type.weight.bold },
  meta: { fontFamily: type.weight.medium, fontSize: 14 },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 32 },
  reward: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radii.lg },
  rewardText: { fontFamily: type.weight.bold, fontSize: 16 },
  noFlex: { flex: 0 },
});
