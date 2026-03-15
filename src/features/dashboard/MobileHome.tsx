import { useActivityData } from '@/src/hooks/useActivityData';
import { useRetentionMetrics } from '@/src/hooks/useRetentionMetrics';
import { useAICoach } from '@/src/providers/AICoachProvider';
import { BlurView } from 'expo-blur';
import { Sparkles } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Achievements } from './components/Achievements';
import { ActiveMissionCard } from './components/ActiveMissionCard';
import { ActivityHeatmap } from './components/ActivityHeatmap';
import { LevelProgress } from './components/LevelProgress';
import { PerformanceStats } from './components/PerformanceStats';
import { ProfileHeader } from './components/ProfileHeader';

import { useThemeColors } from '@/src/hooks/useThemeColors';

const NEON_LIME = '#5fc793';

interface MobileHomeProps {
    user: any;
    avatarUrl?: string | null;
}

export function MobileHome({ user, avatarUrl }: MobileHomeProps) {
    const { openCenteredChat } = useAICoach();
    const metrics = useRetentionMetrics(user?.id);
    const activity = useActivityData(metrics.sessions);
    const palette = useThemeColors();
    const styles = getStyles(palette);

    const userName = (user?.user_metadata?.first_name || user?.user_metadata?.username || 'Athlete');

    if (metrics.loading) {
        return (
            <View style={[styles.loadingWrap, { backgroundColor: palette.background }]}>
                <ActivityIndicator size="large" color={NEON_LIME} />
            </View>
        );
    }

    return (
        <ScrollView style={[styles.container, { backgroundColor: palette.background }]} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
                <ProfileHeader
                    userName={userName}
                    avatarUrl={avatarUrl}
                    variant="home"
                    streakDays={metrics.streakDays}
                    activePlanName={metrics.activePlan?.title ?? null}
                    nextExercisesCount={metrics.nextExercisesCount}
                    hasActiveSession={!!metrics.activeSession}
                />

                <LevelProgress
                    level={metrics.level}
                    xp={metrics.xp}
                    nextLevelXp={metrics.nextLevelXp}
                    progressPercent={metrics.levelProgress}
                />

                <ActiveMissionCard
                    activePlan={metrics.activePlan}
                    activeSession={metrics.activeSession}
                    currentDay={metrics.currentDay}
                />

                {/* AI Coach Insight */}
                <View style={styles.section}>
                    <Pressable onPress={openCenteredChat}>
                        <BlurView intensity={10} tint="light" style={styles.aiCard}>
                            <View style={styles.aiIconRow}>
                                <View style={styles.aiIconContainer}>
                                    <Sparkles color="#60A5FA" size={20} fill="#60A5FA" />
                                </View>
                                <View style={styles.aiHeaderContent}>
                                    <View style={styles.aiTitleRow}>
                                        <Text style={styles.aiTitle}>AI COACH INSIGHT</Text>
                                        <View style={styles.aiPulseDot} />
                                    </View>
                                    <Text style={styles.aiText} numberOfLines={1}>
                                        "{metrics.dailyInsight || "Analysing your recent performance..."}"
                                    </Text>
                                </View>
                                <Sparkles color="rgba(255,255,255,0.05)" size={48} style={styles.aiBgIcon} />
                            </View>
                        </BlurView>
                    </Pressable>
                </View>

                <PerformanceStats
                    weeklyWorkouts={metrics.weeklyWorkouts}
                    weeklyVolume={metrics.weeklyVolume}
                    weeklyBurned={0}
                />

                <ActivityHeatmap
                    streakDays={metrics.streakDays}
                    maxStreak={activity.maxStreak}
                    totalActiveDays={activity.totalActiveDays}
                    activityDays={activity.days}
                />

                <Achievements />

                <View style={{ height: 120 }} />
            </View>
        </ScrollView>
    );
}

const getStyles = (palette: any) => StyleSheet.create({
    loadingWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    container: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 0,
        paddingTop: 12,
    },
    section: {
        marginBottom: 32,
    },
    aiCard: {
        borderRadius: 20,
        overflow: 'hidden',
        padding: 20,
        backgroundColor: palette.card,
        borderWidth: 1,
        borderColor: palette.border,
    },
    aiIconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        position: 'relative',
    },
    aiIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(96, 165, 250, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    aiHeaderContent: {
        flex: 1,
    },
    aiTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    aiTitle: {
        fontSize: 10,
        fontWeight: '900',
        color: palette.mutedText,
        letterSpacing: 1.5,
    },
    aiPulseDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#60A5FA',
    },
    aiText: {
        fontSize: 13,
        color: palette.text,
        fontWeight: '500',
        opacity: 0.9,
    },
    aiBgIcon: {
        position: 'absolute',
        right: -10,
        top: -10,
        opacity: 0.1,
    }
});
