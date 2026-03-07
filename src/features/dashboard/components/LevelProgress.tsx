import { BlurView } from 'expo-blur';
import { Zap } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const NEON_LIME = '#80f20d';

interface LevelProgressProps {
    level: number;
    xp: number;
    nextLevelXp: number;
    progressPercent: number;
}

export function LevelProgress({ level, xp, nextLevelXp, progressPercent }: LevelProgressProps) {
    return (
        <View style={styles.container}>
            <BlurView intensity={10} tint="light" style={styles.glassCard}>
                <View style={styles.cardHeader}>
                    <View style={styles.levelCircle}>
                        <Text style={styles.levelCircleLabel}>LEVEL</Text>
                        <Text style={styles.levelCircleValue}>{level}</Text>
                    </View>
                    <View style={styles.levelTextInfo}>
                        <View style={styles.xpRow}>
                            <Zap color={NEON_LIME} size={16} fill={NEON_LIME} />
                            <Text style={styles.xpValueText}>{xp} XP Earned</Text>
                        </View>
                        <Text style={styles.xpDescription}>
                            You're crushing it! Keep consistent to reach Elite status.
                        </Text>
                    </View>
                </View>

                <View style={styles.nextLevelRow}>
                    <Text style={styles.nextLevelLabel}>+{nextLevelXp - xp} XP <Text style={styles.nextLevelSub}>to Level {level + 1}</Text></Text>
                    <Text style={styles.percentageText}>{Math.round(progressPercent)}%</Text>
                </View>

                <View style={styles.trackContainer}>
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${Math.max(2, progressPercent)}%` }]} />
                    </View>
                </View>
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    glassCard: {
        borderRadius: 20,
        overflow: 'hidden',
        padding: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    levelCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(28, 28, 30, 0.5)',
    },
    levelCircleLabel: {
        fontSize: 8,
        fontWeight: '900',
        color: 'rgba(255, 255, 255, 0.4)',
        letterSpacing: 1,
    },
    levelCircleValue: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FFFFFF',
        lineHeight: 28,
    },
    levelTextInfo: {
        flex: 1,
        marginLeft: 16,
    },
    xpRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    xpValueText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    xpDescription: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.4)',
        lineHeight: 14,
        fontWeight: '500',
    },
    nextLevelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        marginTop: 16,
    },
    nextLevelLabel: {
        fontSize: 12,
        fontWeight: '900',
        color: NEON_LIME,
    },
    nextLevelSub: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontWeight: '700',
    },
    percentageText: {
        fontSize: 12,
        fontWeight: '900',
        color: NEON_LIME,
    },
    trackContainer: {
        marginTop: 8,
    },
    progressTrack: {
        height: 6,
        backgroundColor: '#1C1C1E',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: NEON_LIME,
        borderRadius: 3,
    },
});
