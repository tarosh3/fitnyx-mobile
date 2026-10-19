import { Flame } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/src/components/ui/Card';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { ProgressDay, ProgressSummary } from '@/src/lib/api/progress';
import { radii, spacing, type } from '@/src/styles/tokens';
import { monthGrid, monthName } from '../range';
import { BigNumber, Muted } from './bits';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** 0 rest · 1 light (<30 min) · 2 a session · 3 a big day (≥90 min or lift + Roam). */
export function heatLevel(d?: ProgressDay): 0 | 1 | 2 | 3 {
  if (!d || (d.workouts === 0 && d.roams === 0)) return 0;
  const mins = (d.workout_sec + d.roam_sec) / 60;
  if (mins >= 90 || (d.workouts > 0 && d.roams > 0)) return 3;
  return mins >= 30 ? 2 : 1;
}

function streakLine(s: ProgressSummary['streak']): string {
  if (s.current_weeks === 0) return s.best_weeks > 0 ? `Train this week to start a new one · Best ${s.best_weeks}` : 'Train once this week to start one';
  const best = s.best_weeks > s.current_weeks ? ` · Best ${s.best_weeks}` : ' · Your best yet';
  return (s.this_week ? 'This week counts already' : `Train by Sunday to make it ${s.current_weeks + 1}`) + best;
}

export function StreakCard({ streak, days, today }: { streak?: ProgressSummary['streak']; days: ProgressDay[]; today: string }) {
  const c = useThemeColors();
  const byDate = new Map(days.map((d) => [d.date, d]));
  const cells = monthGrid(today);
  const active = cells.filter((iso) => iso && iso <= today && heatLevel(byDate.get(iso)) > 0).length;
  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <View style={[styles.flame, { backgroundColor: c.progress.roamSoft }]}>
          <Flame size={24} color={c.progress.roam} strokeWidth={1.9} />
        </View>
        <View style={styles.flex}>
          <View style={styles.titleRow}>
            <BigNumber value={String(streak?.current_weeks ?? 0)} size={30} />
            <Text style={[styles.title, { color: c.text }]}>week streak</Text>
          </View>
          {streak ? <Muted>{streakLine(streak)}</Muted> : null}
        </View>
      </View>
      <View style={styles.monthRow}>
        <Text style={[styles.month, { color: c.text }]}>{monthName(today)}</Text>
        <Muted>{active} active {active === 1 ? 'day' : 'days'}</Muted>
      </View>
      <View style={styles.grid} accessible accessibilityLabel={`${monthName(today)}: ${active} active days`}>
        {WEEKDAYS.map((w, i) => <Text key={`w${i}`} style={[styles.weekday, { color: c.mutedText }]}>{w}</Text>)}
        {cells.map((iso, i) => {
          const level = iso && iso <= today ? heatLevel(byDate.get(iso)) : null;
          return (
            <View key={i} style={styles.cellWrap}>
              {iso ? (
                <View style={[styles.cell, { backgroundColor: level === null ? 'transparent' : c.progress.heat[level] },
                  iso === today && { borderWidth: 1.5, borderColor: c.text }]}>
                  <Text style={[styles.cellText, { color: level === null ? c.border : c.progress.heatInk[level] }]}>{Number(iso.slice(8))}</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.base, padding: spacing.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flame: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  title: { fontFamily: type.weight.bold, fontSize: 15 },
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: spacing.xs },
  month: { fontFamily: type.weight.bold, fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 6 },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', fontFamily: type.weight.bold, fontSize: 10 },
  cellWrap: { width: `${100 / 7}%`, paddingHorizontal: 3 },
  cell: { aspectRatio: 1, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  cellText: { fontFamily: type.weight.semibold, fontSize: 11 },
});
