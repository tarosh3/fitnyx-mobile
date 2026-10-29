import type { User } from '@supabase/supabase-js';
import { bottomNavClearance } from '@/src/components/navigation/bottomNavLayout';
import { useRouter } from 'expo-router';
import { ArrowDown, ArrowRight, ChevronDown, Flame } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArenaHomeCard } from '@/src/features/arena/ui/ArenaHomeCard';
import { TodayGoalsCard } from '@/src/features/goals/ui/TodayGoalsCard';
import { NotificationBell } from '@/src/features/notifications/ui/NotificationBell';
import { useActivityData } from '@/src/hooks/useActivityData';
import { useRetentionMetrics } from '@/src/hooks/useRetentionMetrics';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { getDailyInsight } from '@/src/lib/api/agent';
import type { UserProfile } from '@/src/lib/api/users';
import { localDateKey } from '@/src/lib/api/workoutSessions';
import { cacheGet, cacheKeys, cacheSet, cacheTTL } from '@/src/lib/cache';
import { useAICoach } from '@/src/providers/AICoachProvider';
import { useWorkoutOverlayInset } from '@/src/providers/WorkoutOverlayProvider';
import { radii, spacing, type } from '@/src/styles/tokens';
import { ContentSkeleton } from '@/src/components/ui/ContentSkeleton';
import { MilestoneNotice } from '@/src/components/ui/MilestoneNotice';
import { ScreenEdgeFade } from '@/src/components/ui/ScreenEdgeFade';
import { Entrance, StreakPulse } from '@/src/components/ui/Motion';
import { FiloMark } from '@/src/components/ai/FiloMark';
import { HomeShortcuts } from './components/HomeShortcuts';
import { ActiveMissionCard } from './components/ActiveMissionCard';
import { ActivityHeatmap } from './components/ActivityHeatmap';
import { HomeLevelProgress, HomeWeekSummary } from './components/HomeProgress';
import { PlanTodayCard } from './components/PlanTodayCard';
import { getRecentTraining } from './homeActivity';

interface MobileHomeProps {
  user: User;
  avatarUrl?: string | null;
  userProfile?: UserProfile | null;
}

const FALLBACK_INSIGHT = 'Make room for a little movement today. Small, consistent steps add up.';

