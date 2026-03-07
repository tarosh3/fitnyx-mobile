import { useThemeColors } from '@/src/hooks/useThemeColors';
import LottieView from 'lottie-react-native';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

export function DailyChallengeCard() {
    const palette = useThemeColors();

    return (
        <View style={[styles.container, { backgroundColor: palette.primary }]}>
            <View style={styles.contentWrap}>
                <Text style={[styles.title, { color: palette.primaryText }]}>Daily{'\n'}Challenge</Text>
                <Text style={[styles.subtitle, { color: `${palette.primaryText}B3` }]}>Do your plan before 09:00 AM</Text>

                {/* Avatars */}
                <View style={styles.avatarsRow}>
                    {[1, 2, 3].map((i) => (
                        <View key={i} style={[styles.avatarWrap, { borderColor: palette.primary }]}>
                            <Image
                                source={{ uri: `https://i.pravatar.cc/100?img=${i + 10}` }}
                                style={styles.avatarImage}
                            />
                        </View>
                    ))}
                    <View
                        style={[
                            styles.avatarWrap,
                            styles.extraAvatar,
                            { borderColor: palette.primary },
                        ]}
                    >
                        <Text style={[styles.extraText, { color: palette.primaryText }]}>+4</Text>
                    </View>
                </View>
            </View>

            {/* Yoga Animation */}
            <View style={styles.animationWrap} pointerEvents="none">
                <LottieView
                    source={require('@/assets/animations/yoga.json')}
                    autoPlay
                    loop
                    style={styles.animation}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 40,
        height: 180,
        marginBottom: 24,
        marginTop: 8,
        overflow: 'visible', // allow animation to overflow out of box
        position: 'relative',
        width: '100%',
    },
    contentWrap: {
        padding: 24,
        position: 'absolute',
        zIndex: 10,
    },
    title: {
        fontFamily: 'Anton_400Regular',
        fontSize: 30,
        lineHeight: 32,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 16,
    },
    avatarsRow: {
        alignItems: 'center',
        flexDirection: 'row',
        marginLeft: 0,
        marginTop: 8,
    },
    avatarWrap: {
        backgroundColor: '#D4D4D4',
        borderRadius: 999,
        borderWidth: 2,
        height: 32,
        marginLeft: -12, // overlapping effect (-space-x-3)
        overflow: 'hidden',
        width: 32,
    },
    avatarImage: {
        height: '100%',
        width: '100%',
    },
    extraAvatar: {
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)', // backdrop blur substitute
        justifyContent: 'center',
    },
    extraText: {
        fontSize: 10,
        fontWeight: '800',
    },
    animationWrap: {
        bottom: -24,
        height: 200,
        position: 'absolute',
        right: -16,
        width: 200,
        zIndex: 20,
    },
    animation: {
        height: '100%',
        transform: [{ scale: 1.1 }],
        width: '100%',
    },
});
