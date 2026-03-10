import { useRouter } from 'expo-router';
import { Flame } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';

const NEON_LIME = '#5fc793';
const PALE_ORANGE = '#FF9500';

interface ProfileHeaderProps {
    userName: string;
    avatarUrl?: string | null;
    variant?: 'home' | 'dashboard';
    streakDays?: number;
}

export function ProfileHeader({ userName, avatarUrl, variant = 'home', streakDays = 0 }: ProfileHeaderProps) {
    const router = useRouter();
    const palette = useThemeColors();
    const styles = getStyles(palette);

    if (variant === 'dashboard') {
        return (
            <View style={styles.dashboardHeader}>
                <View style={styles.overviewBadge}>
                    <Text style={styles.overviewText}>OVERVIEW</Text>
                </View>
                <View style={styles.headerRow}>
                    <Text style={styles.welcomeTitle}>
                        WELCOME BACK,{"\n"}
                        <Text style={{ color: NEON_LIME }}>{userName}</Text>
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.homeHeader}>
            <View style={styles.headerRow}>
                <View>
                    <View style={styles.streakBadge}>
                        <Flame color={PALE_ORANGE} size={12} fill={PALE_ORANGE} />
                        <Text style={styles.streakText}>{streakDays} DAY STREAK</Text>
                    </View>
                    <Text style={styles.homeGreeting}>
                        GOOD EVENING,{"\n"}
                        {userName}.
                    </Text>
                    <Text style={styles.homeSub}>
                        You have <Text style={{ fontWeight: '900', color: palette.text }}>not yet started</Text> with 7-Day Hypertrophy Split. 6 exercises waiting for you.
                    </Text>
                </View>
                <Pressable onPress={() => router.push('/profile')} style={styles.avatarContainer}>
                    {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
                    ) : (
                        <View style={[styles.avatarFallback, { backgroundColor: palette.surface }]} />
                    )}
                </Pressable>
            </View>
        </View>
    );
}

const getStyles = (palette: any) => StyleSheet.create({
    homeHeader: {
        marginBottom: 32,
        paddingTop: 12,
    },
    dashboardHeader: {
        marginBottom: 32,
        paddingTop: 48,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255, 149, 0, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 149, 149, 0.2)',
        marginBottom: 16,
        alignSelf: 'flex-start',
    },
    streakText: {
        fontSize: 10,
        fontWeight: '900',
        color: PALE_ORANGE,
        letterSpacing: 1,
    },
    homeGreeting: {
        fontSize: 36,
        fontWeight: '900',
        color: palette.text,
        letterSpacing: -1,
        lineHeight: 38,
        textTransform: 'uppercase',
        fontStyle: 'italic',
    },
    homeSub: {
        fontSize: 14,
        color: palette.mutedText,
        marginTop: 8,
        fontWeight: '500',
    },
    overviewBadge: {
        backgroundColor: 'rgba(128, 242, 13, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(128, 242, 13, 0.2)',
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    overviewText: {
        fontSize: 10,
        fontWeight: '900',
        color: NEON_LIME,
        letterSpacing: 1.5,
    },
    welcomeTitle: {
        fontSize: 40,
        fontWeight: '900',
        color: palette.text,
        letterSpacing: -1.5,
        lineHeight: 42,
        textTransform: 'uppercase',
        fontStyle: 'italic',
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: palette.border,
        padding: 2,
    },
    avatarImg: {
        width: '100%',
        height: '100%',
        borderRadius: 25,
    },
    avatarFallback: {
        width: '100%',
        height: '100%',
        borderRadius: 25,
    },
});
