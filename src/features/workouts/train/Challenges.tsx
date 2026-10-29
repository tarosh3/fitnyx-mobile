import { Flame, Sparkles, Trophy } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import { fmtVolume, plural } from '@/src/features/workouts/model';
import { SectionHead } from '@/src/features/workouts/ui/bits';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { spacing, type } from '@/src/styles/tokens';

export function Challenges({ monthWorkouts, streak, level, levelProgress, xpToNext }: {
  monthWorkouts: number; streak: number; level: number; levelProgress: number; xpToNext: number;
}) {
  const c = useThemeColors();
  const monthName = new Date().toLocaleDateString('en-GB', { month: 'long' });
  const cards = [
    { id: 'month', tone: { fg: c.progress.record, bg: c.progress.recordSoft }, Icon: Trophy, eyebrow: `${monthName} challenge`, title: '12 workouts this month', percent: monthWorkouts / 12 * 100, text: monthWorkouts >= 12 ? 'Completed!' : `${monthWorkouts} / 12 · ${12 - monthWorkouts} to go` },
    { id: 'streak', tone: { fg: c.progress.record, bg: c.progress.recordSoft }, Icon: Flame, eyebrow: 'Next badge', title: '7-day streak', percent: streak / 7 * 100, text: streak >= 7 ? 'Unlocked!' : `${streak} / 7 · ${plural(7 - streak, 'more day')}` },
    { id: 'level', tone: { fg: c.progress.record, bg: c.progress.recordSoft }, Icon: Sparkles, eyebrow: `Level ${level}`, title: `Reach level ${level + 1}`, percent: levelProgress, text: `${fmtVolume(xpToNext)} XP to go` },
  ];
  return (
    <View style={styles.section}>
      <SectionHead title="Keep the momentum" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hscroll} style={styles.bleed}>
        {cards.map((k) => {
          const percent = Math.round(Math.min(100, Math.max(0, k.percent)));
          return (
            <View key={k.id} style={[styles.goal, { backgroundColor: c.card, borderColor: c.border }]} accessible
              accessibilityLabel={`${k.eyebrow}: ${k.title}. ${k.text}. ${percent}% complete`}>
              <View style={styles.top}>
                <View style={styles.medal} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  <Svg width={52} height={56} viewBox="0 0 52 56" style={StyleSheet.absoluteFill}>
                    <Polygon points="26,2 49,15 49,41 26,54 3,41 3,15" fill={k.tone.bg} stroke={k.tone.fg} strokeOpacity={0.45} strokeWidth={1} />
                    <Polygon points="26,7 44,18 44,38 26,49 8,38 8,18" fill="none" stroke={k.tone.fg} strokeOpacity={0.15} />
                  </Svg>
                  <k.Icon size={23} color={k.tone.fg} strokeWidth={1.7} />
                </View>
                <Text style={[styles.percent, { color: c.mutedText }]}>{percent}<Text style={styles.percentSign}>%</Text></Text>
              </View>
              <Text style={[styles.eyebrow, { color: k.tone.fg }]}>{k.eyebrow}</Text>
              <Text style={[styles.name, { color: c.text }]}>{k.title}</Text>
              <View testID={`challenge-${k.id}-progress`} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent }} style={[styles.bar, { backgroundColor: k.tone.bg }]}>
                <View style={[styles.barFill, { backgroundColor: k.tone.fg, width: `${percent}%` }]} />
              </View>
              <Text style={[styles.meta, { color: c.mutedText }]}>{k.text}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md, marginTop: 28 },
  bleed: { marginHorizontal: -16 },
  hscroll: { paddingHorizontal: 16, gap: spacing.md },
  goal: { width: 248, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, padding: spacing.base, gap: 7 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  medal: { width: 52, height: 56, alignItems: 'center', justifyContent: 'center' },
  percent: { fontFamily: type.weight.extrabold, fontSize: 27, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  percentSign: { fontFamily: type.weight.medium, fontSize: 14 },
  eyebrow: { fontFamily: type.weight.bold, fontSize: type.size.micro, letterSpacing: 1, textTransform: 'uppercase' },
  name: { fontFamily: type.weight.bold, fontSize: 17, lineHeight: 22 },
  bar: { height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 5, marginBottom: 2 },
  barFill: { height: '100%', borderRadius: 3 },
  meta: { fontFamily: type.weight.regular, fontSize: 12, lineHeight: 18 },
});
