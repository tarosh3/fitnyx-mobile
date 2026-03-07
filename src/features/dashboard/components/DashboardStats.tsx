import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Activity, Ruler } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const NEON_LIME = '#80f20d';

interface DashboardStatsProps {
    weight?: number;
    bmi?: number;
    height?: number;
}

export function DashboardStats({ weight = 79.0, bmi = 24.4, height = 180.0 }: DashboardStatsProps) {
    const router = useRouter();

    const handlePress = () => {
        router.push('/dashboard/stats');
    };

    return (
        <View style={styles.container}>
            <View style={styles.row}>
                <Pressable onPress={handlePress} style={styles.flex1}>
                    <BlurView intensity={10} tint="light" style={styles.statCardHalf}>
                        <View style={styles.cardContent}>
                            <Text style={styles.label}>WEIGHT</Text>
                            <Text style={styles.value}>{weight.toFixed(1)} <Text style={styles.unit}>kg</Text></Text>
                            <Text style={styles.subtext}>Last Recorded</Text>
                        </View>
                        <View style={styles.bgIconContainer}>
                            <Activity color="white" size={60} style={styles.bgIcon} />
                        </View>
                    </BlurView>
                </Pressable>

                <Pressable onPress={handlePress} style={styles.flex1}>
                    <BlurView intensity={10} tint="light" style={styles.statCardHalf}>
                        <View style={styles.cardContent}>
                            <Text style={styles.label}>BMI</Text>
                            <Text style={styles.value}>{bmi.toFixed(1)}</Text>
                            <Text style={styles.subtext}>Score</Text>
                            <View style={styles.bmiTrack}>
                                <View style={[styles.bmiFill, { width: '75%' }]} />
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
                            <Text style={styles.value}>{height.toFixed(1)} <Text style={styles.unit}>cm</Text></Text>
                        </View>
                        <Text style={styles.subtext}>Current</Text>
                    </View>
                    <View style={styles.rightIconContainer}>
                        <Ruler color={NEON_LIME} size={24} />
                    </View>
                    <View style={styles.bgIconContainerFull}>
                        <Ruler color="white" size={80} style={styles.bgIcon} />
                    </View>
                </BlurView>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
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
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        overflow: 'hidden',
        justifyContent: 'space-between',
    },
    statCardFull: {
        height: 100,
        borderRadius: 24,
        padding: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
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
        color: 'rgba(255, 255, 255, 0.4)',
        letterSpacing: 1,
        marginBottom: 8,
    },
    value: {
        fontSize: 32,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -1,
    },
    unit: {
        fontSize: 14,
        color: NEON_LIME,
        fontWeight: '900',
    },
    subtext: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.3)',
        marginTop: 4,
        fontWeight: '600',
    },
    bmiTrack: {
        height: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
