import { useAICoach } from '@/src/providers/AICoachProvider';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import {
    Activity,
    BrainCircuit,
    Dumbbell,
    History,
    ListChecks,
    Salad,
    Settings,
    User
} from 'lucide-react-native';
import React from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NEON_LIME = '#5fc793';
const PALE_ORANGE = '#FF9500';

export function QuickActionsGrid() {
    const router = useRouter();
    const { openCenteredChat } = useAICoach();
    const palette = useThemeColors();
    const styles = React.useMemo(() => getStyles(palette), [palette]);

    const actions = [
        { label: 'Ask AI Coach', icon: BrainCircuit, color: PALE_ORANGE, onPress: openCenteredChat, highlight: true },
        { label: 'Diet & Nutrition', icon: Salad, color: NEON_LIME, onPress: () => router.push('/dashboard/diet') },
        { label: 'Workout List', icon: Activity, color: NEON_LIME, onPress: () => router.push('/exercises') },
        { label: 'Customize Workout', icon: Dumbbell, color: NEON_LIME, onPress: () => router.push('/workouts/customize') },
        { label: 'Select Workout', icon: ListChecks, color: NEON_LIME, onPress: () => router.push('/workouts/select') },
        { label: 'Workout History', icon: History, color: NEON_LIME, onPress: () => router.push('/workouts/history') },
        { label: 'Body Stats', icon: User, color: NEON_LIME, onPress: () => router.push('/dashboard/stats') },
        { label: 'Settings', icon: Settings, color: NEON_LIME, onPress: () => router.push('/settings') },
    ];

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
            <View style={styles.grid}>
                {actions.map((action, index) => (
                    <Pressable
                        key={index}
                        onPress={action.onPress}
                        style={({ pressed }) => [
                            styles.cardContainer,
                            pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }
                        ]}
                    >
                        <BlurView
                            intensity={10}
                            tint="light"
                            style={[
                                styles.card,
                                action.highlight && styles.highlightedCard
                            ]}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: `${action.color}15` }]}>
                                <action.icon color={action.color} size={20} />
                            </View>
                            <Text style={styles.label}>{action.label}</Text>
                        </BlurView>
                    </Pressable>
                ))}
            </View>
        </View>
    );
}

const getStyles = (palette: any) => StyleSheet.create({
    section: {
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
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    cardContainer: {
        width: (SCREEN_WIDTH - 48 - 12) / 2, // 24*2 padding, 12 gap
    },
    card: {
        height: 110,
        borderRadius: 20,
        padding: 16,
        backgroundColor: palette.card,
        borderWidth: 1,
        borderColor: palette.border,
        justifyContent: 'center',
        alignItems: 'flex-start',
        gap: 12,
    },
    highlightedCard: {
        borderLeftWidth: 4,
        borderLeftColor: PALE_ORANGE,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: palette.text,
        lineHeight: 14,
    },
});
