import { useRouter } from 'expo-router';
import { CalendarDays, ChevronRight, Flame, HeartPulse, ListPlus, Play, Plus, Sparkles, Trophy } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { agoLabel, fmtVolume, partOf, plural } from '@/src/features/workouts/model';
import { estMinutes } from '@/src/features/workouts/train/TrainHero';
import { PartChip, SectionHead } from '@/src/features/workouts/ui/bits';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { Routine } from '@/src/lib/api/routines';
import { radii, spacing, type } from '@/src/styles/tokens';

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function QuickStart({ onEmpty, onCardio }: { onEmpty: () => void; onCardio: () => void }) {
  const c = useThemeColors();
  const tile = (label: string, sub: string, tone: { fg: string; bg: string }, Icon: typeof Plus, onPress: () => void, id: string) => (
    <Pressable testID={id} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}. ${sub}`}
      style={({ pressed }) => [styles.tile, { backgroundColor: tone.bg, borderColor: c.border }, pressed && styles.pressed]}>
      <View style={[styles.tileIcon, { backgroundColor: tone.fg }]}><Icon size={22} color={c.card} /></View>
      <Text style={[styles.name, { color: c.text }]}>{label}</Text>
      <Text style={[styles.meta, { color: c.mutedText }]}>{sub}</Text>
    </Pressable>
  );
  return (
    <View style={styles.section}>
      <SectionHead title="Quick start" />
      <View style={styles.tiles}>
        {tile('Empty workout', 'Add exercises as you go', c.parts.core, Plus, onEmpty, 'quick-empty')}
        {tile('Cardio', 'Treadmill, bike, rower…', c.parts.cardio, HeartPulse, onCardio, 'quick-cardio')}
      </View>
    </View>
  );
}

export function RoutineList({ routines, onStart }: { routines: Routine[]; onStart: (r: Routine) => void }) {
  const c = useThemeColors();
  const router = useRouter();
  return (
    <View style={styles.section}>
      <SectionHead title="My routines" right={<Text style={[styles.meta, { color: c.mutedText }]}>{plural(routines.length, 'routine')}</Text>} />
      <Pressable testID="new-routine" onPress={() => router.push('/workouts/routine/edit')} accessibilityRole="button"
        style={({ pressed }) => [styles.newRoutine, { borderColor: c.border, backgroundColor: c.accentSoft }, pressed && styles.pressed]}>
        <Plus size={20} color={c.accent} /><Text style={[styles.newText, { color: c.accent }]}>New routine</Text>
      </Pressable>
      {routines.map((r) => {
        const parts = Array.from(new Set(r.exercises.map((e) => partOf(e.exercise))));
        return (
          <View key={r.id} style={[styles.card, styles.routine, { backgroundColor: c.card, borderColor: c.border }]}>
            <Pressable style={styles.routineTap} onPress={() => router.push(`/workouts/routine/${r.id}`)} accessibilityRole="button"
              accessibilityLabel={`${r.title}, ${plural(r.exercises.length, 'exercise')}. Open routine`}>
              <Text style={[styles.routineTitle, { color: c.text }]} numberOfLines={1}>{r.title}</Text>
              <Text style={[styles.meta, { color: c.mutedText }]}>{plural(r.exercises.length, 'exercise')} · about {estMinutes(r)} min</Text>
              <View style={styles.chips}>{parts.map((p) => <PartChip key={p} part={p} />)}</View>
              <Text style={[styles.small, { color: c.mutedText }]}>Last done {agoLabel(r.last_done)}</Text>
            </Pressable>
            <Pressable testID={`start-${r.id}`} onPress={() => onStart(r)} accessibilityRole="button" accessibilityLabel={`Start ${r.title}`}
              style={({ pressed }) => [styles.play, { backgroundColor: c.primary }, pressed && styles.pressed]}>
              <Play size={24} color={c.primaryText} fill={c.primaryText} />
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

export function Challenges({ monthWorkouts, streak, level, levelProgress, xpToNext }: {
  monthWorkouts: number; streak: number; level: number; levelProgress: number; xpToNext: number;
}) {
  const c = useThemeColors();
  const monthName = new Date().toLocaleDateString('en-GB', { month: 'long' });
  const cards = [
    { tone: c.parts.shoulders, Icon: Trophy, eyebrow: `${monthName} challenge`, title: '12 workouts this month', f: monthWorkouts / 12, text: monthWorkouts >= 12 ? 'Completed!' : `${monthWorkouts} / 12 · ${12 - monthWorkouts} to go` },
    { tone: c.parts.arms, Icon: Flame, eyebrow: 'Next badge', title: '7-day streak', f: streak / 7, text: streak >= 7 ? 'Unlocked!' : `${streak} / 7 · ${plural(7 - streak, 'more day')}` },
    { tone: c.parts.legs, Icon: Sparkles, eyebrow: `Level ${level}`, title: `Reach level ${level + 1}`, f: levelProgress, text: `${fmtVolume(xpToNext)} XP to go` },
  ];
  return (
    <View style={styles.section}>
      <SectionHead title="Challenges" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hscroll} style={styles.bleed}>
        {cards.map((k) => (
          <View key={k.title} style={[styles.goal, { backgroundColor: k.tone.bg, borderColor: c.border }]} accessible
            accessibilityLabel={`${k.eyebrow}: ${k.title}. ${k.text}`}>
            <View style={[styles.medal, { backgroundColor: k.tone.fg }]}><k.Icon size={22} color={c.card} /></View>
            <Text style={[styles.eyebrow, { color: k.tone.fg }]}>{k.eyebrow}</Text>
            <Text style={[styles.name, { color: c.text }]}>{k.title}</Text>
            <View style={[styles.bar, { backgroundColor: c.card }]}>
              <View style={[styles.barFill, { backgroundColor: k.tone.fg, width: `${Math.round(Math.min(1, Math.max(0, k.f)) * 100)}%` }]} />
            </View>
            <Text style={[styles.meta, { color: c.mutedText }]}>{k.text}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export interface RecentItem { id: string; title: string; date: string; minutes: number; detail: string }

export function RecentRow({ item, cardio }: { item: RecentItem; cardio?: boolean }) {
  const c = useThemeColors();
  const router = useRouter();
  const [y, m, d] = item.date.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const tone = cardio ? c.parts.cardio : c.parts.core;
  return (
    <Pressable onPress={() => router.push(`/workouts/history/${item.id}`)} accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${date.toDateString()}, ${item.minutes} minutes, ${item.detail}`}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <View style={[styles.dateTile, { backgroundColor: tone.bg }]}>
        <Text style={[styles.dateDow, { color: tone.fg }]}>{DAY[date.getDay()]}</Text>
        <Text style={[styles.dateNum, { color: tone.fg }]}>{date.getDate()}</Text>
      </View>
      <View style={styles.grow}>
        <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.meta, { color: c.mutedText }]}>{item.minutes} min · {item.detail}</Text>
      </View>
      <ChevronRight size={20} color={c.mutedText} />
    </Pressable>
  );
}

