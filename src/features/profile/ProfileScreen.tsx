import { useRouter } from 'expo-router';
import { ArrowUpRight, ChevronRight, Dumbbell, Footprints, Settings2, Target, Trophy } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { bottomNavClearance } from '@/src/components/navigation/bottomNavLayout';
import { ArenaButton } from '@/src/features/arena/ui/ArenaButton';
import { FriendsButton } from '@/src/features/friends/ui/FriendsButton';
import { useFitnessProfile, useProgressSummary } from '@/src/features/progress/data';
import { badgesFor, effortName, formatClock, formatKg } from '@/src/features/progress/records';
import { useRoamActivities } from '@/src/features/roam/useRoamActivities';
import { useRetentionMetrics } from '@/src/hooks/useRetentionMetrics';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useAuth } from '@/src/providers/AuthProvider';
import { useWorkoutOverlayInset } from '@/src/providers/WorkoutOverlayProvider';
import { radii, spacing, type } from '@/src/styles/tokens';
import { ProfileHero } from './ProfileHero';
import { ProfileMilestones } from './ProfileMilestones';
import { profileArtwork } from './profileArtwork';
import { RecentActivity, recentItems } from './RecentActivity';

const humanize = (value?: string | null) => value ? value.replace(/_/g, ' ').replace(/^\w/, (m) => m.toUpperCase()) : null;
const compactNumber = (value: number) => value.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 });

