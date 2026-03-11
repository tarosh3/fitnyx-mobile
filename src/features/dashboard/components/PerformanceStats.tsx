import { Dumbbell, Flame, TrendingDown, TrendingUp } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';

const NEON_LIME = '#5fc793';

interface PerformanceStatsProps {
    weeklyWorkouts: number;
    weeklyVolume: number;
    weeklyBurned?: number;
}

export function PerformanceStats({ weeklyWorkouts, weeklyVolume, weeklyBurned = 0 }: PerformanceStatsProps) {
    const palette = useThemeColors();
    const styles = getStyles(palette);
    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>THIS WEEK'S PERFORMANCE</Text>
            <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                    <View style={styles.cardHeader}>
                        <Dumbbell color={NEON_LIME} size={14} />
                        <TrendingUp color={NEON_LIME} size={10} />
                    </View>
                    <View style={styles.statContent}>
                        <Text style={styles.statValue}>{weeklyWorkouts}</Text>
                        <Text style={[styles.statLabel, { marginTop: 4 }]}>WORKOUTS</Text>
                        <Text style={styles.trendPercent}>+0%</Text>
                    </View>
                </View>

                <View style={styles.statCard}>
                    <View style={styles.cardHeader}>
                        <TrendingUp color={NEON_LIME} size={14} />
                        <TrendingUp color={NEON_LIME} size={10} />
                    </View>
                    <View style={styles.statContent}>
                        <Text style={styles.statValue}>
                            {(weeklyVolume / 1000).toFixed(1)}
                            <Text style={styles.statUnit}> tons</Text>
                        </Text>
                        <Text style={[styles.statLabel, { marginTop: 4 }]}>VOLUME</Text>
                        <Text style={styles.trendPercent}>+0%</Text>
                    </View>
                </View>

                <View style={styles.statCard}>
                    <View style={styles.cardHeader}>
                        <Flame color="#FF453A" size={14} />
                        <TrendingDown color="#FF453A" size={10} />
                    </View>
                    <View style={styles.statContent}>
                        <Text style={styles.statValue}>
                            {weeklyBurned}
                            <Text style={styles.statUnit}> kcal</Text>
                        </Text>
                        <Text style={[styles.statLabel, { marginTop: 4 }]}>BURNED</Text>
                        <Text style={styles.trendPercentRed}>-0%</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const getStyles = (palette: any) => StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '900',
        color: palette.mutedText,
        letterSpacing: 2,
        marginBottom: 16,
        textTransform: 'uppercase',
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    statCard: {
        flex: 1,
        aspectRatio: 1,
        borderRadius: 16,
        backgroundColor: palette.card,
        padding: 12,
        borderWidth: 1,
        borderColor: palette.border,
        justifyContent: 'space-between',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statContent: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    statLabel: {
        fontSize: 9,
        fontWeight: '900',
        color: palette.mutedText,
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    statValue: {
        fontSize: 22,
        fontWeight: '900',
        color: palette.text,
        fontStyle: 'italic',
    },
    statUnit: {
        fontSize: 10,
        fontWeight: '700',
        fontStyle: 'normal',
        color: palette.mutedText,
    },
    trendPercent: {
        fontSize: 8,
        fontWeight: '900',
        color: NEON_LIME,
        marginTop: 2,
    },
    trendPercentRed: {
        fontSize: 8,
        fontWeight: '900',
        color: '#FF453A',
        marginTop: 2,
    },
});
