import { useRouter } from 'expo-router';
import { Play } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const NEON_LIME = '#5fc793';
const BG_DARK = '#0A0A0A';

interface ActiveMissionCardProps {
    activePlan: any;
    activeSession: any;
    currentDay: any;
}

export function ActiveMissionCard({ activePlan, activeSession, currentDay }: ActiveMissionCardProps) {
    const router = useRouter();

    const handlePress = () => {
        if (activeSession?.id) router.push(`/workouts/session/${activeSession.id}`);
        else if (activePlan?.id) router.push(`/workouts/plans/${activePlan.id}`);
        else router.push('/workouts/select');
    };

    const title = activeSession ? 'RESUME TODAY\'S MISSION' : (activePlan ? 'START TODAY\'S MISSION' : 'START YOUR JOURNEY');
    const subtext = activeSession ? 'WORKOUT IN PROGRESS' : (activePlan ? (currentDay?.title || 'READY TO START') : 'SELECT A PLAN TO BEGIN');
    const timeText = activePlan ? '~45 min' : '';

    return (
        <View style={styles.section}>
            <Pressable
                style={({ pressed }) => [
                    styles.ctaCard,
                    { opacity: pressed ? 0.9 : 1 }
                ]}
                onPress={handlePress}
            >
                <View style={styles.content}>
                    <Text style={styles.ctaTitle}>{title}</Text>
                    <Text style={styles.ctaSub}>{subtext}</Text>
                    {timeText ? (
                        <View style={styles.timeBadge}>
                            <Text style={styles.timeText}>{timeText}</Text>
                        </View>
                    ) : null}
                </View>
                <Play color={BG_DARK} size={32} fill={BG_DARK} />

                {/* Subtle bubble pattern simulated with absolutely positioned decorative views if needed, 
                    but pure color with the big play icon is most important for the "exact" look */}
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        marginBottom: 24,
    },
    ctaCard: {
        backgroundColor: NEON_LIME,
        borderRadius: 24,
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        overflow: 'hidden',
    },
    content: {
        flex: 1,
        marginRight: 16,
    },
    ctaTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: BG_DARK,
        letterSpacing: -0.5,
        lineHeight: 26,
        textTransform: 'uppercase',
    },
    ctaSub: {
        fontSize: 14,
        fontWeight: '500',
        color: BG_DARK,
        marginTop: 4,
        opacity: 0.8,
    },
    timeBadge: {
        backgroundColor: 'rgba(0,0,0,0.08)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginTop: 12,
        alignSelf: 'flex-start',
    },
    timeText: {
        fontSize: 11,
        fontWeight: '700',
        color: BG_DARK,
        opacity: 0.6,
    },
});
