import type { User } from '@supabase/supabase-js';
import { bottomNavClearance } from '@/src/components/navigation/bottomNavLayout';
import { useRouter } from 'expo-router';
import { ArrowDown, ArrowRight, ChevronDown, Droplets, Flame, Route, Salad, Sparkles } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const { width, fontScale } = useWindowDimensions();
  const metrics = useRetentionMetrics(user.id);
  const activity = useActivityData(metrics.sessions);
  const recentTraining = getRecentTraining(metrics.sessions);
  const [refreshing, setRefreshing] = useState(false);
  const [insight, setInsight] = useState('');
  const [insightOpen, setInsightOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const styles = useMemo(() => getStyles(palette), [palette]);
  const compact = width < 360 || fontScale > 1.2;
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

  const shortcuts = [
    { title: 'Roam', subtitle: 'Run, walk, ride', icon: Route, route: '/roam', id: 'home-roam' },
    { title: 'Nutrition', subtitle: 'Your daily fuel', icon: Salad, route: '/diet', id: 'home-nutrition' },
    { title: 'Water', subtitle: 'Stay hydrated', icon: Droplets, route: '/water', id: 'home-water' },
  ] as const;

  return (
    <ScrollView
      testID="home-scroll"
      style={styles.screen}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: insets.top + spacing.base, paddingBottom: bottomNavClearance(insets.bottom) + spacing['2xl'] + workoutInset, paddingLeft: Math.max(insets.left, spacing.xl), paddingRight: Math.max(insets.right, spacing.xl) },
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
            <Text accessibilityRole="header" style={styles.name} numberOfLines={2}>{userName}.</Text>
          </View>
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
          <Text style={styles.sectionTitle}>Your focus today</Text>
          {!metrics.loading && !metrics.error && (
            <View style={styles.streak} accessibilityLabel={`${metrics.streakDays} day workout streak`}>
              <Flame size={15} color={styles.accent.color} />
              <Text style={styles.streakText}>{metrics.streakDays > 0 ? `${metrics.streakDays}-day streak` : 'A fresh start'}</Text>
            </View>
          )}
        </View>

        {metrics.loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={palette.primary} />
            <Text style={styles.stateTitle}>Getting your day ready</Text>
            <Text style={styles.secondaryText}>Your workout and recent progress will appear here.</Text>
          </View>
        ) : metrics.error ? (
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

        <PlanTodayCard />

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Keep the day moving</Text>
          </View>
          <View style={[styles.shortcuts, compact && styles.shortcutsCompact]}>
            {shortcuts.map(({ title, subtitle, icon: Icon, route, id }) => (
              <Pressable
                key={id}
                testID={id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${title}: ${subtitle}`}
                onPress={() => router.push(route)}
                style={({ pressed }) => [styles.shortcut, compact && styles.shortcutCompact, pressed && styles.pressed]}
              >
                <Icon size={23} strokeWidth={1.7} color={styles.accent.color} />
                <View style={styles.shortcutCopy}>
                  <Text style={styles.shortcutTitle}>{title}</Text>
                  <Text style={styles.shortcutSubtitle}>{subtitle}</Text>
                </View>
                {compact && <ArrowRight size={18} color={palette.mutedText} />}
              </Pressable>
            ))}
          </View>
        </View>

        {!metrics.loading && !metrics.error && (
          <View style={styles.section}>
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

        <View style={[styles.section, styles.coachCard]}>
          <View style={styles.coachHeader}>
            <View style={styles.coachTitleRow}>
              <Sparkles size={19} strokeWidth={1.7} color={styles.accent.color} />
              <Text style={styles.coachEyebrow}>FROM YOUR COACH</Text>
            </View>
            <Text style={styles.coachName}>Filo</Text>
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
            <ChevronDown size={16} color={palette.mutedText} style={insightOpen ? styles.chevronOpen : undefined} />
          </Pressable>
          <Pressable testID="home-coach" accessibilityRole="button" accessibilityLabel="Talk to Filo, your AI coach" onPress={openCenteredChat} style={({ pressed }) => [styles.coachAction, pressed && styles.pressed]}>
            <Text style={styles.actionText}>Talk to Filo</Text><ArrowRight size={18} color={styles.accent.color} />
          </Pressable>
        </View>

        {!metrics.loading && !metrics.error && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Small steps. Real progress.</Text></View>
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
      </View>
    </ScrollView>
  );
}

const getStyles = (palette: ReturnType<typeof useThemeColors>) => {
  const accent = palette.accent;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    scrollContent: { flexGrow: 1 },
    content: { width: '100%', maxWidth: 600, alignSelf: 'center' },
    accent: { color: accent },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.base, marginBottom: spacing['2xl'] },
    greetingBlock: { flex: 1 },
    date: { fontFamily: type.weight.medium, fontSize: 12, lineHeight: 18, color: palette.mutedText, marginBottom: spacing.md },
    greeting: { fontFamily: type.weight.regular, fontSize: 17, lineHeight: 25, color: palette.mutedText },
    name: { fontFamily: type.weight.bold, fontSize: 32, lineHeight: 40, letterSpacing: -1, color: palette.text },
    avatar: { width: 54, height: 54, borderRadius: radii.pill, overflow: 'hidden', backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center', borderColor: palette.border, borderWidth: 1 },
    avatarImage: { width: '100%', height: '100%' },
    avatarInitial: { color: accent, fontFamily: type.weight.bold, fontSize: 23 },
    todayRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.md },
    sectionTitle: { fontFamily: type.weight.semibold, fontSize: 17, lineHeight: 25, letterSpacing: -0.3, color: palette.text },
    streak: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    streakText: { fontFamily: type.weight.medium, fontSize: 11, lineHeight: 18, color: accent },
    section: { marginTop: spacing['2xl'] },
    sectionHeading: { marginBottom: spacing.md },
    shortcuts: { flexDirection: 'row', gap: spacing.sm },
    shortcutsCompact: { flexDirection: 'column' },
    shortcut: { flex: 1, backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1, borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.base, minHeight: 116, gap: spacing.md },
    shortcutCompact: { flexDirection: 'row', alignItems: 'center', minHeight: 76, gap: spacing.base, paddingHorizontal: spacing.base },
    shortcutCopy: { flex: 1, gap: spacing.xs },
    shortcutTitle: { fontFamily: type.weight.semibold, fontSize: 13, lineHeight: 19, color: palette.text },
    shortcutSubtitle: { fontFamily: type.weight.regular, fontSize: 10, lineHeight: 16, color: palette.mutedText },
    pressed: { opacity: 0.75 },
    coachCard: { backgroundColor: palette.accentSoft, borderRadius: radii.xl, padding: spacing.lg },
    coachHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    coachTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
    coachEyebrow: { color: accent, fontFamily: type.weight.semibold, fontSize: 10, lineHeight: 16, letterSpacing: 1.2 },
    coachName: { fontFamily: type.weight.semibold, fontSize: 14, color: palette.text },
    insightButton: { paddingTop: spacing.base, paddingBottom: spacing.sm, gap: spacing.sm, alignItems: 'flex-start', minHeight: 48 },
    insight: { fontFamily: type.weight.medium, fontSize: 16, lineHeight: 25, color: palette.text },
    coachAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48, alignSelf: 'flex-start' },
    actionText: { fontFamily: type.weight.semibold, fontSize: 14, lineHeight: 22, color: accent },
    chevronOpen: { transform: [{ rotate: '180deg' }] },
    historyButton: { marginTop: spacing.lg, paddingVertical: spacing.base, flexDirection: 'row', alignItems: 'center', gap: spacing.base, borderTopWidth: 1, borderTopColor: palette.border },
    historyCopy: { flex: 1, gap: spacing.xs },
    historyTitle: { fontFamily: type.weight.semibold, fontSize: 15, lineHeight: 23, color: palette.text },
    history: { paddingTop: spacing.base },
    historyNote: { fontFamily: type.weight.regular, fontSize: 11, color: palette.mutedText, lineHeight: 18 },
    secondaryText: { fontFamily: type.weight.regular, fontSize: 13, lineHeight: 21, color: palette.mutedText },
    stateCard: { minHeight: 230, borderRadius: radii['2xl'], backgroundColor: palette.surface, padding: spacing.xl, justifyContent: 'center', gap: spacing.md },
    stateTitle: { fontFamily: type.weight.semibold, fontSize: 20, lineHeight: 28, color: palette.text },
    retryButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start' },
  });
};