export function FirstVisitChoices({ onEmpty }: { onEmpty: () => void }) {
  const c = useThemeColors();
  const router = useRouter();
  const choice = (title: string, sub: string, tone: { fg: string; bg: string }, Icon: typeof Plus, onPress: () => void) => (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.card, styles.choice, { backgroundColor: c.card, borderColor: c.border }, pressed && styles.pressed]}>
      <View style={[styles.choiceIcon, { backgroundColor: tone.bg }]}><Icon size={26} color={tone.fg} /></View>
      <View style={styles.grow}>
        <Text style={[styles.name, { color: c.text }]}>{title}</Text>
        <Text style={[styles.meta, { color: c.mutedText }]}>{sub}</Text>
      </View>
      <ChevronRight size={22} color={c.mutedText} />
    </Pressable>
  );
  return (
    <View style={styles.section}>
      <SectionHead title="How would you like to start?" />
      {choice('Just log a workout', 'Start now and add exercises as you go.', c.parts.core, Play, onEmpty)}
      {choice('Build my own routine', 'Pick from templates like Push, Legs or Abs.', c.parts.back, ListPlus, () => router.push('/workouts/routine/edit'))}
      {choice('Follow a program for me', 'A simple weekly plan made for your level.', c.parts.legs, CalendarDays, () => router.push('/workouts/programs'))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md, marginTop: spacing['2xl'] - 4 },
  tiles: { flexDirection: 'row', gap: spacing.sm + 2 },
  tile: { flex: 1, borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md + 2, gap: spacing.xs, minHeight: 124 },
  tileIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  name: { fontFamily: type.weight.bold, fontSize: 17, lineHeight: 22 },
  meta: { fontFamily: type.weight.regular, fontSize: 14 },
  small: { fontFamily: type.weight.regular, fontSize: 13 },
  pressed: { transform: [{ scale: 0.97 }] },
  newRoutine: { minHeight: 60, borderRadius: radii.xl, borderWidth: 2, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  newText: { fontFamily: type.weight.bold, fontSize: 16 },
  card: { borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth },
  routine: { flexDirection: 'row', alignItems: 'center', padding: spacing.md + 2, paddingLeft: spacing.base, gap: spacing.md },
  routineTap: { flex: 1, gap: 6, minHeight: 48 },
  routineTitle: { fontFamily: type.weight.extrabold, fontSize: 19, letterSpacing: -0.2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  play: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  bleed: { marginHorizontal: -16 },
  hscroll: { paddingHorizontal: 16, gap: spacing.sm + 2 },
  goal: { width: 250, borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md + 2, gap: 6 },
  medal: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  eyebrow: { fontFamily: type.weight.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  bar: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 4 },
  barFill: { height: '100%', borderRadius: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md + 2, paddingVertical: spacing.md, minHeight: 76 },
  dateTile: { width: 50, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dateDow: { fontFamily: type.weight.extrabold, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  dateNum: { fontFamily: type.weight.extrabold, fontSize: 21 },
  grow: { flex: 1, minWidth: 0 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: spacing.md + 2, padding: spacing.base, minHeight: 88 },
  choiceIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