/** Identity, milestones and training preferences, with useful activity underneath. */
export function ProfileScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const workoutInset = useWorkoutOverlayInset();
  const { user, userProfile, avatarUrl } = useAuth();
  const metrics = useRetentionMetrics(user?.id);
  const summaryQuery = useProgressSummary(user?.id);
  const { data: summary } = summaryQuery;
  const fitness = useFitnessProfile(user?.id);
  const roams = useRoamActivities(user?.id);
  const [refreshing, setRefreshing] = useState(false);
  const spacious = width >= 700;
  const wideText = fontScale > 1.3;

  const refresh = async () => {
    setRefreshing(true);
    try { await Promise.allSettled([metrics.refresh(), summaryQuery.refetch(), roams.refresh()]); }
    finally { setRefreshing(false); }
  };
  const name = [userProfile?.first_name, userProfile?.last_name].filter(Boolean).join(' ') || userProfile?.username || 'Athlete';
  const badges = summary ? badgesFor(summary) : [];
  const fiveK = summary?.records.efforts.find((effort) => effort.km === 5);
  const bests = [
    ...(summary?.records.lifts.slice(0, fiveK ? 2 : 3).map((lift) => ({ key: lift.exercise_uuid, label: lift.name, value: formatKg(lift.e1rm_kg), unit: 'kg · est. 1RM', roam: false })) ?? []),
    ...(fiveK ? [{ key: '5k', label: effortName(5), value: formatClock(fiveK.sec), unit: 'best time', roam: true }] : []),
  ];
  const life = summary?.lifetime;
  const stats = [
    { label: 'Workouts', value: life?.workouts },
    { label: 'Roams', value: life?.roams },
    { label: 'km moved', value: life ? Math.round(life.distance_m / 100) / 10 : undefined },
    { label: 'tonnes lifted', value: life ? Math.round(life.volume_kg / 100) / 10 : undefined },
  ];
  const feed = recentItems(metrics.sessions, roams.data?.data ?? [], 4);
  const activityLoading = metrics.loading || roams.loading;
  const activityFailed = metrics.error || !!roams.error;
  const failed = summaryQuery.failed || activityFailed;
  const trainingMeta = [humanize(fitness?.experience_level), humanize(fitness?.workout_location)].filter(Boolean).join(' · ');

  return (
    <ScrollView testID="profile-scroll" style={{ backgroundColor: c.background }} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.accent} colors={[c.accent]} />}
      contentContainerStyle={{ paddingTop: insets.top + spacing.sm, paddingBottom: bottomNavClearance(insets.bottom) + spacing.xl + workoutInset,
        paddingLeft: Math.max(insets.left, spacing.lg), paddingRight: Math.max(insets.right, spacing.lg) }}>
      <View style={styles.content}>
        <View style={styles.top}>
          <Text style={[styles.pageTitle, { color: c.text }]}>Profile</Text>
          <Pressable testID="open-settings" onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Settings"
            style={({ pressed }) => [styles.settings, { backgroundColor: pressed ? c.border : c.surface, borderColor: c.border }]}>
            <Settings2 size={20} color={c.text} strokeWidth={1.7} />
          </Pressable>
        </View>

        <ProfileHero name={name} username={userProfile?.username} bio={userProfile?.bio} avatarUrl={avatarUrl}
          onEdit={() => router.push('/profile')} loading={metrics.loading}
          level={!metrics.loading && !metrics.error ? { level: metrics.level, xp: metrics.xp, nextLevelXp: metrics.nextLevelXp, progress: metrics.levelProgress } : undefined} />

        <View style={[styles.stats, { borderColor: c.border }]}>
          {stats.map((stat, index) => <View key={stat.label} accessible
            accessibilityLabel={`${stat.label}: ${stat.value === undefined ? 'unavailable' : stat.value.toLocaleString()}`}
            style={[styles.stat, wideText && { flexBasis: '45%' }, index > 0 && !wideText && { borderLeftWidth: StyleSheet.hairlineWidth, borderColor: c.border }]}>
            <Text testID={`profile-stat-${index}`} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}
              style={[styles.statValue, { color: c.text }, width < 360 && { fontSize: 18, lineHeight: 25 }]}>{stat.value === undefined ? '—' : compactNumber(stat.value)}</Text>
            <Text style={[styles.statLabel, { color: c.mutedText }]}>{stat.label}</Text>
          </View>)}
        </View>

        <View style={[styles.social, wideText && { flexDirection: 'column' }]}><FriendsButton compact={width < 360 || wideText} /><ArenaButton /></View>

        {failed ? <View style={[styles.status, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text accessibilityLiveRegion="polite" style={[styles.body, styles.flex, { color: c.mutedText }]}>Some progress is unavailable right now.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Retry loading profile progress" disabled={refreshing} onPress={() => void refresh()} style={styles.retry}>
            <Text style={[styles.link, { color: c.accent }]}>{refreshing ? 'Retrying…' : 'Retry'}</Text>
          </Pressable>
        </View> : null}

        <View style={[styles.featureGrid, spacious && { flexDirection: 'row' }]}>
          <View style={[styles.featureColumn, spacious && { flex: 1 }]}>
            {badges.length ? <ProfileMilestones badges={badges} onOpen={() => router.push('/trophies?tab=badges' as never)} />
              : summaryQuery.loading ? <View style={[styles.loadingCard, { backgroundColor: c.card }]}><ActivityIndicator size="small" color={c.accent} /><Text style={[styles.body, { color: c.mutedText }]}>Loading your milestones…</Text></View> : null}
          </View>
          <View style={[styles.featureColumn, spacious && { flex: 1 }]}>
            <Pressable testID="open-fitness-profile" accessibilityRole="button" accessibilityLabel="Edit fitness profile" onPress={() => router.push('/fitness-profile')}
              style={({ pressed }) => [styles.training, { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.7 : 1 }]}>
              <View style={styles.trainingHeading}><Target size={19} color={c.accent} strokeWidth={1.7} /><Text style={[styles.eyebrow, styles.flex, { color: c.mutedText }]}>TRAINING FOCUS</Text><ArrowUpRight size={18} color={c.mutedText} /></View>
              <View style={styles.trainingBody}>
                <View style={[styles.flex, styles.trainingCopy]}>
                  <Text style={[styles.goal, { color: c.text }]}>{humanize(fitness?.primary_goal) || 'Your goals. Your pace.'}</Text>
                  <Text style={[styles.body, { color: c.mutedText }]}>{trainingMeta || 'View your goals and training preferences.'}</Text>
                </View>
                {!wideText ? <Image source={profileArtwork.training} resizeMode="contain" accessible={false}
                  style={[styles.trainingArt, (width < 360 || spacious) && styles.trainingArtSmall]} /> : null}
              </View>
              {fitness?.weekly_workout_target ? <View style={[styles.frequency, { borderColor: c.border }]}>
                <View style={styles.week} accessible={false}>{Array.from({ length: 7 }, (_, index) => <View key={index} style={[styles.weekDay, { backgroundColor: index < Math.min(7, fitness.weekly_workout_target!) ? c.accent : c.border }]} />)}</View>
                <Text style={[styles.frequencyText, { color: c.text }]}>{fitness.weekly_workout_target} days / week</Text>
              </View> : null}
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeading title="Personal bests" action="All records" onPress={() => router.push('/trophies' as never)} />
          {bests.length ? <View style={[styles.records, { borderColor: c.border, backgroundColor: c.surface }]}>
            {bests.map((best, index) => <Pressable key={best.key} accessibilityRole="button" accessibilityLabel={`${best.label}, ${best.value} ${best.unit}. View records.`}
              onPress={() => router.push('/trophies' as never)} style={({ pressed }) => [styles.record, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.border }, { opacity: pressed ? 0.65 : 1 }]}>
              {best.roam ? <Footprints size={19} color={c.mutedText} /> : <Dumbbell size={19} color={c.mutedText} />}
              <Text style={[styles.recordName, { color: c.text }]}>{best.label}</Text>
              <View style={styles.recordValue}><Text style={[styles.recordNumber, { color: c.text }]}>{best.value}</Text><Text style={[styles.statLabel, { color: c.mutedText }]}>{best.unit}</Text></View>
            </Pressable>)}
          </View> : <View style={[styles.empty, { borderColor: c.border }]}>
            <Trophy size={22} color={c.mutedText} /><Text style={[styles.body, styles.flex, { color: c.mutedText }]}>{summaryQuery.loading ? 'Loading your records…' : summaryQuery.failed ? 'Your records will appear when progress reconnects.' : 'Your first personal best is ahead of you. Keep showing up.'}</Text>
          </View>}
        </View>

        <View style={styles.section}>
          <SectionHeading title="Recent activity" />
          {feed.length ? <RecentActivity items={feed} /> : <View style={[styles.empty, { borderColor: c.border }]}>
            <Dumbbell size={22} color={c.mutedText} /><View style={styles.flex}>
              <Text style={[styles.body, { color: c.mutedText }]}>{activityLoading ? 'Loading recent activity…' : activityFailed ? 'Recent activity is unavailable right now.' : 'This is where your story takes shape. Finish a workout or save a Roam to get started.'}</Text>
              {!activityLoading && !activityFailed ? <Pressable accessibilityRole="button" onPress={() => router.push('/workouts')} style={styles.start}><Text style={[styles.link, { color: c.accent }]}>Explore workouts</Text><ChevronRight size={16} color={c.accent} /></Pressable> : null}
            </View>
          </View>}
        </View>
      </View>
    </ScrollView>
  );
}

