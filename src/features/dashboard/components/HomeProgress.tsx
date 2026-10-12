import { ArrowUpRight, Check } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { localDateKey } from '@/src/lib/api/workoutSessions';
import { radii, spacing, type } from '@/src/styles/tokens';

interface HomeWeekSummaryProps {
  activityDays: ReadonlyMap<string, number>;
  weeklyWorkouts: number;
  weeklyVolume: number;
  weeklyDuration: number;
  weeklyCalories: number;
  onViewActivity: () => void;
}

interface HomeLevelProgressProps {
  level: number;
  xp: number;
  nextLevelXp: number;
  progressPercent: number;
}

function formatCount(value: number): string {
  return Math.max(0, Math.round(Number.isFinite(value) ? value : 0)).toLocaleString();
}

export function HomeWeekSummary({
  activityDays,
  weeklyWorkouts,
  weeklyVolume,
  weeklyDuration,
  weeklyCalories,
  onViewActivity,
}: HomeWeekSummaryProps) {
  const palette = useThemeColors();
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 360;
  const largeText = fontScale > 1.2;
  const accent = palette.accent;
  const circleSize = Math.max(compact ? 28 : 32, Math.ceil(24 * fontScale));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = localDateKey(today);
  // Calendar arithmetic keeps the dates consecutive across DST and month ends.
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - 6 + index);
    const key = localDateKey(date);
    return { date, key, count: activityDays.get(key) ?? 0 };
  });
  const metrics = [
    { label: 'Workouts', value: weeklyWorkouts },
    { label: 'Minutes', value: weeklyDuration },
    { label: 'Est. kcal', value: weeklyCalories },
  ];

  return (
    <View testID="home-week-summary" style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={[styles.header, largeText && styles.headerStacked]}>
        <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>Last 7 days</Text>
        <Pressable
          testID="home-view-stats"
          accessibilityRole="button"
          accessibilityLabel="View activity stats"
          onPress={onViewActivity}
          style={({ pressed }) => [styles.statsButton, pressed && styles.pressed]}
        >
          <Text style={[styles.statsButtonText, { color: accent }]}>View stats</Text>
          <ArrowUpRight size={17} color={accent} accessible={false} />
        </Pressable>
      </View>

      <View style={[styles.week, largeText && styles.weekWrapped]}>
        {days.map(({ date, key, count }) => {
          const completed = count > 0;
          const isToday = key === todayKey;
          const dayLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
          return (
            <View
              key={key}
              testID={`home-activity-${key}`}
              accessible
              accessibilityLabel={`${dayLabel}, ${count} workout${count === 1 ? '' : 's'}${isToday ? ', today' : ''}`}
              style={[
                styles.day,
                largeText && { flexBasis: fontScale > 1.8 ? '33.333%' : '25%', flexGrow: 0 },
              ]}
            >
              <Text style={[styles.weekday, { color: isToday ? accent : palette.mutedText }]}>
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </Text>
              <View style={[
                styles.dayCircle,
                {
                  width: circleSize,
                  height: circleSize,
                  backgroundColor: completed ? palette.primary : palette.card,
                  borderColor: isToday ? accent : 'transparent',
                  borderWidth: isToday ? 1.5 : 0,
                },
              ]}>
                {completed ? (
                  <Check size={17} strokeWidth={2.4} color={palette.primaryText} accessible={false} />
                ) : (
                  <Text style={[styles.dayNumber, { color: isToday ? accent : palette.mutedText }]}>{date.getDate()}</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <View style={[styles.metrics, largeText && styles.metricsStacked]}>
        {metrics.map((metric, index) => (
          <View
            key={metric.label}
            style={[
              styles.metric,
              !largeText && index > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: palette.border },
              largeText && styles.metricRow,
            ]}
          >
            <Text style={[styles.metricValue, compact && styles.metricValueCompact, { color: palette.text }]}>{formatCount(metric.value)}</Text>
            <Text style={[styles.metricLabel, { color: palette.mutedText }]}>{metric.label}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.volume, { color: palette.mutedText }]}>{formatCount(weeklyVolume)} kg lifted</Text>
    </View>
  );
}

export function HomeLevelProgress({ level, xp, nextLevelXp, progressPercent }: HomeLevelProgressProps) {
  const palette = useThemeColors();
  const { width, fontScale } = useWindowDimensions();
  const largeText = fontScale > 1.2;
  const compact = width < 360;
  const accent = palette.accent;
  const progress = Math.min(100, Math.max(0, Number.isFinite(progressPercent) ? progressPercent : 0));
  const remaining = Math.max(0, nextLevelXp - xp);

  return (
    <View testID="home-level-progress" style={[styles.levelCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={[styles.levelRow, largeText && styles.levelRowStacked]}>
        <View style={[styles.levelBadge, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.levelBadgeText, { color: accent }]}>Level {level}</Text>
        </View>
        <View style={styles.levelDetail}>
          <View style={[styles.levelInfo, (compact || largeText) && styles.levelInfoStacked]}>
            <Text style={[styles.xpText, { color: palette.text }]}>{formatCount(xp)} XP</Text>
            <Text style={[styles.remainingText, { color: palette.mutedText }]}>{formatCount(remaining)} XP to level {level + 1}</Text>
          </View>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel={`Progress to level ${level + 1}`}
            accessibilityValue={{ min: 0, max: 100, now: Math.round(progress), text: `${formatCount(remaining)} XP remaining` }}
            style={[styles.track, { backgroundColor: palette.border }]}
          >
            <View style={[styles.fill, { backgroundColor: accent, width: `${progress}%` }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, borderWidth: 1, padding: spacing.base },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: -spacing.sm },
  headerStacked: { alignItems: 'flex-start', flexDirection: 'column', marginTop: 0 },
  title: { fontFamily: type.weight.semibold, fontSize: 18, lineHeight: 25, flexShrink: 1 },
  statsButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingLeft: spacing.sm },
  statsButtonText: { fontFamily: type.weight.semibold, fontSize: type.size.xs, lineHeight: 18 },
  pressed: { opacity: 0.7 },
  week: { flexDirection: 'row', marginTop: spacing.xs },
  weekWrapped: { flexWrap: 'wrap', rowGap: spacing.md },
  day: { flex: 1, alignItems: 'center', gap: spacing.sm },
  weekday: { fontFamily: type.weight.medium, fontSize: 11, lineHeight: 16 },
  dayCircle: { borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  dayNumber: { fontFamily: type.weight.medium, fontSize: type.size.xs, lineHeight: 17 },
  metrics: { flexDirection: 'row', marginTop: spacing.lg },
  metricsStacked: { flexDirection: 'column', gap: spacing.md },
  metric: { flex: 1, minWidth: 0, alignItems: 'center', paddingHorizontal: spacing.xs },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  metricValue: { fontFamily: type.weight.semibold, fontSize: 22, lineHeight: 28 },
  metricValueCompact: { fontSize: 20, lineHeight: 26 },
  metricLabel: { fontFamily: type.weight.regular, fontSize: type.size.xs, lineHeight: 18 },
  volume: { fontFamily: type.weight.regular, fontSize: type.size.xs, lineHeight: 18, textAlign: 'center', marginTop: spacing.md },
  levelCard: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.base },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  levelRowStacked: { flexDirection: 'column', alignItems: 'stretch' },
  levelBadge: { paddingHorizontal: spacing.md, minHeight: 38, paddingVertical: spacing.sm, borderRadius: radii.md, borderWidth: 1, justifyContent: 'center', alignSelf: 'flex-start' },
  levelBadgeText: { fontFamily: type.weight.semibold, fontSize: type.size.sm, lineHeight: 20 },
  levelDetail: { flex: 1, gap: spacing.md, minWidth: 0 },
  levelInfo: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', columnGap: spacing.sm, rowGap: spacing.xs },
  levelInfoStacked: { flexDirection: 'column', alignItems: 'flex-start' },
  xpText: { fontFamily: type.weight.semibold, fontSize: type.size.sm, lineHeight: 20 },
  remainingText: { fontFamily: type.weight.regular, fontSize: type.size.xs, lineHeight: 18 },
  track: { height: 4, borderRadius: radii.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill },
});
