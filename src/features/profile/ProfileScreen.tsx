import { useRouter } from 'expo-router';
import { ChevronRight, Settings } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { bottomNavClearance } from '@/src/components/navigation/bottomNavLayout';
import { Card } from '@/src/components/ui/Card';
import { ArenaButton } from '@/src/features/arena/ui/ArenaButton';
import { FriendsButton } from '@/src/features/friends/ui/FriendsButton';
import { useFitnessProfile, useProgressSummary } from '@/src/features/progress/data';
import { badgesFor, effortName, formatClock, formatKg } from '@/src/features/progress/records';
import { BigNumber, CardTitle, Muted } from '@/src/features/progress/ui/bits';
import { Medal } from '@/src/features/progress/ui/Medal';
import { useRoamActivities } from '@/src/features/roam/useRoamActivities';
import { useRetentionMetrics } from '@/src/hooks/useRetentionMetrics';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useAuth } from '@/src/providers/AuthProvider';
import { useWorkoutOverlayInset } from '@/src/providers/WorkoutOverlayProvider';
import { radii, spacing, type } from '@/src/styles/tokens';
import { ProfileHero } from './ProfileHero';
import { RecentActivity, recentItems } from './RecentActivity';

const humanize = (v?: string | null) => (v ? v.replace(/_/g, ' ').replace(/^\w/, (m) => m.toUpperCase()) : null);

