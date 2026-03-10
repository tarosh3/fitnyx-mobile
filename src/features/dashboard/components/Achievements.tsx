import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Flame, Medal, Trophy, Zap } from 'lucide-react-native';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';

const NEON_LIME = '#5fc793';

const ACHIEVEMENTS = [
    { id: '1', title: 'First Step', status: 'UNLOCKED', icon: Medal, color: '#60A5FA', unlocked: true },
    { id: '2', title: '3 Day Streak', status: 'LOCKED', icon: Flame, color: 'rgba(255,255,255,0.2)', unlocked: false },
    { id: '3', title: 'Week Warrior', status: 'LOCKED', icon: Trophy, color: 'rgba(255,255,255,0.2)', unlocked: false },
    { id: '4', title: 'Level 5', status: 'LOCKED', icon: Zap, color: 'rgba(255,255,255,0.2)', unlocked: false },
];

export function Achievements() {
    const router = useRouter();
    const palette = useThemeColors();
    const styles = getStyles(palette);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.sectionTitle}>ACHIEVEMENTS</Text>
                <Pressable onPress={() => router.push('/achievements')}>
                    <Text style={styles.viewAll}>View All</Text>
                </Pressable>
            </View>

            <FlatList
                data={ACHIEVEMENTS}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <BlurView intensity={10} tint="light" style={styles.card}>
                        <View style={[styles.iconCircle, { backgroundColor: item.unlocked ? `${item.color}20` : palette.surface, borderWidth: item.unlocked ? 0 : 1, borderColor: palette.border }]}>
                            <item.icon color={item.unlocked ? item.color : palette.mutedText} size={24} />
                        </View>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <Text style={styles.cardStatus}>{item.status}</Text>
                    </BlurView>
                )}
            />
        </View>
    );
}

const getStyles = (palette: any) => StyleSheet.create({
    container: {
        marginBottom: 32,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '900',
        color: palette.mutedText,
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    viewAll: {
        fontSize: 12,
        fontWeight: '900',
        color: NEON_LIME,
    },
    listContent: {
        paddingRight: 24,
        gap: 12,
    },
    card: {
        width: 110,
        height: 140,
        borderRadius: 20,
        padding: 16,
        backgroundColor: palette.card,
        borderWidth: 1,
        borderColor: palette.border,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        color: palette.text,
        fontSize: 11,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 4,
    },
    cardStatus: {
        color: palette.mutedText,
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
});
