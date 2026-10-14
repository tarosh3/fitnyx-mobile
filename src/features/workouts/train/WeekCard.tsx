import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { plural } from '@/src/features/workouts/model';
import { Rings } from '@/src/features/workouts/ui/bits';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { localDateKey } from '@/src/lib/api/workoutSessions';
import { spacing, type } from '@/src/styles/tokens';

export interface WeekSession {
  id: string;
  workout_date: string;
  total_duration_sec: number;
  total_sets: number;
}

export const WEEKLY_GOAL = { workouts: 4, minutes: 150, sets: 60 };

/** Monday-first days of the current week as YYYY-MM-DD. */
export function weekKeys(now = new Date()): string[] {
  const start = new Date(now);
  start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return localDateKey(d);
  });
}

/** This week's rings (workouts · minutes · sets) and a tappable day strip. */
export function WeekCard({ sessions }: { sessions: WeekSession[] }) {
  const c = useThemeColors();
  const router = useRouter();
  const days = weekKeys();
  const today = localDateKey(new Date());

  const week = useMemo(() => {
    const inWeek = sessions.filter((s) => days.includes(s.workout_date));
    const byDay = new Map<string, string>();
    inWeek.forEach((s) => { if (!byDay.has(s.workout_date)) byDay.set(s.workout_date, s.id); });
    return {
      workouts: byDay.size,
      minutes: Math.round(inWeek.reduce((n, s) => n + s.total_duration_sec, 0) / 60),
      sets: inWeek.reduce((n, s) => n + s.total_sets, 0),
      byDay,
    };
  }, [sessions, days.join()]);

  const left = WEEKLY_GOAL.workouts - week.workouts;
  const legend = [
    { color: c.primary, label: 'Workouts', value: `${week.workouts}/${WEEKLY_GOAL.workouts}` },
    { color: c.parts.back.fg, label: 'Minutes', value: `${week.minutes}/${WEEKLY_GOAL.minutes}` },
    { color: c.parts.legs.fg, label: 'Sets', value: `${week.sets}/${WEEKLY_GOAL.sets}` },
  ];

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.top}>
        <Rings size={96} stroke={9} rings={[
          { value: week.workouts, goal: WEEKLY_GOAL.workouts, color: c.primary },
          { value: week.minutes, goal: WEEKLY_GOAL.minutes, color: c.parts.back.fg },
          { value: week.sets, goal: WEEKLY_GOAL.sets, color: c.parts.legs.fg },
        ]} />
        <View style={styles.legend} accessible accessibilityLabel={`This week: ${legend.map((l) => `${l.label} ${l.value}`).join(', ')}`}>
          <Text style={[styles.title, { color: c.text }]}>This week</Text>
          {legend.map((l) => (
            <View key={l.label} style={styles.lg}>
              <View style={[styles.dot, { backgroundColor: l.color }]} />
              <Text style={[styles.lgLabel, { color: c.mutedText }]}>{l.label}</Text>
              <Text style={[styles.lgValue, { color: c.text }]}>{l.value}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.days}>
        {days.map((key, i) => {
          const sessionId = week.byDay.get(key);
          const isToday = key === today;
          const n = Number(key.slice(8));
          const circle = (
            <View style={[styles.circle, { borderColor: isToday ? c.accent : c.border },
              sessionId && { backgroundColor: c.primary, borderColor: c.primary }]}>
              {sessionId ? <Check size={18} color={c.primaryText} /> : <Text style={[styles.dayNum, { color: c.text }]}>{n}</Text>}
            </View>
          );
          return sessionId ? (
            <Pressable key={key} style={styles.day} onPress={() => router.push(`/workouts/history/${sessionId}`)}
              accessibilityRole="button" accessibilityLabel={`${n}, trained. Open this workout`}>
              <Text style={[styles.dayLetter, { color: c.mutedText }]}>{'MTWTFSS'[i]}</Text>{circle}
            </Pressable>
          ) : (
            <View key={key} style={styles.day} accessibilityLabel={`${n}${isToday ? ', today' : ''}`}>
              <Text style={[styles.dayLetter, { color: c.mutedText }]}>{'MTWTFSS'[i]}</Text>{circle}
            </View>
          );
        })}
      </View>
      <Text style={[styles.note, { color: c.mutedText }]}>
        {left <= 0 ? 'Weekly workout goal reached. Keep it going.' : `${plural(left, 'more workout')} to hit your weekly workout goal.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, padding: spacing.base, gap: spacing.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  legend: { flex: 1, gap: 6 },
  title: { fontFamily: type.weight.bold, fontSize: 16 },
  lg: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  lgLabel: { flex: 1, fontFamily: type.weight.medium, fontSize: 14 },
  lgValue: { fontFamily: type.weight.extrabold, fontSize: 14, fontVariant: ['tabular-nums'] },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { flex: 1, alignItems: 'center', gap: 4, minHeight: 56 },
  dayLetter: { fontFamily: type.weight.semibold, fontSize: 12 },
  circle: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dayNum: { fontFamily: type.weight.bold, fontSize: 14 },
  note: { fontFamily: type.weight.regular, fontSize: 12, lineHeight: 18 },
});