/** The profile tab: who you are, what you've done, and the way into Settings. */
export function ProfileScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const workoutInset = useWorkoutOverlayInset();
  const { user, userProfile, avatarUrl } = useAuth();
  const metrics = useRetentionMetrics(user?.id);
  const { data: summary } = useProgressSummary(user?.id);
  const fitness = useFitnessProfile(user?.id);
  const roams = useRoamActivities(user?.id);

  const name = [userProfile?.first_name, userProfile?.last_name].filter(Boolean).join(' ') || userProfile?.username || 'Athlete';
  const badges = summary ? badgesFor(summary) : [];
  const earned = badges.filter((b) => b.earned);
  const fiveK = summary?.records.efforts.find((e) => e.km === 5);
  const bests = [
    ...(summary?.records.lifts.slice(0, fiveK ? 2 : 3).map((l) => ({ key: l.exercise_uuid, label: l.name, value: formatKg(l.e1rm_kg), unit: 'kg · 1RM' })) ?? []),
    ...(fiveK ? [{ key: '5k', label: effortName(5).replace('Fastest ', ''), value: formatClock(fiveK.sec), unit: 'best' }] : []),
  ];
  const chips = [humanize(fitness?.primary_goal), humanize(fitness?.experience_level), humanize(fitness?.workout_location), fitness?.weekly_workout_target ? `${fitness.weekly_workout_target} days / week` : null].filter(Boolean) as string[];
  const life = summary?.lifetime;
  const feed = recentItems(metrics.sessions, roams.data?.data ?? []);

  return (
    <ScrollView style={{ backgroundColor: c.background }} showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.base, paddingBottom: bottomNavClearance(insets.bottom) + 32 + workoutInset }]}>
      <View style={styles.top}>
        <Text style={[styles.handle, { color: c.text }]} numberOfLines={1}>{userProfile?.username ? `@${userProfile.username}` : ''}</Text>
        <Pressable testID="open-settings" onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Settings"
          style={[styles.iconBtn, { backgroundColor: c.card }]}>
          <Settings size={21} color={c.text} strokeWidth={1.9} />
        </Pressable>
      </View>

      <ProfileHero name={name} bio={userProfile?.bio} avatarUrl={avatarUrl}
        level={{ level: metrics.level, xp: metrics.xp, nextLevelXp: metrics.nextLevelXp, progress: metrics.levelProgress }} />

      <View style={styles.lifetime}>
        {[[life?.workouts ?? 0, 'Workouts'], [life?.roams ?? 0, 'Roams'], [Math.round((life?.distance_m ?? 0) / 1000), 'km'], [Math.round((life?.volume_kg ?? 0) / 1000), 'tonnes']].map(([v, k]) => (
          <Card key={k} style={styles.lifeCard}><BigNumber value={Number(v).toLocaleString('en-US')} size={24} /><Muted style={styles.small}>{k}</Muted></Card>
        ))}
      </View>

      <View style={styles.actionsBlock}>
        <Pressable onPress={() => router.push('/profile')} accessibilityRole="button" style={[styles.edit, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.editText, { color: c.text }]}>Edit profile</Text>
        </Pressable>
        <View style={styles.actions}>
          <FriendsButton />
          <ArenaButton />
        </View>
      </View>

      {badges.length ? (
        <View style={styles.section}>
          <CardTitle title="Trophy case" right={`${earned.length} of ${badges.length}`} onRight={() => router.push('/trophies?tab=badges' as never)} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.badges}>
            {(earned.length ? earned : badges.slice(0, 4)).map((b) => (
              <Pressable key={b.id} onPress={() => router.push('/trophies?tab=badges' as never)} accessibilityRole="button" accessibilityLabel={`${b.name}${b.earned ? '' : ', not earned yet'}`} style={styles.badge}>
                <Medal mark={b.mark} earned={b.earned} size={68} />
                <Text style={[styles.badgeName, { color: c.text }]} numberOfLines={2}>{b.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {bests.length ? (
        <View style={styles.section}>
          <CardTitle title="Personal bests" right="All records" onRight={() => router.push('/trophies' as never)} />
          <View style={styles.bests}>
            {bests.map((b) => (
              <Card key={b.key} style={styles.best}>
                <Muted style={styles.small} >{b.label}</Muted>
                <BigNumber value={b.value} size={22} />
                <Muted style={styles.small}>{b.unit}</Muted>
              </Card>
            ))}
          </View>
        </View>
      ) : null}

      {chips.length ? (
        <Pressable onPress={() => router.push('/fitness-profile')} accessibilityRole="button" accessibilityLabel="Edit fitness profile">
          <Card style={styles.training}>
            <View style={styles.trainingHead}><Text style={[styles.trainingTitle, { color: c.text }]}>Training for</Text><ChevronRight size={18} color={c.mutedText} /></View>
            <View style={styles.chips}>
              {chips.map((t, i) => <Text key={t} style={[styles.chip, { backgroundColor: i === 0 ? c.accentSoft : c.surface, color: i === 0 ? c.accent : c.text }]}>{t}</Text>)}
            </View>
          </Card>
        </Pressable>
      ) : null}

      {feed.length ? (
        <View style={styles.section}>
          <CardTitle title="Recent activity" />
          <RecentActivity items={feed} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.base, gap: spacing.lg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  handle: { flex: 1, fontFamily: type.weight.bold, fontSize: 17 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  lifetime: { flexDirection: 'row', gap: spacing.sm },
  lifeCard: { flex: 1, alignItems: 'center', paddingHorizontal: 4, paddingVertical: spacing.md, gap: 6 },
  small: { fontSize: 11 },
  actionsBlock: { gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
  edit: { minHeight: 46, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  editText: { fontFamily: type.weight.bold, fontSize: 14 },
  section: { gap: spacing.md },
  bleed: { marginHorizontal: -spacing.base },
  badges: { gap: spacing.md, paddingHorizontal: spacing.base },
  badge: { width: 84, alignItems: 'center', gap: spacing.sm },
  badgeName: { fontFamily: type.weight.semibold, fontSize: 12, textAlign: 'center' },
  bests: { flexDirection: 'row', gap: spacing.sm },
  best: { flex: 1, gap: 8, padding: spacing.md },
  training: { gap: spacing.md },
  trainingHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trainingTitle: { fontFamily: type.weight.bold, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { fontFamily: type.weight.semibold, fontSize: 13, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.md, overflow: 'hidden' },
});