function SectionHeading({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  const c = useThemeColors();
  return <View style={styles.sectionHeading}>
    <Text accessibilityRole="header" style={[styles.sectionTitle, { color: c.text }]}>{title}</Text>
    {action && onPress ? <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={action} style={styles.sectionAction}><Text style={[styles.link, { color: c.mutedText }]}>{action}</Text><ArrowUpRight size={15} color={c.mutedText} /></Pressable> : null}
  </View>;
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', gap: spacing.lg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.sm },
  pageTitle: { fontFamily: type.weight.bold, fontSize: 20, letterSpacing: -0.4 },
  settings: { width: 44, height: 44, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: spacing.base, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, rowGap: spacing.base },
  stat: { flex: 1, minWidth: 0, alignItems: 'center', paddingHorizontal: spacing.xs, gap: spacing.xs },
  statValue: { fontFamily: type.weight.bold, fontSize: 23, lineHeight: 29, letterSpacing: -0.7, fontVariant: ['tabular-nums'] },
  statLabel: { fontFamily: type.weight.regular, fontSize: 10, lineHeight: 15, textAlign: 'center' },
  social: { flexDirection: 'row', gap: spacing.sm },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.md },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  link: { fontFamily: type.weight.semibold, fontSize: 12 },
  body: { fontFamily: type.weight.regular, fontSize: 13, lineHeight: 20 },
  featureGrid: { gap: spacing.base },
  featureColumn: { minWidth: 0 },
  loadingCard: { padding: spacing.xl, borderRadius: radii.xl, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  training: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.xl, padding: spacing.base, gap: spacing.sm },
  trainingHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  trainingBody: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  trainingCopy: { gap: spacing.sm },
  trainingArt: { width: 104, height: 78 },
  trainingArtSmall: { width: 80, height: 60 },
  eyebrow: { fontFamily: type.weight.bold, fontSize: 10, lineHeight: 16, letterSpacing: 1.1 },
  goal: { fontFamily: type.weight.bold, fontSize: 21, lineHeight: 27, letterSpacing: -0.5 },
  frequency: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.sm, paddingTop: spacing.md },
  week: { flexDirection: 'row', gap: 4 },
  weekDay: { width: 14, height: 5, borderRadius: 3 },
  frequencyText: { fontFamily: type.weight.medium, fontSize: 12 },
  section: { gap: spacing.sm },
  sectionHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, minHeight: 44 },
  sectionTitle: { fontFamily: type.weight.bold, fontSize: 18, letterSpacing: -0.4 },
  sectionAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  records: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.lg, paddingHorizontal: spacing.base },
  record: { minHeight: 70, paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  recordName: { flex: 1, minWidth: 0, fontFamily: type.weight.medium, fontSize: 13, lineHeight: 20 },
  recordValue: { alignItems: 'flex-end', flexShrink: 1 },
  recordNumber: { fontFamily: type.weight.bold, fontSize: 21, lineHeight: 26, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  empty: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.lg, padding: spacing.base, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  start: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 44, alignSelf: 'flex-start' },
});
