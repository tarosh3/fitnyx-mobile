import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Activity, Ruler } from 'lucide-react-native';
import React from 'react';
import { DimensionValue, Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';

const NEON_LIME = '#5fc793';

interface DashboardStatsProps {
    weight?: number | null;
    bmi?: number | null;
    height?: number | null;
}

// BMI bar fill: maps BMI to a 0-100% range (15 = 0%, 40 = 100%)
function bmiToPercent(bmi: number): number {
    return Math.max(0, Math.min(100, ((bmi - 15) / 25) * 100));
}

export function DashboardStats({ weight, bmi, height }: DashboardStatsProps) {
    const router = useRouter();
    const palette = useThemeColors();
    const styles = React.useMemo(() => getStyles(palette), [palette]);

    const handlePress = () => {
        router.push('/dashboard/stats');
    };

    const weightDisplay = weight != null ? `${weight.toFixed(1)} ` : '-- ';
    const bmiDisplay = bmi != null ? bmi.toFixed(1) : '--';
    const heightDisplay = height != null ? `${height.toFixed(1)} ` : '-- ';
    const bmiPercent: DimensionValue = bmi != null ? `${bmiToPercent(bmi)}%` as DimensionValue : '0%';

    return (
        <View style={styles.container}>
            <View style={styles.row}>
                <Pressable onPress={handlePress} style={styles.flex1}>
                    <BlurView intensity={10} tint="light" style={styles.statCardHalf}>
                        <View style={styles.cardContent}>
                            <Text style={styles.label}>WEIGHT</Text>
                            <Text style={styles.value}>{weightDisplay}<Text style={styles.unit}>kg</Text></Text>
                            <Text style={styles.subtext}>Last Recorded</Text>
                        </View>
                        <View style={styles.bgIconContainer}>
                            <Activity color={palette.text} size={60} style={styles.bgIcon} />
                        </View>
                    </BlurView>
                </Pressable>

                <Pressable onPress={handlePress} style={styles.flex1}>
                    <BlurView intensity={10} tint="light" style={styles.statCardHalf}>
                        <View style={styles.cardContent}>
                            <Text style={styles.label}>BMI</Text>
                            <Text style={styles.value}>{bmiDisplay}</Text>
                            <Text style={styles.subtext}>Score</Text>
                            <View style={styles.bmiTrack}>
                                <View style={[styles.bmiFill, { width: bmiPercent }]} />
                            </View>
                        </View>
                    </BlurView>
                </Pressable>
            </View>

            <Pressable onPress={handlePress}>
                <BlurView intensity={10} tint="light" style={styles.statCardFull}>
                    <View style={styles.cardContent}>
                        <Text style={styles.label}>HEIGHT</Text>
                        <View style={styles.heightRow}>
                            <Text style={styles.value}>{heightDisplay}<Text style={styles.unit}>cm</Text></Text>
                        </View>
                        <Text style={styles.subtext}>Current</Text>
                    </View>
                    <View style={styles.rightIconContainer}>
                        <Ruler color={NEON_LIME} size={24} />
                    </View>
                    <View style={styles.bgIconContainerFull}>
                        <Ruler color={palette.text} size={80} style={styles.bgIcon} />
                    </View>
                </BlurView>
            </Pressable>
        </View>
    );
}

const getStyles = (palette: any) => StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    flex1: {
        flex: 1,
    },
    statCardHalf: {
        height: 140,
        borderRadius: 24,
        padding: 20,
        backgroundColor: palette.card,
        borderWidth: 1,
        borderColor: palette.border,
        overflow: 'hidden',
        justifyContent: 'space-between',
    },
    statCardFull: {
        height: 100,
        borderRadius: 24,
        padding: 20,
        backgroundColor: palette.card,
        borderWidth: 1,
        borderColor: palette.border,
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cardContent: {
        justifyContent: 'center',
    },
    label: {
        fontSize: 10,
        fontWeight: '900',
        color: palette.mutedText,
        letterSpacing: 1,
        marginBottom: 8,
    },
    value: {
        fontSize: 32,
        fontWeight: '900',
        color: palette.text,
        letterSpacing: -1,
    },
    unit: {
        fontSize: 14,
        color: NEON_LIME,
        fontWeight: '900',
    },
    subtext: {
        fontSize: 10,
        color: palette.mutedText,
        marginTop: 4,
        fontWeight: '600',
    },
    bmiTrack: {
        height: 2,
        backgroundColor: palette.border,
        borderRadius: 1,
        marginTop: 12,
        width: '100%',
    },
    bmiFill: {
        height: '100%',
        backgroundColor: NEON_LIME,
        borderRadius: 1,
    },
    heightRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    rightIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(128, 242, 13, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bgIconContainer: {
        position: 'absolute',
        right: -10,
        top: -10,
        opacity: 0.05,
    },
    bgIconContainerFull: {
        position: 'absolute',
        right: 40,
        top: -10,
        opacity: 0.05,
    },
    bgIcon: {
        transform: [{ scale: 1.5 }],
    },
});
