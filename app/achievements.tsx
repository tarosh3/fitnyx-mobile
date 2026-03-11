import { PageHeader } from '@/src/components/ui/PageHeader';
import { Screen } from '@/src/components/ui/Screen';
import { BlurView } from 'expo-blur';
import { Flame, Medal, Trophy, Zap } from 'lucide-react-native';
import React from 'react';
import { Dimensions, FlatList, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 44) / 2; // Account for 16px side padding + 12px gap

const ACHIEVEMENTS = [
    { id: '1', title: 'First Step', desc: 'Complete your first workout', status: 'UNLOCKED', icon: Medal, color: '#60A5FA', unlocked: true },
    { id: '2', title: '3 Day Streak', desc: 'Workout for 3 days in a row', status: 'LOCKED', icon: Flame, color: '#F87171', unlocked: false },
    { id: '3', title: 'Week Warrior', desc: 'Complete 5 workouts in one week', status: 'LOCKED', icon: Trophy, color: '#FBBF24', unlocked: false },
    { id: '4', title: 'Level 5', desc: 'Reach experience level 5', status: 'LOCKED', icon: Zap, color: '#A78BFA', unlocked: false },
    { id: '5', title: 'Early Bird', desc: 'Complete a workout before 8 AM', status: 'LOCKED', icon: Medal, color: '#2DD4BF', unlocked: false },
    { id: '6', title: 'Monthly Pro', desc: 'Complete 20 workouts in a month', status: 'LOCKED', icon: Medal, color: '#F472B6', unlocked: false },
];

export default function AchievementsScreen() {
    const palette = useThemeColors();
    const styles = React.useMemo(() => getStyles(palette), [palette]);
    return (
        <Screen scroll={false} contentContainerStyle={styles.screenContent}>
            <PageHeader title="Achievements" subtitle="Track your fitness milestones" backTo="/" />

            <FlatList
                data={ACHIEVEMENTS}
                numColumns={2}
                keyExtractor={(item) => item.id}
                columnWrapperStyle={styles.row}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <BlurView intensity={10} tint="light" style={styles.card}>
                        <View style={[styles.iconCircle, { backgroundColor: item.unlocked ? `${item.color}20` : palette.surface }]}>
                            <item.icon color={item.unlocked ? item.color : palette.mutedText} size={32} />
                        </View>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <Text style={styles.cardDesc} numberOfLines={2}>{item.desc}</Text>
                        <Text style={[styles.cardStatus, item.unlocked && { color: '#5fc793' }]}>{item.status}</Text>
                    </BlurView>
                )}
            />
        </Screen>
    );
}

const getStyles = (palette: any) => StyleSheet.create({
    screenContent: {
        flex: 1,
    },
    list: {
        paddingTop: 12,
        paddingBottom: 40,
    },
    row: {
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    card: {
        width: COLUMN_WIDTH,
        height: 180,
        borderRadius: 24,
        padding: 20,
        backgroundColor: palette.card,
        borderWidth: 1,
        borderColor: palette.border,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        color: palette.text,
        fontSize: 14,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 4,
    },
    cardDesc: {
        color: palette.mutedText,
        fontSize: 10,
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 12,
    },
    cardStatus: {
        fontSize: 10,
        fontWeight: '900',
        color: palette.mutedText,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
});