export function MobileHome({ user, avatarUrl, userProfile }: MobileHomeProps) {
  const workoutInset = useWorkoutOverlayInset();
  const router = useRouter();
  const { openCenteredChat } = useAICoach();
  const palette = useThemeColors();
  const insets = useSafeAreaInsets();
  const metrics = useRetentionMetrics(user.id);
  const activity = useActivityData(metrics.sessions);
  const recentTraining = getRecentTraining(metrics.sessions);
  const [refreshing, setRefreshing] = useState(false);
  const [insight, setInsight] = useState('');
  const [insightOpen, setInsightOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const styles = useMemo(() => getStyles(palette), [palette]);
  const userName = userProfile?.first_name || userProfile?.username || user.user_metadata?.first_name || 'Athlete';
  const today = new Date();
  const hour = today.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  React.useEffect(() => setAvatarFailed(false), [avatarUrl]);

  // Dashboard text wins. Generate only when missing, and reuse the existing per-user/day cache.
  React.useEffect(() => {
    if (metrics.dailyInsight) { setInsight(metrics.dailyInsight); return; }
    if (metrics.loading) return;
    let cancelled = false;
    (async () => {
      try {
        const key = cacheKeys.dailyInsight(user.id, localDateKey(new Date()));
        const cached = await cacheGet<string>(key);
        if (cached) {
          if (!cancelled) setInsight(cached);
          return;
        }
        const result = await getDailyInsight();
        if (result?.insight) cacheSet(key, result.insight, cacheTTL.DAY).catch(() => undefined);
        if (!cancelled) setInsight(result?.insight || FALLBACK_INSIGHT);
      } catch {
        if (!cancelled) setInsight(FALLBACK_INSIGHT);
      }
    })();
    return () => { cancelled = true; };
  }, [metrics.dailyInsight, metrics.loading, user.id]);

  const refresh = async () => {
    setRefreshing(true);
    try { await metrics.refresh(); } finally { setRefreshing(false); }
  };

  const workoutSection = (
    <View>
      {metrics.loading && !metrics.activeSession ? (
        <ContentSkeleton testID="home-workout-loading" label="Getting your day ready" />
      ) : metrics.error && !metrics.activeSession ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Your progress is taking a moment</Text>
          <Text style={styles.secondaryText}>We couldn’t load your latest activity. Try again when you’re connected.</Text>
          <Pressable testID="home-retry" accessibilityRole="button" onPress={refresh} style={styles.retryButton}>
            <Text style={styles.actionText}>Try again</Text><ArrowRight size={18} color={styles.accent.color} />
          </Pressable>
        </View>
      ) : (
        <ActiveMissionCard
          activePlan={metrics.activePlan}
          activeSession={metrics.activeSession}
          currentDay={metrics.currentDay}
          nextExercisesCount={metrics.nextExercisesCount}
          currentDayIndex={metrics.currentDayIndex}
          totalDays={metrics.totalDays}
        />
      )}
    </View>
  );

  return (
    <View style={styles.screen}>
    <ScrollView
      testID="home-scroll"
      style={styles.screen}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: insets.top + spacing.base, paddingBottom: bottomNavClearance(insets.bottom) + spacing['2xl'] + workoutInset, paddingLeft: Math.max(insets.left, spacing.lg), paddingRight: Math.max(insets.right, spacing.lg) },
      ]}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="never"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.primary} colors={[palette.primary]} progressViewOffset={insets.top} />}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.greetingBlock}>
            <Text style={styles.date}>{dateLabel}</Text>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text accessibilityRole="header" style={styles.name} numberOfLines={2}>{userName}</Text>
          </View>
          <NotificationBell />
          <Pressable
            testID="home-profile"
            accessibilityRole="button"
            accessibilityLabel="Open your profile"
            // The profile is a tab: switch to it like the dock does (reset the stack, then replace),
            // so back doesn't walk through a pushed copy. /profile is the edit form.
            onPress={() => { if (router.canDismiss()) router.dismissAll(); router.replace('/me'); }}
            style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
          >
            {avatarUrl && !avatarFailed ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} onError={() => setAvatarFailed(true)} />
            ) : <Text style={styles.avatarInitial}>{String(userName).trim().charAt(0).toUpperCase() || 'A'}</Text>}
          </Pressable>
        </View>

        <View style={styles.todayRow}>
          <Text style={styles.sectionTitle}>Move. Eat. Feel good.</Text>
        </View>

        <MilestoneNotice storageKey={`milestone:level:${user.id}`} scope="level" value={metrics.level}
          ready={!metrics.loading && !metrics.error} message={`Level ${metrics.level} reached. Keep it going!`} />
        <Entrance style={styles.resumeSection}>{workoutSection}</Entrance>
        <Entrance delay={70}><HomeShortcuts><PlanTodayCard /></HomeShortcuts></Entrance>

        <View testID="home-today-section">
          <TodayGoalsCard />
        </View>

        <View testID="home-coach-section" style={styles.coachSection}>
          <View style={styles.coachHeader}>
            <View style={styles.coachTitleRow}>
              <FiloMark size={28} />
              <View style={styles.coachIdentity}><Text style={styles.coachName}>Filo’s daily insight</Text></View>
            </View>
          </View>
          <Pressable
            testID="home-insight"
            accessibilityRole="button"
            accessibilityLabel={`Coach insight. ${insight || FALLBACK_INSIGHT}`}
            accessibilityHint={`${insightOpen ? 'Collapse' : 'Expand'} the displayed advice.`}
            accessibilityState={{ expanded: insightOpen }}
            onPress={() => setInsightOpen((previous) => !previous)}
            style={styles.insightButton}
          >
            <Text style={styles.insight} numberOfLines={insightOpen ? undefined : 3}>{insight || FALLBACK_INSIGHT}</Text>
            <View style={styles.readMore}><Text style={styles.readMoreText}>{insightOpen ? 'Read less' : 'Read more'}</Text><ChevronDown size={14} color={palette.mutedText} style={insightOpen ? styles.chevronOpen : undefined} /></View>
          </Pressable>
          <Pressable testID="home-coach" accessibilityRole="button" accessibilityLabel="Talk to Filo, your AI coach" onPress={openCenteredChat} style={({ pressed }) => [styles.coachAction, pressed && styles.pressed]}>
            <Text style={styles.actionText}>Talk to Filo</Text><ArrowRight size={18} color={styles.accent.color} />
          </Pressable>
        </View>

        {!metrics.loading && !metrics.error && (
          <View testID="home-momentum-section" style={styles.momentumSection}>
            <HomeWeekSummary
              activityDays={activity.days}
              weeklyWorkouts={recentTraining.workouts}
              weeklyVolume={recentTraining.volume}
              weeklyDuration={recentTraining.durationMinutes}
              weeklyCalories={recentTraining.calories}
              onViewActivity={() => router.push('/dashboard')}
            />
          </View>
        )}

        {!metrics.loading && !metrics.error && (
          <>
            <View style={styles.section}>
              <View style={styles.todayRow}>
                <Text style={styles.consistencyLabel}>Your progress</Text>
                <View accessible style={styles.streak} accessibilityLabel={`${metrics.streakDays} day workout streak`}>
                  <StreakPulse active={metrics.streakDays > 0}><Flame size={17} color={styles.accent.color} /></StreakPulse>
                  <Text style={styles.streakText}>{metrics.streakDays > 0 ? `${metrics.streakDays}-day workout streak` : 'A fresh start'}</Text>
                </View>
              </View>
              <HomeLevelProgress level={metrics.level} xp={metrics.xp} nextLevelXp={metrics.nextLevelXp} progressPercent={metrics.levelProgress} />
            </View>
            <Pressable
              testID="home-history"
              accessibilityRole="button"
              accessibilityState={{ expanded: historyOpen }}
              accessibilityLabel={`${historyOpen ? 'Hide' : 'Show'} workout activity history`}
              onPress={() => setHistoryOpen((previous) => !previous)}
              style={styles.historyButton}
            >
              <View style={styles.historyCopy}>
                <Text style={styles.historyTitle}>Activity history</Text>
                <Text style={styles.secondaryText}>See the days you showed up</Text>
              </View>
              <ArrowDown size={20} color={palette.mutedText} style={historyOpen ? styles.chevronOpen : undefined} />
            </Pressable>
            {historyOpen && (
              <View style={styles.history}>
                <ActivityHeatmap streakDays={metrics.streakDays} totalWorkouts={activity.totalWorkouts} maxStreak={activity.maxStreak} totalActiveDays={activity.totalActiveDays} activityDays={activity.days} />
                <Text style={styles.historyNote}>Based on your most recent workout history.</Text>
              </View>
            )}
          </>
        )}
        <ArenaHomeCard />
      </View>
    </ScrollView>
    <ScreenEdgeFade edge="top" inset={insets.top} fade={12} />
    </View>
  );
}

