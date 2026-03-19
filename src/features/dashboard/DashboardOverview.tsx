import { useRouter } from 'expo-router';
import {
  Activity,
  ChevronRight,
  Dumbbell,
  Flame,
  History,
  ListChecks,
  Salad,
  Sparkles,
  User,
} from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/src/components/ui/Card';
import { useQuery } from '@tanstack/react-query';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { fetchLatestMetric } from '@/src/lib/api';
import { useAICoach } from '@/src/providers/AICoachProvider';

interface DashboardOverviewProps {
  user: any;
}

function computeBmi(weightKg?: number | null, heightCm?: number | null): string {
  if (!weightKg || !heightCm) return '--';
  const meters = heightCm / 100;
  if (meters <= 0) return '--';
  return (weightKg / (meters * meters)).toFixed(1);
}

const QUICK_ACTIONS = [
  { label: 'Diet & Nutrition', href: '/dashboard/diet', icon: Salad },
  { label: 'Workout List', href: '/dashboard/exercises', icon: Activity },
  { label: 'Customize Workout', href: '/workouts/customize', icon: Dumbbell },
  { label: 'Select Workout', href: '/workouts/select', icon: ListChecks },
  { label: 'Workout History', href: '/workouts/history', icon: History },
  { label: 'Body Stats', href: '/dashboard/stats', icon: User },
  { label: 'Settings', href: '/settings', icon: ChevronRight },
] as const;

export function DashboardOverview({ user }: DashboardOverviewProps) {
  const router = useRouter();
  const palette = useThemeColors();
  const styles = React.useMemo(() => getStyles(palette), [palette]);
  const { openCenteredChat } = useAICoach();

  const { data: latestMetric, isError: metricError } = useQuery({
    queryKey: ['userMetrics', user?.id],
    queryFn: fetchLatestMetric,
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const userName = (user?.user_metadata?.username || user?.email?.split('@')[0] || 'ATHLETE').toUpperCase();

  const stats = useMemo(
    () => [
      {
        label: 'WEIGHT',
        value: latestMetric?.weight_kg != null ? `${latestMetric.weight_kg.toFixed(1)} kg` : '--',
        sub: 'Last Recorded',
        icon: Activity,
        iconColor: palette.primary,
        iconBg: `${palette.primary}22`,
      },
      {
        label: 'BMI',
        value: computeBmi(latestMetric?.weight_kg, latestMetric?.height_cm),
        sub: 'Score',
        icon: Flame,
        iconColor: palette.mutedText,
        iconBg: `${palette.mutedText}18`,
      },
      {
        label: 'HEIGHT',
        value: latestMetric?.height_cm != null ? `${latestMetric.height_cm.toFixed(1)} cm` : '--',
        sub: 'Current',
        icon: User,
        iconColor: palette.text,
        iconBg: `${palette.text}16`,
      },
    ],
    [latestMetric?.height_cm, latestMetric?.weight_kg, palette.mutedText, palette.primary, palette.text]
  );

  return (
    <View style={styles.container}>
      <GridBackground />

      <View style={styles.headerWrap}>
        <Text style={[styles.overview, { color: palette.primary }]}>OVERVIEW</Text>
        <Text style={[styles.title, { color: palette.text }]}>WELCOME BACK,{'\n'}{userName}</Text>
      </View>

      {metricError ? (
        <View style={styles.stateWrap}>
          <Text style={[styles.stateText, { color: palette.mutedText }]}>COULD NOT LOAD METRICS</Text>
        </View>
      ) : !latestMetric && user ? (
        <View style={styles.stateWrap}>
          <Text style={[styles.stateText, { color: palette.mutedText }]}>NO BODY STATS YET</Text>
          <Text style={[styles.stateSub, { color: palette.mutedText }]}>Add your first metric in Body Stats</Text>
        </View>
      ) : (
        <View style={styles.statsGrid}>
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.label}
                style={[
                  styles.statCard,
                  index === 2 && styles.fullWidthCard,
                  {
                    backgroundColor: `${palette.background}EA`,
                    borderColor: `${palette.border}CC`,
                  },
                ]}
              >
                <View style={styles.statHead}>
                  <View style={[styles.iconBadge, { backgroundColor: stat.iconBg }]}>
                    <Icon color={stat.iconColor} size={16} />
                  </View>
                  <Text style={[styles.statLabel, { color: palette.mutedText }]}>{stat.label}</Text>
                </View>

                <Text style={[styles.statValue, { color: palette.text }]}>{stat.value}</Text>
                <Text style={[styles.statSub, { color: palette.mutedText }]}>{stat.sub}</Text>
              </Card>
            );
          })}
        </View>
      )}

      <Card
        style={[
          styles.quickActionsCard,
          {
            backgroundColor: `${palette.background}EA`,
            borderColor: `${palette.border}CC`,
          },
        ]}
      >
        <Text style={[styles.quickActionsTitle, { color: palette.mutedText }]}>QUICK ACTIONS</Text>

        <View style={styles.actionsGrid}>
          <Pressable
            onPress={openCenteredChat}
            style={({ pressed }) => [
              styles.actionTile,
              {
                backgroundColor: `${palette.background}CC`,
                borderColor: `${palette.border}CC`,
              },
              pressed && styles.pressed,
            ]}
          >
            <Sparkles color="#FACC15" size={24} />
            <Text style={[styles.actionLabel, { color: '#FACC15' }]}>Ask AI Coach</Text>
          </Pressable>

          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Pressable
                key={action.label}
                onPress={() => router.push(action.href as never)}
                style={({ pressed }) => [
                  styles.actionTile,
                  {
                    backgroundColor: `${palette.background}CC`,
                    borderColor: `${palette.border}CC`,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <Icon color={palette.mutedText} size={24} />
                <Text style={[styles.actionLabel, { color: palette.text }]}>{action.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.tipCard, { backgroundColor: `${palette.primary}18`, borderColor: `${palette.primary}40` }]}>
          <View style={styles.tipContent}>
            <Text style={[styles.tipTitle, { color: palette.primary }]}>PRO TIP</Text>
            <Text style={[styles.tipText, { color: palette.mutedText }]}>Consistency is key. Track weekly.</Text>
          </View>
          <ChevronRight color={palette.primary} size={18} />
        </View>
      </Card>
    </View>
  );
}