const getStyles = (palette: ReturnType<typeof useThemeColors>) => {
  const accent = palette.accent;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    scrollContent: { flexGrow: 1 },
    content: { width: '100%', maxWidth: 600, alignSelf: 'center' },
    accent: { color: accent },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.base, marginBottom: spacing.xl },
    greetingBlock: { flex: 1 },
    date: { fontFamily: type.weight.medium, fontSize: type.size.xs, lineHeight: 18, letterSpacing: 0.3, color: palette.mutedText, marginBottom: spacing.xs },
    greeting: { fontFamily: type.weight.regular, fontSize: 12, lineHeight: 18, color: palette.mutedText },
    name: { fontFamily: type.weight.bold, fontSize: 24, lineHeight: 30, letterSpacing: -0.8, color: palette.text },
    avatar: { width: 44, height: 44, borderRadius: radii.pill, overflow: 'hidden', backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center', borderColor: palette.border, borderWidth: 1 },
    avatarImage: { width: '100%', height: '100%' },
    avatarInitial: { color: accent, fontFamily: type.weight.bold, fontSize: 23 },
    todayRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.md },
    sectionTitle: { fontFamily: type.weight.semibold, fontSize: 21, lineHeight: 28, letterSpacing: -0.7, color: palette.text },
    streak: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    streakText: { fontFamily: type.weight.medium, fontSize: type.size.xs, lineHeight: 18, color: accent },
    resumeSection: { marginBottom: spacing.base },
    momentumSection: { marginTop: spacing['2xl'], gap: spacing.md },
    consistencyLabel: { color: palette.mutedText, fontFamily: type.weight.medium, fontSize: 12, lineHeight: 18 },
    section: { marginTop: spacing.xl },
    pressed: { opacity: 0.75 },
    coachSection: { marginTop: spacing['2xl'], padding: spacing.lg, borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: palette.border, backgroundColor: palette.surface },
    coachHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    coachTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
    coachIdentity: { flex: 1, gap: 3 },
    coachName: { fontFamily: type.weight.semibold, fontSize: 13, color: palette.text },
    insightButton: { paddingTop: spacing.base, paddingBottom: spacing.sm, gap: spacing.sm, alignItems: 'flex-start', minHeight: 48 },
    insight: { fontFamily: type.weight.medium, fontSize: 18, lineHeight: 28, letterSpacing: -0.3, color: palette.text },
    coachAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, minHeight: 44, alignSelf: 'flex-start' },
    actionText: { fontFamily: type.weight.semibold, fontSize: 14, lineHeight: 22, color: accent },
    readMore: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 32 },
    readMoreText: { color: palette.mutedText, fontFamily: type.weight.medium, fontSize: type.size.xs },
    chevronOpen: { transform: [{ rotate: '180deg' }] },
    historyButton: { marginTop: spacing.lg, paddingVertical: spacing.base, flexDirection: 'row', alignItems: 'center', gap: spacing.base, borderTopWidth: 1, borderTopColor: palette.border },
    historyCopy: { flex: 1, gap: spacing.xs },
    historyTitle: { fontFamily: type.weight.semibold, fontSize: 15, lineHeight: 23, color: palette.text },
    history: { paddingTop: spacing.base },
    historyNote: { fontFamily: type.weight.regular, fontSize: 11, color: palette.mutedText, lineHeight: 18 },
    secondaryText: { fontFamily: type.weight.regular, fontSize: 13, lineHeight: 21, color: palette.mutedText },
    stateCard: { borderRadius: radii.lg, backgroundColor: palette.surface, padding: spacing.base, gap: spacing.sm },
    stateTitle: { fontFamily: type.weight.semibold, fontSize: 16, lineHeight: 22, color: palette.text },
    retryButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start' },
  });
};