function GridBackground() {
  const lines = Array.from({ length: 18 });
  const palette = useThemeColors();
  const styles = React.useMemo(() => getStyles(palette), [palette]);

  return (
    <View pointerEvents="none" style={styles.gridLayer}>
      {lines.map((_, i) => (
        <View key={`h-${i}`} style={[styles.gridHorizontal, { top: i * 56 }]} />
      ))}
      {lines.map((_, i) => (
        <View key={`v-${i}`} style={[styles.gridVertical, { left: i * 56 }]} />
      ))}
    </View>
  );
}

const getStyles = (palette: any) => StyleSheet.create({
  container: {
    position: 'relative',
  },
  gridLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  gridHorizontal: {
    backgroundColor: palette.border,
    height: StyleSheet.hairlineWidth,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  gridVertical: {
    backgroundColor: palette.border,
    bottom: 0,
    position: 'absolute',
    top: 0,
    width: StyleSheet.hairlineWidth,
  },
  headerWrap: {
    marginBottom: 20,
    marginTop: 2,
  },
  overview: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 8,
  },
  title: {
    fontFamily: 'Anton_400Regular',
    fontSize: 34,
    letterSpacing: 0.5,
    lineHeight: 36,
  },
  stateWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  stateText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  stateSub: {
    fontSize: 12,
    marginTop: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    borderRadius: 0,
    borderWidth: 1,
    flexBasis: '48.5%',
    minHeight: 132,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  fullWidthCard: {
    flexBasis: '100%',
  },
  statHead: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  iconBadge: {
    alignItems: 'center',
    borderRadius: 999,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  statValue: {
    fontFamily: 'Anton_400Regular',
    fontSize: 24,
    lineHeight: 28,
    marginBottom: 4,
  },
  statSub: {
    fontSize: 12,
  },
  quickActionsCard: {
    borderRadius: 0,
    borderWidth: 1,
    paddingBottom: 16,
    paddingTop: 14,
  },
  quickActionsTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 14,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionTile: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flexBasis: '48.5%',
    gap: 10,
    justifyContent: 'center',
    minHeight: 112,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  tipCard: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  tipContent: {
    gap: 4,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  tipText: {
    fontSize: 14,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
